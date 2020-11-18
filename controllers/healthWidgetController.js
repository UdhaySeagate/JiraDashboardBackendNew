/**
 * Controller file to handle all the business logis
 */
const { Logger } = require('../helpers/index');
const { healthwidget } = require('../api/index');
const { metaModel } = require('../models/index');

const GetAllIssues = async opts => {
  try {
    Logger.log('info', 'Health widget controller, Getting all issues details');
    let result = {};
    if (opts.selectedSprints === 'all' && opts.selectedComponents === 'all') {
      const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
      if (dataFromDB && dataFromDB.health && dataFromDB.health.length) {
        let piStatus = false;
        /* eslint-disable no-restricted-syntax */
        for (const pi of dataFromDB.health) {
          if (pi.piname === opts.versionId) {
            const dbSprintId = pi.sprintId.split(',');
            const actualSprintId = opts.sprints.split(',');
            const filteredId = actualSprintId.filter(id => dbSprintId.includes(id));
            piStatus = true;
            if (dbSprintId.length === actualSprintId.length && actualSprintId.length === filteredId.length) {
              result = pi.allSprints;
            } else {
              /* eslint-disable no-await-in-loop */
              result = await healthwidget.GetAllVersionIssues(opts);
            }
          }
        }
        if (!piStatus) {
          metaModel.SetHealthDataToDB(opts);
          result = await healthwidget.GetAllVersionIssues(opts);
        }
      } else {
        metaModel.SetHealthDataToDB(opts);
        result = await healthwidget.GetAllVersionIssues(opts);
      }
    } else {
      result = await healthwidget.GetAllVersionIssues(opts);
    }
    return result;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

module.exports = {
  GetAllIssues
};
