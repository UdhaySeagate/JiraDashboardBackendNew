const express = require('express');

const router = express.Router();
const { healthWidgetController } = require('../controllers/index');
const { Logger, Utility } = require('../helpers/index');

router.get('/rest/healthwidget/getAllHealthDataIssues', async (req, res) => {
  Logger.log('info', 'Initializing issues api call');
  const opts = req.query;
  const result = await healthWidgetController.GetAllIssues(opts);
  if (result.completionstatus) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

module.exports = router;
