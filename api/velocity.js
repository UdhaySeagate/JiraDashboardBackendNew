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

const GetIssuesForPI = async opts => {
  Logger.log('info', 'Get all issues for the PI based on board');
  opts.jql = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId} AND Sprint in (${opts.sprints})`;
  if (opts.components !== '') {
    opts.jql += ` AND component in (${opts.components})`;
  }
  opts.fields = ['sprint', 'closedSprints', 'customfield_11781', 'resolutiondate', 'issuetype'];
  opts.maxResults = 1000;
  Logger.log('info', 'Get sprints for  board');
  const boardIssues = await Jira.board.getIssuesForBoard(opts);
  const totalIssues = boardIssues.total;
  const loopCount = Math.floor(totalIssues / opts.maxResults);
  if (totalIssues > opts.maxResults && loopCount > 0) {
    let startIndex = 0;
    for (let index = 0; index < loopCount; index += 1) {
      startIndex += opts.maxResults;
      opts.startAt = startIndex;
      /* eslint-disable no-await-in-loop */
      const getRemainingData = await Jira.board.getIssuesForBoard(opts);
      boardIssues.issues = boardIssues.issues.concat(getRemainingData.issues);
    }
  }
  return boardIssues;
};

const GetSprintList = async (boardIssues, sprintId) => {
  Logger.log('info', 'Get all list of sprints for the PI');
  let sprintDetails = [];
  let activeSprintList = [];
  const sprintIds = sprintId.split(',').map(x => +x);
  boardIssues.issues.forEach(issue => {
    if (issue.fields && (issue.fields.sprint || issue.fields.closedSprints)) {
      if (issue.fields.sprint) {
        let spName = issue.fields.sprint.name;
        spName = spName.toUpperCase();
        spName = spName.startsWith('EES_SPRINT');
        if (spName) {
          sprintDetails.push(issue.fields.sprint);
          if (issue.fields.sprint.state === 'active') activeSprintList.push(issue.fields.sprint.id);
        }
      }
      if (issue.fields.closedSprints) {
        issue.fields.closedSprints.forEach(closed => {
          let spName = closed.name;
          spName = spName.toUpperCase();
          spName = spName.startsWith('EES_SPRINT');
          if (spName) {
            if (closed.startDate && closed.endDate) sprintDetails.push(closed);
          }
        });
      }
    }
  });
  sprintDetails = Array.from(new Set(sprintDetails.map(JSON.stringify))).map(JSON.parse);
  sprintDetails = sprintDetails.filter(sprint => sprintIds.includes(sprint.id));
  activeSprintList = [...new Set(activeSprintList)];
  Logger.log('info', 'GetSprintList completed');
  return [sprintDetails, activeSprintList];
};

const GetUnestimatedData = async boardIssues => {
  Logger.log('info', 'Get unestimated issues percentage and count');
  const total = boardIssues.issues.length;
  const unestimatedIssues = boardIssues.issues.filter(issue => issue.fields.customfield_11781 === null && issue.fields.issuetype.subtask === false);
  let percentage = '0%';
  if (unestimatedIssues.length) {
    percentage = `${Math.round((unestimatedIssues.length * 100) / total)}%`;
  }
  const result = Object.assign({
    total,
    unestimated: unestimatedIssues.length,
    percentage
  });
  Logger.log('info', 'GetUnestimatedData completed');
  return result;
};

const GetInitalEstimate = async input => {
  const intialIssues = await Jira.board.getIssuesForBoard(input);
  let completedSP = 0;
  let totalSP = 0;
  if (intialIssues.issues.length > 0) {
    intialIssues.issues.forEach(data => {
      if (data.fields.customfield_11781) totalSP += data.fields.customfield_11781;
      if (data.fields.customfield_11781 !== null && data.fields.resolutiondate !== null) {
        completedSP += data.fields.customfield_11781;
      }
    });
  }
  return [totalSP, completedSP];
};

const GetAddedEstimate = async input => {
  const addedIssues = await Jira.board.getIssuesForBoard(input);
  let addedSP = 0;
  if (addedIssues.issues.length > 0) {
    addedIssues.issues.forEach(data => {
      if (data.fields.customfield_11781 !== null) {
        addedSP += data.fields.customfield_11781;
      }
    });
  }
  return addedSP;
};

const GetSprintData = async (sprint, opts) => {
  Logger.log('info', 'Get statistic data for the sprint ');
  const common = {
    fields: ['customfield_11781', 'resolutiondate'],
    boardId: opts.boardId,
    maxResults: 5000
  };
  const input1 = { ...common };
  const input2 = { ...common };
  let dateRange = '';
  let startDate = null;
  let endDate = null;
  let query1 = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId} 
  AND Sprint in (closedSprints(), openSprints(), futureSprints()) AND Sprint = ${sprint.id}`;
  if (sprint.startDate && sprint.endDate) {
    startDate = sprint.startDate.split('T')[0];
    endDate = sprint.endDate.split('T')[0];
    dateRange = ` AND createdDate >= ${startDate} AND createdDate <= ${endDate}`;
  }
  let query2 = query1 + dateRange;
  if (opts.components !== '') {
    query1 += ` AND component in (${opts.components})`;
    query2 += ` AND component in (${opts.components})`;
  }
  input1.jql = query1;
  input2.jql = query2;

  Logger.log('info', 'Get initial estimated SP for the sprint');
  const getInitalSP = GetInitalEstimate(input1);

  Logger.log('info', 'Get added SP for the sprint');
  const getAddedSP = GetAddedEstimate(input2);

  const [[totalSP, completedSP], addedSP] = await Promise.all([getInitalSP, getAddedSP]);

  const result = Object.assign({
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    startDate,
    endDate,
    predicted: null,
    addedSP,
    initialSP: totalSP - addedSP,
    completedSP,
    openSP: totalSP - completedSP
  });
  if (sprint.state === 'future') {
    result.addedSP = 0;
    result.initialSP = totalSP;
  }
  Logger.log('info', 'GetSprintData method completed');
  return result;
};

