const chai = require("chai");
const chaiHttp = require("chai-http");

chai.use(chaiHttp);
chai.should();

const server = require('../server');

describe('User story Burndown API', function() {
  it('Returns PI information', done => {
    chai
      .request(server)
      .get('/rest/storypoints/getVersion?versionId=33229')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error for getting PI information', done => {
    chai
      .request(server)
      .get('/rest/storypoints/getVersion?versionId=332291')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns user story burndown data for PI', done => {
    chai
      .request(server)
      .get('/rest/storypoints/getStoryPointsBurndown?projectIdOrKey=EOS&boardId=1097&versionId=32267&sprints=3023,3024,2912,2867,3204,3025,3084,2866,2790&components=21794,20801')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error on getting user story burndown data for PI', done => {
    chai
      .request(server)
      .get('/rest/storypoints/getStoryPointsBurndown?projectIdOrKey=E21&boardId=1274&versionId=33279&components=&sprints=')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
});