const express = require('express');

const router = express.Router();
const { storypointsController } = require('../controllers/index');
const { Logger, Utility } = require('../helpers/index');

router.get('/rest/storypoints/getVersion', async (req, res) => {
  Logger.log('info', 'Initializing get version details');
  const opts = req.query;
  const result = await storypointsController.GetVersion(opts);
  if (result.id) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

router.get('/rest/storypoints/getStoryPointsBurndown', async (req, res) => {
  Logger.log('info', 'Initializing get sprints details');
  const opts = req.query;
  const result = await storypointsController.GetStoryPointsBurndown(opts);
  if (Object.prototype.hasOwnProperty.call(result, 'storyPoints')) {
    const response = await Utility.SuccessResponse(result);
    res.send(response);
  } else {
    const response = await Utility.ErrorResponse(result);
    res.send(response);
  }
});

module.exports = router;
