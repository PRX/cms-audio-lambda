'use strict';

const helper = require('./support/test-helper');
const UploadedFile = require('../lib/uploaded-file');
const mimeType = (overrides) => {
  let file = new UploadedFile({});
  Object.keys(overrides).forEach(k => file[k] = overrides[k]);
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
    expect(file.size).to.be.null;
    expect(file.audio).to.be.null;
    expect(file.video).to.be.null;
    file.setValidated();
    expect(file.valid).to.equal(false);
    expect(file.size).to.be.null;
    expect(file.audio).to.be.null;
    expect(file.video).to.be.null;
    file.setValidated({
      size: 2,
      audio: {foo: 'bar'},
      video: {bar: 'foo'},
      deprecated: {duration: 1, format: 'mp3', bitrate: 123}
    });
    expect(file.valid).to.equal(true);
    expect(file.size).to.equal(2);
    expect(file.audio.foo).to.equal('bar');
    expect(file.video.bar).to.equal('foo');
    // DEPRECATED
    expect(file.duration).to.equal(1);
    expect(file.format).to.equal('mp3');
    expect(file.bitrate).to.equal(123);
  });

  it('sets processed', () => {
    let file = new UploadedFile({});
    expect(file.processed).to.equal(false);
    file.setProcessed();
    expect(file.processed).to.equal(false);
    file.setProcessed(true);
    expect(file.processed).to.equal(true);
  });

  it('sets error messages', () => {
    let file = new UploadedFile({});
    expect(file.error).to.equal(null);
    file.setError();
    expect(file.error).to.equal(null);
    file.setError(new Error('Something went wrong'));
    expect(file.error).to.equal('Something went wrong');
  });

  it('serializes to json', () => {
    let file = new UploadedFile({audioId: 1234, audioType: 'foo', audioDestinationPath: 'foo/bar'});
    file.setDownloaded({name: 'foo.bar'});
    file.setValidated();
    let json = JSON.parse(file.toJSON());
    expect(json).to.have.keys(
      'id', 'path', 'name', 'size', 'audio', 'video',
      'downloaded', 'valid', 'processed', 'error',
      // DEPRECATED
      'duration', 'format', 'bitrate', 'frequency', 'channels', 'layout');
    expect(json.id).to.equal(1234);
    expect(json.path).to.equal('foo/bar');
  });

  describe('mimeType', () => {

    helper.spyLogger();

    it('translates audio formats', () => {
      expect(mimeType({audio: {}})).to.equal('application/octet-stream');
      expect(mimeType({audio: {format: 'foo'}})).to.equal('audio/foo');
      expect(mimeType({audio: {format: 'mp3'}})).to.equal('audio/mpeg');
    });

    it('translates video types', () => {
      expect(mimeType({video: {}})).to.equal('application/octet-stream');
      expect(mimeType({video: {format: 'foo'}})).to.equal('video/foo');
      expect(mimeType({video: {format: 'h264'}})).to.equal('video/mp4');
    });

    it('falls back with no audio/video', () => {
      expect(mimeType({})).to.equal('application/octet-stream');
      expect(mimeType({contentType: 'foo/bar'})).to.equal('foo/bar');
    });

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