const parseDate = str => {
  Logger.log('info', 'Parsing date');
  const ymd = str.split('-');
  return new Date(ymd[0], ymd[1] - 1, ymd[2]);
};

const RemainingDays = (first, second) => {
  Logger.log('info', 'Sprint duration remainings days');
  return Math.round((second - first) / (1000 * 60 * 60 * 24));
};

const CalculateSprintDuration = async sprints => {
  Logger.log('info', 'Sprint duration');
  const singleSprint = sprints[sprints.length - 1];
  const startDate = parseDate(singleSprint.startDate);
  const endDate = parseDate(singleSprint.endDate);
  const remainingDays = RemainingDays(startDate, endDate);
  return remainingDays;
};

const CalculatePredictedDate = async (ymd, duration) => {
  Logger.log('info', 'Startdate enddate prediction');
  ymd[2] = parseInt(ymd[2], 10);
  const nextStartDate = new Date(ymd[0], ymd[1] - 1, ymd[2] + 2);
  if (nextStartDate.getDay() === 7) nextStartDate.setDate(nextStartDate.getDate() + 1);
  if (nextStartDate.getDay() === 6) nextStartDate.setDate(nextStartDate.getDate() + 2);
  const sprintStartDate = nextStartDate.toISOString().split('T')[0];
  nextStartDate.setDate(nextStartDate.getDate() + duration);
  const sprintEndDate = nextStartDate.toISOString().split('T')[0];
  Logger.log('info', 'Startdate enddate prediction completed');
  return [sprintStartDate, sprintEndDate];
};

const GetLastThreeSprints = async sprints => {
  Logger.log('info', 'GetLastThreeSprits getting valid sprints');
  let totalCompletedSP = 0;
  const usedSprintName = [];
  const filterredSprints = sprints.filter(sprint => sprint.completedSP > 0);
  if (filterredSprints.length >= 3) {
    const lastThreeSprints = filterredSprints.slice(-3);
    lastThreeSprints.forEach(sprint => {
      totalCompletedSP += sprint.completedSP;
      usedSprintName.push(sprint.name);
    });
  }
  return [filterredSprints, totalCompletedSP, usedSprintName];
};

