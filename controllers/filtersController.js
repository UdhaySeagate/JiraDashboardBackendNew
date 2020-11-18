/**
 * Controller file to handle all the business logis
 */
const { Logger } = require('../helpers/index');
const { filters } = require('../api/index');
const { metaModel } = require('../models/index');

const GetPiComponents = async opts => {
  try {
    const result = {};
    const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
    if (dataFromDB && dataFromDB.pi.length && dataFromDB.components.length) {
      result.pi = dataFromDB.pi;
      result.components = dataFromDB.components;
    } else {
      metaModel.SetPiComponentsDataToDB(opts);
      const versions = await filters.GetVersions(opts);
      Logger.log('info', 'Filter controller, getting versions list');
      if (versions && versions.length) {
        result.pi = versions;
        const components = await filters.GetComponents(opts);
        Logger.log('info', 'Filter controller, getting components list');
        if (components.length) {
          result.components = components;
        }
      }
    }
    return result;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

const GetSprintsForPi = async opts => {
  try {
    const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
    let sprintsForPi = [];
    let sprintStatus = false;
    if (dataFromDB && dataFromDB.sprints.length) {
      dataFromDB.sprints.forEach(sprint => {
        if (sprint.piname === opts.versionId) {
          sprintsForPi = sprint.list;
          sprintStatus = true;
        }
      });
      if (!sprintStatus) {
        metaModel.SetSprintsDataToDB(opts);
        sprintsForPi = await filters.GetSprintsForPi(opts);
      }
    } else {
      metaModel.SetSprintsDataToDB(opts);
      Logger.log('info', 'Filter controller, getting sprints list for pi');
      sprintsForPi = await filters.GetSprintsForPi(opts);
    }
    return sprintsForPi;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

const GetActiveSprintsDetails = async opts => {
  try {
    let sprintDetails = {};
    let sprintStatus = false;
    const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
    if (dataFromDB && dataFromDB.sprints && dataFromDB.sprints.length) {
      dataFromDB.sprints.forEach(sprint => {
        if (sprint.piname === opts.versionId) {
          sprintDetails.activeSprint = sprint.activeSprints;
          sprintStatus = true;
        }
      });
      if (!sprintStatus) {
        sprintDetails = await filters.GetActiveSprintsDetails(opts);
      }
    } else {
      Logger.log('info', 'Filter controller, getting active sprint details for pi');
      sprintDetails = await filters.GetActiveSprintsDetails(opts);
    }
    return sprintDetails;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

module.exports = {
  GetPiComponents,
  GetSprintsForPi,
  GetActiveSprintsDetails
};
