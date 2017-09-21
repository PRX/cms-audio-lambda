'use strict';

const helper = require('./support/test-helper');
const handler = require('../index').handler;

describe('handler', () => {

  let logs = helper.spyLogger();

  it('skips insane inputs', (done) => {
    handler({foo: 'bar'}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(1);
      expect(logs.error[0]).to.match(/invalid event input/i);
      done();
    });
  });

  it('refuses to work on invalid audio-events', (done) => {
    handler({Records: [{foo: 'bar'}, {foo: 'bar'}]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(2);
      expect(logs.error[0]).to.match(/invalid record:.*bad event format/i);
      expect(logs.error[1]).to.match(/invalid record:.*bad event format/i);
      expect(result.processed).to.equal(0);
      expect(result.deleted).to.equal(0);
      done();
    });
  });

  it('skips audios without an uploadPath', (done) => {
    let okayRecord = helper.buildRaw('create', {id: 1234, destinationPath: 'foo'});
    handler({Records: [okayRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.have.keys('invalid', 'processed', 'deleted', 'skipped');
      expect(result.invalid).to.equal(0);
      expect(result.processed).to.equal(0);
      expect(result.deleted).to.equal(0);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('handle multiple tasks', (done) => {
    let proc = helper.buildRaw('create', {id: 1234, destinationPath: 'foo', uploadPath: 'bar'});
    let skip = helper.buildRaw('update', {id: 2345, destinationPath: 'foo'});
    let del = helper.buildRaw('delete', {id: 3456});
    handler({Records: [proc, skip, del]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result.processed).to.equal(1);
      expect(result.deleted).to.equal(1);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('logs errors for audios with no destinationPath', (done) => {
    let badRecord = helper.buildRaw('create', {id: 1234, uploadPath: 'foo'});
    handler({Records: [badRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(1);
      expect(logs.error[0]).to.match(/invalid record:.+no destinationpath present/i);
      done();
    });
  });

});
