/**
 * API file to handle all the Jira API calls
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

const GetStatisticData = async issuesList => {
  let overallEfforts = 0;
  const statistic = [];
  issuesList.issues.forEach(issue => {
    const storyPoints = issue.fields.customfield_11781;
    let resolutiondate = issue.fields.resolutiondate;
    if (storyPoints) overallEfforts += storyPoints;
    if (storyPoints && resolutiondate) {
      resolutiondate = resolutiondate.split('T')[0];
      const found = statistic.some(obj => obj.date === resolutiondate);
      if (!found) {
        const statObj = {};
        statObj.storypointsSpent = storyPoints;
        statObj.date = resolutiondate;
        statistic.push(statObj);
      } else {
        statistic.map(stat => {
          if (stat.date === resolutiondate) {
            stat.storypointsSpent += storyPoints;
          }
          return 'Done';
        });
      }
    }
  });
  const result = Object.assign({
    storyPoints: overallEfforts,
    statPoints: statistic
  });
  return result;
};

const GetVersion = async opts => {
  try {
    Logger.log('info', 'Get release version details');
    const version = await Jira.version.getVersion(opts);
    return version;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetStoryPointsBurndown = async opts => {
  try {
    const input = {};
    let query = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId}`;
    if (opts.sprints !== '') {
      query += ` AND Sprint in (closedSprints(), openSprints(), futureSprints()) AND Sprint in (${opts.sprints})`;
    }
    if (opts.components !== '') {
      query += ` AND component in (${opts.components})`;
    }
    input.jql = query;
    input.boardId = opts.boardId;
    input.fields = ['resolutiondate', 'customfield_11781'];
    input.maxResults = 1500;
    Logger.log('info', 'Get user story burndown chart data');
    const allIssuesWithWorklog = await Jira.board.getIssuesForBoard(input);
    const totalIssues = allIssuesWithWorklog.total;
    const loopCount = Math.floor(totalIssues / input.maxResults);
    if (totalIssues > input.maxResults && loopCount > 0) {
      let startIndex = 0;
      for (let index = 0; index < loopCount; index += 1) {
        startIndex += input.maxResults;
        input.startAt = startIndex;
        /* eslint-disable no-await-in-loop */
        const getRemainingData = await Jira.board.getIssuesForBoard(input);
        allIssuesWithWorklog.issues = allIssuesWithWorklog.issues.concat(getRemainingData.issues);
      }
    }
    Logger.log('info', 'Calculate statistic points for user story bundown');
    const storypointsBurndown = await GetStatisticData(allIssuesWithWorklog);
    return storypointsBurndown;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

module.exports = {
  GetStoryPointsBurndown,
  GetVersion
};
