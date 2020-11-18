const chai = require("chai");
const chaiHttp = require("chai-http");

chai.use(chaiHttp);
chai.should();

const server = require('../server');

describe('PI Velocity Chart API', function() {
  it('Returns Velocity without forecast information', done => {
    chai
      .request(server)
      .get('/rest/velocity/getVelocityChart?projectIdOrKey=EOS&boardId=1097&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790&components=21794,20801')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns Velocity with forecast information', done => {
    chai
      .request(server)
      .get('/rest/velocity/getVelocityChart?projectIdOrKey=EOS&boardId=1097&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error for getting Velocity forecast information', done => {
    chai
      .request(server)
      .get('/rest/velocity/getVelocityChart?projectIdOrKey=EOS&boardId=10971&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790&components=21794,20801')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
});