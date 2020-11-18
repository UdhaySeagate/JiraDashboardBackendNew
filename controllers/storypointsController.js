/**
 * Controller file to handle all the business logis
 */
const { Logger } = require('../helpers/index');
const { storypoints } = require('../api/index');
const { metaModel } = require('../models/index');

const GetStoryPointsBurndown = async opts => {
  try {
    Logger.log('info', 'Storypoints controller, getting user story burndown data');
    let storyPointsBurndown = {};
    if (opts.selectedSprints === 'all' && opts.selectedComponents === 'all') {
      const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
      if (dataFromDB && dataFromDB.burndown && dataFromDB.burndown.length) {
        let piStatus = false;
        /* eslint-disable no-restricted-syntax */
        for (const pi of dataFromDB.burndown) {
          if (pi.piname === opts.versionId) {
            const dbSprintId = pi.sprintId.split(',');
            const actualSprintId = opts.sprints.split(',');
            const filteredId = actualSprintId.filter(id => dbSprintId.includes(id));
            piStatus = true;
            if (dbSprintId.length === actualSprintId.length && actualSprintId.length === filteredId.length) {
              storyPointsBurndown = pi.allSprints;
            } else {
              /* eslint-disable no-await-in-loop */
              storyPointsBurndown = await storypoints.GetStoryPointsBurndown(opts);
            }
          }
        }
        if (!piStatus) {
          metaModel.SetBurndownDataToDB(opts);
          storyPointsBurndown = await storypoints.GetStoryPointsBurndown(opts);
        }
      } else {
        metaModel.SetBurndownDataToDB(opts);
        storyPointsBurndown = await storypoints.GetStoryPointsBurndown(opts);
      }
    } else {
      storyPointsBurndown = await storypoints.GetStoryPointsBurndown(opts);
    }
    return storyPointsBurndown;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

const GetVersion = async opts => {
  try {
    Logger.log('info', 'Storypoints controller, getting version details for burndown chart');
    const version = await storypoints.GetVersion(opts);
    return version;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

module.exports = {
  GetStoryPointsBurndown,
  GetVersion
};
