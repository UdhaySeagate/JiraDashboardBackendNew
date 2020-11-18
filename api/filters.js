/**
 * API file to handle all the Jira API  calls
 */
const JiraClient = require('jira-connector');
const dotenv = require('dotenv');
const { Logger } = require('../helpers/index');

dotenv.config();
const Jira = new JiraClient({
  host: process.env.JIRA_HOST,
  basic_auth: {
    email: process.env.JIRA_USERNAME,
    api_token: process.env.JIRA_PASSWORD
  }
});

const GetVersions = async opts => {
  try {
    Logger.log('info', 'Get versions for  board');
    const versionsList = await Jira.project.getVersions(opts);
    return versionsList;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetComponents = async opts => {
  try {
    const components = [];
    Logger.log('info', 'Get components for  board');
    const componentsList = await Jira.project.getComponents(opts);
    if (componentsList.length) {
      componentsList.forEach(component => {
        const obj = Object.assign({
          id: component.id,
          name: component.name
        });
        components.push(obj);
      });
    }
    return components;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetStoryPointsData = async (issuesList, opts) => {
  const endDate = opts.endDate;
  let planned = 0;
  let completed = 0;
  issuesList.issues.forEach(issue => {
    const storyPoints = issue.fields.customfield_11781;
    const resolutiondate = issue.fields.resolutiondate;
    if (storyPoints) planned += storyPoints;
    if (storyPoints && resolutiondate) {
      completed += storyPoints;
    }
  });
  const result = Object.assign({
    sprintId: opts.sprintId,
    sprintName: opts.sprintName,
    plannedCapacity: planned,
    completed,
    endDate,
    totalActive: opts.totalActive
  });
  return result;
};

const GetSprintsDetails = async opts => {
  try {
    opts.jql = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId} `;
    opts.jql += `AND Sprint in (closedSprints(), openSprints(), futureSprints()) AND Sprint = ${opts.sprintId}`;
    opts.fields = ['customfield_11781', 'resolutiondate'];
    opts.maxResults = 10000;
    Logger.log('info', 'Get active sprint capacity');
    const allIssuesWithWorklog = await Jira.board.getIssuesForBoard(opts);
    return await GetStoryPointsData(allIssuesWithWorklog, opts);
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetActiveSprintsDetails = async opts => {
  try {
    const sprintList = opts.sprints.split(',');
    const result = {
      activeSprint: []
    };
    for (let index = 0; index < sprintList.length; index += 1) {
      opts.sprintId = sprintList[index];
      /* eslint-disable no-await-in-loop */
      const activeSprint = await Jira.sprint.getSprint(opts);
      opts.endDate = activeSprint.endDate;
      opts.sprintName = activeSprint.name;
      const activeSprintDetails = await GetSprintsDetails(opts);
      /* eslint-enable no-await-in-loop */
      delete activeSprintDetails.totalActive;
      result.activeSprint.push(activeSprintDetails);
    }
    return await result;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetSprintsForPi = async opts => {
  try {
    const result = {};
    let sprintDetails = [];
    opts.jql = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId} AND Sprint in (closedSprints(), openSprints(), futureSprints())`;
    opts.boardId = opts.boardId;
    opts.fields = ['sprint', 'closedSprints'];
    opts.maxResults = 10000;
    Logger.log('info', 'Get sprints for  board');
    const sprintResponse = await Jira.board.getIssuesForBoard(opts);
    sprintResponse.issues.forEach(issue => {
      if (issue.fields && (issue.fields.sprint || issue.fields.closedSprints)) {
        if (issue.fields.sprint) sprintDetails.push(issue.fields.sprint);
        if (issue.fields.closedSprints) {
          issue.fields.closedSprints.forEach(closed => {
            sprintDetails.push(closed);
          });
        }
      }
    });
    sprintDetails = Array.from(new Set(sprintDetails.map(JSON.stringify))).map(JSON.parse);
    const activeSprint = [];
    const activeList = [];
    sprintDetails.forEach(sprint => {
      if (sprint.state === 'active') {
        let spName = sprint.name;
        spName = spName.toUpperCase();
        spName = spName.startsWith('EES_SPRINT');
        if (spName) {
          activeSprint.push({ id: sprint.id, name: sprint.name, endDate: sprint.endDate });
          activeList.push(sprint.id);
        }
      }
    });
    if (activeSprint.length) {
      opts.sprintId = activeSprint[0].id;
      opts.sprintName = activeSprint[0].name;
      opts.endDate = activeSprint[0].endDate;
      opts.totalActive = activeSprint.length;
      const activeSprintDetails = await GetSprintsDetails(opts);
      activeList.splice(0, 1);
      result.activeSprint = activeSprintDetails;
      result.activeSprint.activeList = activeList;
    }
    result.sprints = sprintDetails;
    return await result;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

module.exports = {
  GetVersions,
  GetComponents,
  GetSprintsForPi,
  GetActiveSprintsDetails
};
