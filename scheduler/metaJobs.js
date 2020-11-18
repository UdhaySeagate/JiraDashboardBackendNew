/**
 * Scheduler file to handle all the cron jobs running in the time interval
 */
const { metaModel } = require('../models/index');

const UpdateSprintsData = async (params, data) => {
  if (data.sprints && data.sprints.length) {
    /* eslint-disable no-restricted-syntax */
    for (const sprint of data.sprints) {
      const param = { ...params };
      param.versionId = sprint.piname;
      /* eslint-disable no-await-in-loop */
      await metaModel.SetSprintsDataToDB(param);
    }
  }
};

const UpdateHealthWidgetData = async (params, data) => {
  if (data.health && data.health.length) {
    for (const pi of data.health) {
      const opts = { ...params };
      opts.versionId = pi.piname;
      opts.components = '';
      opts.sprints = pi.sprintId;
      opts.selectedSprints = 'all';
      opts.selectedComponents = 'all';
      await metaModel.SetHealthDataToDB(opts);
    }
  }
};

const UpdateBurndownData = async (params, data) => {
  if (data.burndown && data.burndown.length) {
    for (const pi of data.burndown) {
      const opts = { ...params };
      opts.versionId = pi.piname;
      opts.components = '';
      opts.sprints = pi.sprintId;
      opts.selectedSprints = 'all';
      opts.selectedComponents = 'all';
      await metaModel.SetBurndownDataToDB(opts);
    }
  }
};

const UpdateVelocityData = async (params, data) => {
  if (data.velocity && data.velocity.length) {
    for (const pi of data.velocity) {
      const opts = { ...params };
      opts.versionId = pi.piname;
      opts.components = '';
      opts.sprints = pi.sprintId;
      await metaModel.SetVelocityDataToDB(opts);
      if (pi.components && pi.components.length) {
        const allPromise = [];
        for (const component of pi.components) {
          opts.components = component.name;
          allPromise.push(metaModel.SetVelocityDataToDB(opts));
        }
        await Promise.all(allPromise);
      }
    }
  }
};

const ScheduledJobs = async () => {
  const existingData = await metaModel.GetCompleteDataFromDB();
  if (existingData && existingData.length) {
    for (const data of existingData) {
      const params = {};
      params.projectIdOrKey = data.projectIdOrKey;
      params.boardId = data.boardId;
      const updatePiComponents = metaModel.SetPiComponentsDataToDB(params);
      const updateSprints = UpdateSprintsData(params, data);
      const updateHealthWidget = UpdateHealthWidgetData(params, data);
      const updateBurndown = UpdateBurndownData(params, data);
      const updateVelocity = UpdateVelocityData(params, data);
      await Promise.all([updatePiComponents, updateSprints, updateHealthWidget, updateBurndown, updateVelocity]);
    }
  }
};

module.exports = {
  ScheduledJobs
};
