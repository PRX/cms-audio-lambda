'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');
const UploadedFile = require('../../lib/uploaded-file');

describe('processor-work', () => {

  const TEST_DEST = `${process.env.TEST_FOLDER}/2345`;

  let logs = helper.spyLogger();
  let s3AudioPath = helper.putS3TestFile('test.mp3');
  let s3CorruptPath = helper.putS3TestFile('corruptframes.mp3');
  let s3ImagePath = helper.putS3TestFile('png.mp3');

  let ae;
  beforeEach(() => {
    ae = helper.buildMessage('create', {
      id: 2345,
      uploadPath: `https://s3.amazonaws.com/${s3AudioPath}`,
      destinationPath: TEST_DEST,
      _links: {profile: {href: 'audio/story'}}
    });
  });

  before(() => {
    return helper.listS3Path(TEST_DEST, 0).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  after(() => {
    return helper.listS3Path(TEST_DEST, 0).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  // spy on uploaded-file callbacks
  beforeEach(() => sinon.stub(UploadedFile.prototype, 'callback').returns(Q('anything')));
  afterEach(() => UploadedFile.prototype.callback.restore());
  const getUploadedFile = () => {
    expect(UploadedFile.prototype.callback.callCount).to.equal(1);
    return UploadedFile.prototype.callback.thisValues[0];
  }

  it('detects audio and uploads to s3', function() {
    this.timeout(5000);

    expect(ae.invalid).to.be.undefined;
    return processor.work(ae).then(success => {
      expect(success).to.be.true;

      let file = getUploadedFile();
      expect(file.id).to.equal(ae.audioId);
      expect(file.name).to.equal('test.mp3');
      expect(file.size).to.equal(12582);
      expect(file.downloaded).to.equal(true);
      expect(file.detected).to.equal(true);
      expect(file.processed).to.equal(true);
      expect(helper.gone(file.localPath)).to.equal(true);

      return helper.listS3Path(TEST_DEST).then(keys => {
        expect(keys.length).to.equal(2);
        expect(keys).to.include(`${TEST_DEST}/test.mp3`);
        expect(keys).to.include(`${TEST_DEST}/test_broadcast.mp3`);
      });
    });
  });

  it('catches non-audio detection errors', function() {
    ae.body.uploadPath = `https://s3.amazonaws.com/${s3ImagePath}`;
    expect(ae.invalid).to.be.undefined;
    return processor.work(ae).then(success => {
      expect(success).to.be.true;

      let file = getUploadedFile();
      expect(file.downloaded).to.equal(true);
      expect(file.detected).to.equal(false);
      expect(file.processed).to.equal(true);
      expect(file.error).to.be.null;
      expect(helper.gone(file.localPath)).to.equal(true);
    });
  });

  it('throws bad mp3 detection errors', function() {
    ae.body.uploadPath = `https://s3.amazonaws.com/${s3CorruptPath}`;
    expect(ae.invalid).to.be.undefined;
    return processor.work(ae).then(success => {
      expect(success).to.be.false;

      let file = getUploadedFile();
      expect(file.downloaded).to.equal(true);
      expect(file.detected).to.equal(false);
      expect(file.processed).to.equal(false);
      expect(file.error).to.match(/bad mp3 file: unidentified bytes/i);
      expect(file.localPath).not.to.be.null;
      expect(helper.gone(file.localPath)).to.equal(true);
    });
  });

  it('catches non-downloadable upload urls', function() {
    ae.body.uploadPath = `https://s3.amazonaws.com/foo/bar/nothing.jpg`;
    expect(ae.invalid).to.be.undefined;
    return processor.work(ae).then(success => {
      expect(success).to.be.false;

      let file = getUploadedFile();
      expect(file.downloaded).to.equal(false);
      expect(file.detected).to.equal(false);
      expect(file.processed).to.equal(false);
      expect(file.error).to.match(/got 403 for url:/i);
      expect(file.localPath).to.be.null;
      expect(logs.warn.length).to.equal(1);
      expect(logs.warn[0]).to.match(/got 403 for url:/i);
    });
  });

  it('throws 503 download errors', function() {
    nock('http://foo.bar').get('/fivehundred.mp3').reply(503);
    ae.body.uploadPath = `http://foo.bar/fivehundred.mp3`;
    expect(ae.invalid).to.be.undefined;
    return processor.work(ae).then(
      (success) => { throw new Error('should have gotten an error'); },
      (err) => {
        expect(err.message).to.match(/got 503 for/i);

        let file = getUploadedFile();
        expect(file.downloaded).to.equal(false);
        expect(file.detected).to.equal(false);
        expect(file.processed).to.equal(false);
        expect(file.error).to.match(/got 503 for url:/i);
        expect(file.localPath).to.be.null;
      }
    );
  });

  it('throws upload errors', function() {
    sinon.stub(processor, 'uploadAndCopy').returns(Q.reject(new Error('upload-err')));
    return processor.work(ae).then(
      (success) => { throw 'should have gotten an error'; },
      (err) => {
        processor.uploadAndCopy.restore();
        expect(err.message).to.match(/upload-err/i);

        let file = getUploadedFile();
        expect(file.downloaded).to.equal(true);
        expect(file.detected).to.equal(false);
        expect(file.processed).to.equal(false);
        expect(file.error).to.match(/upload-err/i);
        expect(file.localPath).not.to.be.null;
        expect(helper.gone(file.localPath)).to.equal(true);
      }
    );
  });

  it('throws sqs errors', function() {
    this.timeout(5000);
    UploadedFile.prototype.callback.restore();
    sinon.stub(UploadedFile.prototype, 'callback').returns(Q.reject(new Error('sqs-err')));
    return processor.work(ae).then(
      (success) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/sqs-err/i);

        // sqs errors actually happen twice - once on the initial send, and a
        // second time when trying to report the first sqs error
        expect(UploadedFile.prototype.callback.callCount).to.equal(2);
        let f1 = UploadedFile.prototype.callback.thisValues[0];
        let f2 = UploadedFile.prototype.callback.thisValues[1];
        expect(f1).to.equal(f2);
        expect(f1.error).to.match(/sqs-err/i);
      }
    );
  });

});
