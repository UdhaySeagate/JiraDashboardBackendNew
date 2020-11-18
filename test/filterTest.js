const chai = require("chai");
const chaiHttp = require("chai-http");

chai.use(chaiHttp);
chai.should();

const server = require('../server');

describe('Filters API', function() {
  it('Returns all PI and components', done => {
    chai
      .request(server)
      .get('/rest/filters/getPiAndComponents?projectIdOrKey=EOS&boardId=1097')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error for getting PI', done => {
    chai
      .request(server)
      .get('/rest/filters/getPiAndComponents?projectIdOrKey=EOS&boardId=10971')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error for getting Components', done => {
    chai
      .request(server)
      .get('/rest/filters/getPiAndComponents?projectIdOrKey=EOS1&boardId=1097')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns sprint details for the PI', done => {
    chai
      .request(server)
      .get('/rest/filters/getSprintsForPi?versionId=33279&boardId=1274&projectIdOrKey=E2')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error getting sprint details for the PI', done => {
    chai
      .request(server)
      .get('/rest/filters/getSprintsForPi?versionId=332791&boardId=1274&projectIdOrKey=E2')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns active sprint details for the PI', done => {
    chai
      .request(server)
      .get('/rest/filters/getSprintDetails?projectIdOrKey=E2&versionId=33279&boardId=1274&sprints=3023')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error getting active sprint details for the PI', done => {
    chai
      .request(server)
      .get('/rest/filters/getSprintDetails?projectIdOrKey=E21&versionId=33279&boardId=1274&sprints=3023')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
  it('Returns error by passing invalid req parameter', done => {
    chai
      .request(server)
      .get('/rest/filters/getPiAndComponents?projectIdOrKey=EOS&boardId1=1097')
      .set('Origin', 'localhost')
      .then(res => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });
});