const CalculateSprintVelocity = async (sprints, activeList, totalRemainingSP, futureSprints) => {
  Logger.log('info', 'Calculate sprint velocity starting');
  const orginalSprint = [...sprints];
  const duplicateSprints = [...sprints];
  const sprintForCalc = [...sprints];
  let AvgVelocity = 0;
  let sprintsRemaining = 0;
  let usedSprints = [];
  if (activeList.length) {
    duplicateSprints.pop();
    const [remainingValidSprints] = await GetLastThreeSprints(duplicateSprints);
    if (remainingValidSprints.length < 3) {
      return [sprintsRemaining, AvgVelocity, usedSprints];
    }
  }
  if (sprints.length >= 3) {
    if (activeList.length >= 1) {
      Logger.log('info', 'Atleast one active sprint condition');
      const activeSprint = orginalSprint.pop();
      const [remainingValidSprints, totalCompletedSP, usedSprintName] = await GetLastThreeSprints(orginalSprint);
      if (remainingValidSprints < 3) return [sprintsRemaining, AvgVelocity, usedSprints];
      usedSprints = usedSprintName;
      AvgVelocity = Math.round(totalCompletedSP / 3);
      if (activeSprint.completedSP >= AvgVelocity) {
        Logger.log('info', 'Active sprint greater than avg velocity');
        const [remainingvalidSprints] = await GetLastThreeSprints(sprintForCalc);
        usedSprints = [];
        let totalCompletedSPWithActive = 0;
        const lastThreeSprintWithActiveSp = remainingvalidSprints.slice(-3);
        lastThreeSprintWithActiveSp.forEach(sprint => {
          totalCompletedSPWithActive += sprint.completedSP;
          usedSprints.push(sprint.name);
        });
        AvgVelocity = Math.round(totalCompletedSPWithActive / 3);
      } else {
        Logger.log('info', 'Active sprint lesser than avg velocity');
        if (activeSprint.completedSP >= 0) {
          const remaining = AvgVelocity - activeSprint.completedSP;
          totalRemainingSP -= remaining;
        }
      }
    } else {
      Logger.log('info', 'No active sprint condition');
      const [remainingValidSprints, totalCompletedSP, usedSprintName] = await GetLastThreeSprints(orginalSprint);
      if (remainingValidSprints < 3) return [sprintsRemaining, AvgVelocity, usedSprints];
      usedSprints = usedSprintName;
      AvgVelocity = Math.round(totalCompletedSP / 3);
    }
    const roundOffValue = totalRemainingSP / AvgVelocity;
    sprintsRemaining = Math.round(totalRemainingSP / AvgVelocity);
    if (roundOffValue > sprintsRemaining) {
      sprintsRemaining += 1;
    }
    if (futureSprints.length && sprintsRemaining > 0) {
      if (sprintsRemaining < futureSprints.length) {
        sprintsRemaining = futureSprints.length;
      }
    }
    Logger.log('info', 'CalculateSprintVelocity completed');
  }
  return [sprintsRemaining, AvgVelocity, usedSprints];
};

const GetPredictedSprints = async (currentSprints, duration, forecast, velocity, remainingSP, futureSprints) => {
  Logger.log('info', 'Sprints prediction based on forecasting');
  const sprints = currentSprints;
  let notProcessed = true;
  let counter = 1;
  if (forecast > 0) {
    for (let index = 0; index < forecast; index += 1) {
      let avgVelocity = velocity;
      const lastSprint = sprints[sprints.length - 1];
      if (lastSprint.state === 'active' && lastSprint.completedSP < avgVelocity) {
        const extraVelocity = avgVelocity - lastSprint.completedSP;
        remainingSP -= extraVelocity;
        lastSprint.predicted = extraVelocity;
      }
      if (forecast === index + 1 && remainingSP > 0) {
        const quotient = Math.floor(remainingSP / avgVelocity);
        const remainder = remainingSP % avgVelocity;
        if (remainder !== 0 && forecast !== quotient) {
          avgVelocity = remainingSP % avgVelocity;
        }
      }
      if (futureSprints.length && notProcessed === true) {
        for (let i = 0; i < futureSprints.length; i += 1) {
          notProcessed = false;
          const finalSprint = sprints[sprints.length - 1];
          const ymd = finalSprint.endDate.split('-');
          const [predictedSD, predictedED] = await CalculatePredictedDate(ymd, duration);
          const predictedSprints = Object.assign({
            id: futureSprints[i].id,
            name: futureSprints[i].name,
            state: futureSprints[i].state,
            startDate: predictedSD,
            endDate: predictedED,
            predicted: avgVelocity,
            addedSP: null,
            initialSP: futureSprints[i].initialSP ? futureSprints[i].initialSP : null,
            completedSP: futureSprints[i].completedSP ? futureSprints[i].completedSP : null,
            openSP: futureSprints[i].openSP ? futureSprints[i].openSP : null
          });
          sprints.push(predictedSprints);
          index += i;
        }
      }
      if (index === futureSprints.length - 1) {
        /* eslint-disable no-continue */
        continue;
      }
      const ymd = lastSprint.endDate.split('-');
      const [predictedSD, predictedED] = await CalculatePredictedDate(ymd, duration);
      const predictedSprints = Object.assign({
        id: null,
        name: `Forecast ${counter}`,
        state: 'forecast',
        startDate: predictedSD,
        endDate: predictedED,
        predicted: avgVelocity,
        addedSP: null,
        initialSP: null,
        completedSP: null,
        openSP: null
      });
      sprints.push(predictedSprints);
      counter += 1;
    }
  } else {
    Logger.log('info', 'GetPredictedSprints zero forecast');
    const tempSprints = currentSprints;
    if (futureSprints.length) {
      const fduration = await CalculateSprintDuration(sprints);
      /* eslint-disable no-restricted-syntax */
      for (const fsprint of futureSprints) {
        const lastSprint = tempSprints[tempSprints.length - 1];
        const ymd = lastSprint.endDate.split('-');
        const [predictedSD, predictedED] = await CalculatePredictedDate(ymd, fduration);
        fsprint.startDate = predictedSD;
        fsprint.endDate = predictedED;
        tempSprints.push(fsprint);
      }
    }
  }
  Logger.log('info', 'GetPredictedSprints completed');
  return sprints;
};

