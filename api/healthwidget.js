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

/* Response JSON logic starts */

const CompletionCalc = (data, isstype, isssts = null) => {
  const story = [...data.issues].filter(itm => {
    return itm.fields.issuetype.name === isstype;
  });
  const storylen = story.filter(datas => datas.fields.status.statusCategory.name === isssts).length;
  const completion = storylen === 0 ? 0 : (storylen * 100) / story.length;
  return completion;
};
const EpicCalc = data => {
  const epics = [];
  const epicfilter = [...data.issues].filter(itm => {
    return 'epic' in itm.fields;
  });
  epicfilter.forEach(datas => {
    epics.push(datas.fields.epic);
  });

  const unique = epics.filter((dev, index) => {
    const thing = JSON.stringify(dev);
    return (
      index ===
      epics.findIndex(obj => {
        return JSON.stringify(obj) === thing;
      })
    );
  });
  const donelen = unique.filter(datas => datas.done !== false).length;
  const completion = donelen === 0 ? 0 : (donelen * 100) / unique.length;
  return completion;
};

const CompltdRem = (data, isstype) => {
  const issues = [...data.issues].filter(itm => {
    return [isstype].indexOf(itm.fields.issuetype.name) >= 0;
  });
  const cmpltd = issues.filter(datas => datas.fields.status.statusCategory.name === 'Done').length;
  const cmpltednotcmpltd = {
    cmpltd,
    rem: issues.length - cmpltd,
    total: issues.length
  };
  return cmpltednotcmpltd;
};

const UnplannedTask = data => {
  const totaltask = [...data.issues];
  const tasklen = totaltask.filter(datas => datas.fields.assignee === null || datas.fields.customfield_11781 === null).length;
  const plantasklen = totaltask.filter(datas => datas.fields.assignee !== null && datas.fields.customfield_11781 !== null).length;
  const planpercent = plantasklen === 0 ? 0 : (plantasklen * 100) / totaltask.length;
  const completion = tasklen === 0 ? 0 : (tasklen * 100) / totaltask.length;
  const unplanneddata = {
    unplanpercent: completion,
    plannedpercent: planpercent,
    totaltask: totaltask.length,
    unplan: tasklen,
    planned: totaltask.length - tasklen
  };
  return unplanneddata;
};

const TskToBeComltd = data => {
  let storypoints = 0;
  let totalstypts = 0;
  let cmpltedstpts = 0;
  let totlstptswoassignees = 0;
  let cmpstptswoassignees = 0;
  const totaltask = [...data.issues];
  const taskwoassignee = totaltask.filter(datas => datas.fields.customfield_11781 !== null);
  const cmpwoassignee = taskwoassignee.filter(datas => datas.fields.status.statusCategory.name === 'Done');
  const plntask = totaltask.filter(datas => datas.fields.assignee !== null && datas.fields.customfield_11781 !== null);
  const tobecpltd = plntask.filter(datas => datas.fields.status.statusCategory.name !== 'Done');
  const strypttask = totaltask.filter(datas => datas.fields.assignee !== null && datas.fields.customfield_11781 !== null);
  const cmpltedtasks = strypttask.filter(datas => datas.fields.status.statusCategory.name === 'Done');
  const overallcmpltdiss = totaltask.filter(datas => datas.fields.status.statusCategory.name === 'Done').length;
  tobecpltd.forEach(datas => {
    storypoints += datas.fields.customfield_11781;
  });
  strypttask.forEach(datas => {
    totalstypts += datas.fields.customfield_11781;
  });
  cmpltedtasks.forEach(datas => {
    cmpltedstpts += datas.fields.customfield_11781;
  });
  taskwoassignee.forEach(datas => {
    totlstptswoassignees += datas.fields.customfield_11781;
  });
  cmpwoassignee.forEach(datas => {
    cmpstptswoassignees += datas.fields.customfield_11781;
  });
  const cmpltdpercent = totalstypts === 0 ? 0 : (cmpltedstpts * 100) / totalstypts;
  const tobecpltdtask = {
    tobecpltdiss: tobecpltd.length,
    strypoints: storypoints,
    totalstypts,
    cmpltedstpts,
    cmpltdpercent,
    cmpltedtasksplanned: cmpltedtasks.length,
    overallcmpltdiss,
    overallcmpltdissrem: totaltask.length - overallcmpltdiss,
    totlstptswoassignees,
    cmpstptswoassignees
  };
  return tobecpltdtask;
};
const Progress = data => {
  const totaltask = [...data.issues];
  const plnedcalc = totaltask.filter(datas => datas.fields.assignee !== null && datas.fields.customfield_11781 !== null);
  const progresslen = plnedcalc.filter(datas => 'name' in datas.fields.status.statusCategory && datas.fields.status.statusCategory.name === 'Done').length;
  const completion = progresslen === 0 ? 0 : (progresslen * 100) / plnedcalc.length;
  return completion;
};

