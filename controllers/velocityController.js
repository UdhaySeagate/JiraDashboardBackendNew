/**
 * Controller file to handle all the business logis
 */
const { Logger } = require('../helpers/index');
const { pivelocity } = require('../api/index');
const { metaModel } = require('../models/index');

const GetVelocityChart = async opts => {
  try {
    Logger.log('info', 'Velocity controller, getting pi velocity prediction');
    let velocityPrediction = {};
    const dataFromDB = await metaModel.GetFiltersDataFromDB(opts);
    if (dataFromDB && dataFromDB.velocity && dataFromDB.velocity.length) {
      let piStatus = false;
      let componentStatus = false;
      let componentsArr = [];
      if (opts.components !== '') componentsArr = opts.components.split(',');
      if (componentsArr.length > 1) {
        velocityPrediction = await pivelocity.GetVelocityChart(opts);
      } else {
        /* eslint-disable no-lonely-if */
        if (componentsArr.length === 1) {
          /* eslint-disable no-restricted-syntax */
          for (const pi of dataFromDB.velocity) {
            if (pi.piname === opts.versionId) {
              piStatus = true;
              if (pi.components && pi.components.length) {
                for (const component of pi.components) {
                  if (component.name === opts.components) {
                    componentStatus = true;
                    velocityPrediction = component.value;
                  }
                }
              } else {
                /* eslint-disable no-await-in-loop */
                metaModel.SetVelocityDataToDB(opts);
                velocityPrediction = await pivelocity.GetVelocityChart(opts);
              }
            }
          }
          if (!piStatus || !componentStatus) {
            metaModel.SetVelocityDataToDB(opts);
            velocityPrediction = await pivelocity.GetVelocityChart(opts);
          }
        } else {
          /* eslint-disable no-restricted-syntax */
          for (const pi of dataFromDB.velocity) {
            if (pi.piname === opts.versionId) {
              const dbSprintId = pi.sprintId.split(',');
              const actualSprintId = opts.sprints.split(',');
              const filteredId = actualSprintId.filter(id => dbSprintId.includes(id));
              piStatus = true;
              if (dbSprintId.length === actualSprintId.length && actualSprintId.length === filteredId.length) {
                velocityPrediction = pi.allComponents;
              } else {
                /* eslint-disable no-await-in-loop */
                velocityPrediction = await pivelocity.GetVelocityChart(opts);
              }
            }
          }
          if (!piStatus) {
            metaModel.SetVelocityDataToDB(opts);
            velocityPrediction = await pivelocity.GetVelocityChart(opts);
          }
        }
      }
    } else {
      metaModel.SetVelocityDataToDB(opts);
      velocityPrediction = await pivelocity.GetVelocityChart(opts);
    }
    if (Object.keys(velocityPrediction).length === 0) {
      velocityPrediction = await pivelocity.GetVelocityChart(opts);
    }
    return velocityPrediction;
  } catch (exc) {
    Logger.log('error', exc);
    return JSON.parse(exc);
  }
};

module.exports = {
  GetVelocityChart
};
