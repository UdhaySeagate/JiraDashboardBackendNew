/**
 * Model file to handle all the database connection logis
 */
const { metaSchema } = require('../schema/index');
const { Logger } = require('../helpers/index');
const { filters, pivelocity, storypoints } = require('../api/index');
const healthwidget = require('../api/healthwidget');

const GetCompleteDataFromDB = async () => {
  try {
    Logger.log('info', 'Get complete data from Meta collection');
    const response = await metaSchema.find({});
    return response;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const GetFiltersDataFromDB = async opts => {
  try {
    Logger.log('info', 'Get data from Meta collection');
    const response = await metaSchema.findOne({ projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId });
    return response;
  } catch (exc) {
    Logger.log('error', exc);
    throw exc;
  }
};

const SetPiComponentsDataToDB = async opts => {
  Logger.log('info', 'Updating latest PI and Component data to Meta collection');
  const getPI = filters.GetVersions(opts);
  const getComponents = filters.GetComponents(opts);
  const [pi, components] = await Promise.all([getPI, getComponents]);
  const update = { $set: { pi, components } };
  const query = { projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId };
  metaSchema.findOneAndUpdate(query, update, { upsert: true }, err => {
    if (err) {
      Logger.log('error', err);
    }
  });
  Logger.log('info', 'PI and Component data to Meta collection');
};

const SetSprintsDataToDB = async opts => {
  Logger.log('info', 'Updating latest Sprints data to Meta collection');
  const piName = opts.versionId;
  let data = {};
  let activeSprintList = { activeSprint: [] };
  const sprints = await filters.GetSprintsForPi(opts);
  const existingData = await GetFiltersDataFromDB(opts);
  if (sprints.activeSprint) {
    if (sprints.activeSprint.activeList.length) {
      const asList = sprints.activeSprint.activeList;
      opts.sprints = asList.join();
      activeSprintList = await filters.GetActiveSprintsDetails(opts);
    }
  }
  if (existingData && existingData.sprints && existingData.sprints.length) {
    let sprintStatus = false;
    existingData.sprints.map(sprint => {
      if (sprint.piname === piName) {
        sprint.list = sprints;
        sprint.activeSprints = activeSprintList.activeSprint;
        sprintStatus = true;
      }
      return 'Done';
    });
    if (!sprintStatus) {
      existingData.sprints.push({ piname: piName, list: sprints, activeSprints: activeSprintList.activeSprint });
    }
    data = { sprints: existingData.sprints };
  } else {
    data = { sprints: [{ piname: piName, list: sprints, activeSprints: activeSprintList.activeSprint }] };
  }
  const update = { $set: data };
  const query = { projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId };
  metaSchema.findOneAndUpdate(query, update, { upsert: true }, err => {
    if (err) {
      Logger.log('error', err);
    }
  });
  return 'success';
};

const SetVelocityDataToDB = async opts => {
  Logger.log('info', 'Updating latest Velocity chart data to Meta collection');
  let data = {};
  const boardIssues = await pivelocity.GetVelocityChart(opts);
  const existingData = await GetFiltersDataFromDB(opts);
  let componentsArr = [];
  if (opts.components !== '') componentsArr = opts.components.split(',');
  if (existingData && existingData.velocity && existingData.velocity.length) {
    let piStatus = false;
    let componentStatus = false;
    if (componentsArr.length < 1) {
      existingData.velocity.map(pi => {
        if (pi.piname === opts.versionId) {
          piStatus = true;
          pi.allComponents = boardIssues;
          pi.sprintId = opts.sprints;
        }
        return 'Done';
      });
      if (!piStatus) {
        existingData.velocity.push({ piname: opts.versionId, components: [], sprintId: opts.sprints, allComponents: boardIssues });
      }
    } else {
      /* eslint-disable no-lonely-if */
      if (componentsArr.length === 1) {
        existingData.velocity.map(pi => {
          if (pi.piname === opts.versionId) {
            piStatus = true;
            if (pi.components && pi.components.length) {
              /* eslint-disable no-restricted-syntax */
              for (const component of pi.components) {
                if (component.name === opts.components) {
                  componentStatus = true;
                  component.value = boardIssues;
                }
              }
              if (!componentStatus) {
                pi.components.push({ name: opts.components, value: boardIssues });
              }
            } else {
              pi.components.push({ name: opts.components, value: boardIssues });
            }
          }
          return 'Done';
        });
        if (!piStatus) {
          const componentData = [
            {
              name: opts.components,
              value: boardIssues
            }
          ];
          existingData.velocity.push({ piname: opts.versionId, components: componentData, sprintId: opts.sprints, allComponents: {} });
        }
      }
    }
    data = { velocity: existingData.velocity };
  } else {
    Logger.log('info', 'Set velocity data in DB');
    const componentData = [];
    const componentObj = {};
    let allComponentData = {};
    if (componentsArr.length < 1) {
      allComponentData = boardIssues;
    } else {
      if (componentsArr.length === 1) {
        componentObj.name = opts.components;
        componentObj.value = boardIssues;
      }
      componentData.push(componentObj);
    }
    data = { velocity: [{ piname: opts.versionId, components: componentData, sprintId: opts.sprints, allComponents: allComponentData }] };
  }
  const update = { $set: data };
  const query = { projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId };
  metaSchema.findOneAndUpdate(query, update, { upsert: true }, err => {
    if (err) {
      Logger.log('error', err);
    }
  });
  return 'success';
};

const SetBurndownDataToDB = async opts => {
  Logger.log('info', 'Updating latest Burndown chart data to Meta collection');
  let data = {};
  if (opts.selectedSprints === 'all' && opts.selectedComponents === 'all') {
    const burndownData = await storypoints.GetStoryPointsBurndown(opts);
    const existingData = await GetFiltersDataFromDB(opts);
    if (existingData && existingData.burndown && existingData.burndown.length) {
      let sprintStatus = false;
      existingData.burndown.map(pi => {
        if (pi.piname === opts.versionId) {
          pi.sprintId = opts.sprints;
          pi.allSprints = burndownData;
          sprintStatus = true;
        }
        return 'Done';
      });
      if (!sprintStatus) {
        existingData.burndown.push({ piname: opts.versionId, sprintId: opts.sprints, allSprints: burndownData });
      }
      data = { burndown: existingData.burndown };
    } else {
      data = { burndown: [{ piname: opts.versionId, sprintId: opts.sprints, allSprints: burndownData }] };
    }
    const update = { $set: data };
    const query = { projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId };
    metaSchema.findOneAndUpdate(query, update, { upsert: true }, err => {
      if (err) {
        Logger.log('error', err);
      }
    });
  }
  return 'success';
};

const SetHealthDataToDB = async opts => {
  Logger.log('info', 'Updating latest Health widget chart data to Meta collection');
  let data = {};
  if (opts.selectedSprints === 'all' && opts.selectedComponents === 'all') {
    const healthData = await healthwidget.GetAllVersionIssues(opts);
    const existingData = await GetFiltersDataFromDB(opts);
    if (existingData && existingData.health && existingData.health.length) {
      let sprintStatus = false;
      existingData.health.map(pi => {
        if (pi.piname === opts.versionId) {
          pi.sprintId = opts.sprints;
          pi.allSprints = healthData;
          sprintStatus = true;
        }
        return 'Done';
      });
      if (!sprintStatus) {
        existingData.health.push({ piname: opts.versionId, sprintId: opts.sprints, allSprints: healthData });
      }
      data = { health: existingData.health };
    } else {
      data = { health: [{ piname: opts.versionId, sprintId: opts.sprints, allSprints: healthData }] };
    }
    const update = { $set: data };
    const query = { projectIdOrKey: opts.projectIdOrKey, boardId: opts.boardId };
    metaSchema.findOneAndUpdate(query, update, { upsert: true }, err => {
      if (err) {
        Logger.log('error', err);
      }
    });
  }
  return 'success';
};

module.exports = {
  GetCompleteDataFromDB,
  GetFiltersDataFromDB,
  SetSprintsDataToDB,
  SetPiComponentsDataToDB,
  SetVelocityDataToDB,
  SetBurndownDataToDB,
  SetHealthDataToDB
};
