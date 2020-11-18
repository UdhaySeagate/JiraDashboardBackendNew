const express = require('express');

const router = express.Router();
const { filtersController } = require('../controllers/index');
const { Logger, Utility } = require('../helpers/index');

router.get('/rest/filters/getPiAndComponents', async (req, res) => {
  Logger.log('info', 'Initializing get all versions and commponents of the board');
  const opts = req.query;
  const result = await filtersController.GetPiComponents(opts);
  if (result.pi) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

router.get('/rest/filters/getSprintsForPi', async (req, res) => {
  Logger.log('info', 'Initializing get all sprints respective of versions');
  const opts = req.query;
  const result = await filtersController.GetSprintsForPi(opts);
  if (result.sprints) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

router.get('/rest/filters/getSprintDetails', async (req, res) => {
  Logger.log('info', 'Initializing get sprints details');
  const opts = req.query;
  const result = await filtersController.GetActiveSprintsDetails(opts);
  if (result.activeSprint) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

module.exports = router;