const CalculateSP = async sprints => {
  Logger.log('info', 'Story point calculation');
  let totalSP = 0;
  let completeSP = 0;
  sprints.forEach(sprint => {
    if (sprint.completedSP) completeSP += sprint.completedSP;
    if (sprint.addedSP) totalSP += sprint.addedSP;
    if (sprint.initialSP) totalSP += sprint.initialSP;
  });
  const remainingSP = totalSP - completeSP;
  return [totalSP, completeSP, remainingSP];
};

const GetVelocityChart = async opts => {
  try {
    Logger.log('info', 'Get velocity chart prediction based on PI selection');
    const result = {
      velocity: 0,
      forecast: 0,
      sprintInfo: []
    };
    const sprints = [];
    const boardIssues = await GetIssuesForPI(opts);
    const getUnestimate = GetUnestimatedData(boardIssues);
    const getSprints = GetSprintList(boardIssues, opts.sprints);
    const [unestimatedData, [sprintList, activeList]] = await Promise.all([getUnestimate, getSprints]);
    result.issues = unestimatedData;
    for (let index = 0; index < sprintList.length; index += 1) {
      /* eslint-disable no-await-in-loop */
      const sprintData = await GetSprintData(sprintList[index], opts);
      sprints.push(sprintData);
    }
    const [totalSP, completedSP, remainingSP] = await CalculateSP(sprints);
    /* eslint-disable no-nested-ternary */
    const futureSprints = sprints.filter(sprint => sprint.state === 'future');
    const currentSprints = sprints.filter(sprint => sprint.state !== 'future');
    currentSprints.sort((a, b) => (a.startDate > b.startDate ? 1 : b.startDate > a.startDate ? -1 : 0));
    currentSprints.sort((a, b) => (a.state < b.state ? 1 : b.state < a.state ? -1 : 0));
    const validSprints = currentSprints.filter(sprint => sprint.completedSP > 0);
    if (validSprints.length >= 3) {
      const getSprintDuration = CalculateSprintDuration(currentSprints);
      const getSprintVelocity = CalculateSprintVelocity(currentSprints, activeList, remainingSP, futureSprints);
      const [sprintDuration, [sprintsRemaining, AvgVelocity, usedSprints]] = await Promise.all([getSprintDuration, getSprintVelocity]);
      const sprintsForcasting = await GetPredictedSprints(currentSprints, sprintDuration, sprintsRemaining, AvgVelocity, remainingSP, futureSprints);
      result.sprints = sprintsForcasting.sort((a, b) => (a.startDate > b.startDate ? 1 : b.startDate > a.startDate ? -1 : 0));
      result.velocity = AvgVelocity;
      result.forecast = sprintsRemaining;
      result.sprintInfo = usedSprints;
    } else {
      const tempSprints = currentSprints;
      if (currentSprints.length) {
        if (futureSprints.length) {
          const fduration = await CalculateSprintDuration(currentSprints);
          /* eslint-disable no-restricted-syntax */
          for (const fsprint of futureSprints) {
            const lastSprint = tempSprints[tempSprints.length - 1];
            const ymd = lastSprint.endDate.split('-');
            const [predictedSD, predictedED] = await CalculatePredictedDate(ymd, fduration);
            fsprint.startDate = predictedSD;
            fsprint.endDate = predictedED;
            tempSprints.push(fsprint);
          }
          result.sprints = tempSprints.sort((a, b) => (a.startDate > b.startDate ? 1 : b.startDate > a.startDate ? -1 : 0));
        } else {
          result.sprints = tempSprints;
        }
      } else {
        result.sprints = futureSprints;
      }
    }
    result.completedSP = completedSP;
    result.remainingSP = remainingSP;
    result.totalSP = totalSP;
    return await result;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

module.exports = {
  GetVelocityChart,
  GetIssuesForPI
};
