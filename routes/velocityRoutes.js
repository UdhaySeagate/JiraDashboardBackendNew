const express = require('express');

const router = express.Router();
const { velocityController } = require('../controllers/index');
const { Logger, Utility } = require('../helpers/index');

router.get('/rest/velocity/getVelocityChart', async (req, res) => {
  Logger.log('info', 'Initializing get velocity prediction details');
  const opts = req.query;
  const result = await velocityController.GetVelocityChart(opts);
  if (result.issues) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

module.exports = router;