const ResponseConstruct = result => {
  const epicCalcs = EpicCalc(result);
  const storyCmpltn = CompletionCalc(result, 'Story', 'Done');
  const BugCmpltn = CompletionCalc(result, 'Bug', 'Done');
  const taskCmpltn = CompletionCalc(result, 'Task', 'Done');
  const sunTaskCmpltn = CompletionCalc(result, 'Sub-task', 'Done');
  const unplanned = UnplannedTask(result);
  const res = {
    completionstatus: [
      { name: 'Stories', percent: storyCmpltn },
      { name: 'Tasks', percent: taskCmpltn },
      { name: 'Sub-Task', percent: sunTaskCmpltn },
      { name: 'Bugs', percent: BugCmpltn },
      { name: 'Epic', percent: epicCalcs },
      { name: 'Unplanned', percent: Math.round(unplanned.unplanpercent) },
      { name: 'Planned', percent: Math.round(unplanned.plannedpercent) }
    ],
    taskstatus: {
      totaltasks: unplanned.totaltask,
      planned: unplanned.planned,
      unplanned: unplanned.unplan
    },
    popover: {
      story: CompltdRem(result, 'Story'),
      task: CompltdRem(result, 'Task'),
      subtask: CompltdRem(result, 'Sub-task'),
      bug: CompltdRem(result, 'Bug')
    },
    healthinfo: {
      tasks: TskToBeComltd(result),
      progress: {
        value: Progress(result)
      }
    }
  };
  return res;
};

/* Response JSON logic ends */

const GetAllVersionIssues = async opts => {
  try {
    const input = {};
    let query = `project = ${opts.projectIdOrKey} AND fixVersion = ${opts.versionId} AND Sprint in (closedSprints(), openSprints(), futureSprints())`;
    if (opts.sprints && opts.sprints !== '') {
      query += ` AND Sprint in (${opts.sprints})`;
    }
    if (opts.components && opts.components !== '') {
      query += ` AND component in (${opts.components})`;
    }
    input.jql = query;
    input.boardId = opts.boardId;
    input.fields = ['customfield_11781', 'status', 'assignee', 'issuetype', 'parent'];
    input.maxResults = 1500;
    Logger.log('info', 'Get all issues for healthwidget data');
    const result = await Jira.board.getIssuesForBoard(input);
    const totalIssues = result.total;
    const loopCount = Math.floor(totalIssues / input.maxResults);
    if (totalIssues > input.maxResults && loopCount > 0) {
      let startIndex = 0;
      for (let index = 0; index < loopCount; index += 1) {
        startIndex += input.maxResults;
        input.startAt = startIndex;
        const getRemainingData = Jira.board.getIssuesForBoard(input);
        result.issues.concat(getRemainingData.issues);
      }
    }
    Logger.log('info', 'Process health widget response data');
    const res = await ResponseConstruct(result);
    Logger.log('info', 'Convert response to a json');
    return res;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

module.exports = {
  GetAllVersionIssues
};
