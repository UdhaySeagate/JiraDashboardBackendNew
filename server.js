const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { filterRouter, storypointRouter, healthwidgetRouter, velocityRouter } = require('./routes/index');
const { Logger, Utility } = require('./helpers/index');
const { metaJobs } = require('./scheduler/index');
const swaggerDocument = require('./swagger/swagger.json');

const app = express();
dotenv.config();

app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }));
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use('/', async (req, res, next) => {
  // middleware to validate the correct origin
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
  }
  const reqParams = Object.keys(req.query);
  const found = reqParams.every(param => Utility.RequestParams.includes(param));
  if (found) {
    Logger.log('info', `Middleware running: ${req.hostname}`);
    next();
  } else {
    const response = await Utility.ErrorResponse({ statusCode: 403, body: 'Invalid input parameter' });
    res.send(response);
  }
  return 'success';
});

// Database connection
mongoose.Promise = global.Promise;
Logger.log('info', 'Initiating DB connection');
mongoose.connect(process.env.MONGODB, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
const db = mongoose.connection;
db.on('error', () => Logger.log('error', 'FAILED to connect to mongoose'));
db.once('open', () => Logger.log('info', 'MongoDB is running'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(filterRouter, storypointRouter, healthwidgetRouter, velocityRouter);

app.set('host', process.env.HOST || 'http://localhost');
app.set('port', process.env.PORT || 9090);

app.listen(app.get('port'), () => {
  Logger.log('info', `App is running at ${app.get('host')}:${app.get('port')}`);
  console.log('info', `App is running at ${app.get('host')}:${app.get('port')}`);
});

cron.schedule('*/5 * * * *', () => {
  Logger.log('info', 'Cron job running in 5 mins time interval');
  metaJobs.ScheduledJobs();
});

module.exports = app;
