const chai = require("chai");
const chaiHttp = require("chai-http");

chai.use(chaiHttp);
chai.should();

const server = require('../server');

describe('Health Widget API', function() {
  it('Returns all health data from issues for PI', done => {
    chai
      .request(server)
      .get('/rest/healthwidget/getAllHealthDataIssues?projectIdOrKey=EOS&boardId=1097&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790&components=21794,20801')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error getting all health data from issues for PI', done => {
    chai
      .request(server)
      .get('/rest/healthwidget/getAllHealthDataIssues?projectIdOrKey=EOS&boardId=10971&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790&components=21794,20801')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
});