'use strict';

const helper = require('./support/test-helper');
const UploadedFile = require('../lib/uploaded-file');
const mimeType = (format, type) => {
  let file = new UploadedFile({});
  file.format = format;
  file.contentType = type;
  return file.mimeType();
}

describe('uploaded-file', () => {

  it('parses audio event data', () => {
    let file = new UploadedFile({audioId: 1234, audioDestinationPath: 'foo/bar', name: 'wontwork'});
    expect(file.id).to.equal(1234);
    expect(file.path).to.equal('foo/bar');
    expect(file.name).to.be.null;
  });

  it('sets download', () => {
    let file = new UploadedFile({});
    expect(file.downloaded).to.equal(false);
    file.setDownloaded();
    expect(file.downloaded).to.equal(false);
    file.setDownloaded({name: 'foo.bar', localPath: 'something'});
    expect(file.downloaded).to.equal(true);
    expect(file.name).to.equal('foo.bar');
    expect(file.localPath).to.equal('something');
  });

  it('sets validated', () => {
    let file = new UploadedFile({});
    expect(file.valid).to.equal(false);
    file.setValidated();
    expect(file.valid).to.equal(false);
    file.setValidated({duration: 1, size: 2, format: 'mp3'});
    expect(file.valid).to.equal(true);
    expect(file.duration).to.equal(1);
    expect(file.size).to.equal(2);
    expect(file.format).to.equal('mp3');
  });

  it('sets processed', () => {
    let file = new UploadedFile({});
    expect(file.processed).to.equal(false);
    file.setProcessed();
    expect(file.processed).to.equal(false);
    file.setProcessed(true);
    expect(file.processed).to.equal(true);
  });

  it('serializes to json', () => {
    let file = new UploadedFile({audioId: 1234, audioType: 'foo', audioDestinationPath: 'foo/bar'});
    file.setDownloaded({name: 'foo.bar'});
    file.setValidated();
    let json = JSON.parse(file.toJSON());
    expect(json).to.have.keys('id', 'path', 'name', 'duration', 'size', 'format',
      'bitrate', 'frequency', 'channels', 'layout', 'downloaded', 'valid', 'processed');
    expect(json.id).to.equal(1234);
    expect(json.path).to.equal('foo/bar');
  });

  it('gets translated mimetype from file format', () => {
    expect(mimeType('foo')).to.equal('audio/foo');
    expect(mimeType('mp1')).to.equal('audio/mpeg');
    expect(mimeType('mp2')).to.equal('audio/mpeg');
    expect(mimeType('mp3')).to.equal('audio/mpeg');
    expect(mimeType('mpg')).to.equal('audio/mpeg');
    expect(mimeType('mpeg')).to.equal('audio/mpeg');
    expect(mimeType('mp4')).to.equal('audio/mp4');
    expect(mimeType('m4a')).to.equal('audio/mp4');
  });

  it('falls back to the mimetype from the downloaded file', () => {
    expect(mimeType(null, 'foo/bar')).to.equal('foo/bar');
    expect(mimeType(null, 'any/thing')).to.equal('any/thing');
    expect(mimeType(null, null)).to.equal(undefined);
  });

  describe('with an sqs queue', () => {

    beforeEach(() => helper.fetchSQS());
    afterEach(() => helper.fetchSQS());

    const retryFetchSQS = (id, attemptsLeft) => {
      return helper.fetchSQS().then(messages => {
        if (attemptsLeft === 0 || messages.find(m => m.id === id)) {
          return messages;
        } else {
          return retryFetchSQS(id, attemptsLeft - 1);
        }
      });
    }

    it('calls back to sqs', function() {
      this.timeout(5000);

      let file = new UploadedFile({audioId: 'my-id-here', audioDestinationPath: 'foo/bar'});
      file.setDownloaded();
      return file.callback().then(() => retryFetchSQS('my-id-here', 3)).then(messages => {
        let msg = messages.find(m => m.id === 'my-id-here');
        expect(msg).to.exist;
        expect(msg.path).to.equal('foo/bar');
        expect(msg.downloaded).to.equal(false);
      });
    });

  });

});
