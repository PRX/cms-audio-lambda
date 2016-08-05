'use strict';

const helper = require('./support/test-helper');
const handler = require('../index').handler;

describe('handler', () => {

  it('rejects insane inputs', (done) => {
    handler({foo: 'bar'}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid event input/i);
      done();
    });
  });

  it('refuses to work on invalid audio-events', (done) => {
    handler({Records: [{foo: 'bar'}, {foo: 'bar'}]}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid records/i);
      expect(err).to.match(/bad event format/i);
      done();
    });
  });

  it('skips audios without an uploadPath', (done) => {
    let okayRecord = helper.buildRaw('create', {id: 1234, destinationPath: 'foo'});
    handler({Records: [okayRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.have.keys('processed', 'deleted', 'skipped');
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
      expect(result).to.have.keys('processed', 'deleted', 'skipped');
      expect(result.processed).to.equal(1);
      expect(result.deleted).to.equal(1);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('throws errors for audios with no destinationPath', (done) => {
    let badRecord = helper.buildRaw('create', {id: 1234, uploadPath: 'foo'});
    handler({Records: [badRecord]}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid records/i);
      expect(err).to.match(/no destinationPath present/i);
      done();
    });
  });

});
