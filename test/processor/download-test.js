'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');

describe('processor-download', () => {

  let s3Path = helper.putS3TestFile('test.mp3');

  it('downloads files from s3', () => {
    let url = `s3://${s3Path}`;
    return processor.download(url).then(data => {
      expect(data.name).to.equal('test.mp3');
      expect(data.localPath).to.equal('/tmp/test.mp3');
      expect(data.contentType).to.be.undefined; // TODO: get this from s3 stream
      expect(helper.readSize(data.localPath)).to.equal(12582);
    });
  });

  it('downloads a file via http', () => {
    let url = `https://s3.amazonaws.com/${s3Path}`;
    return processor.download(url).then(data => {
      expect(data.name).to.equal('test.mp3');
      expect(data.localPath).to.equal('/tmp/test.mp3');
      expect(data.contentType).to.equal('audio/mp3');
      expect(helper.readSize(data.localPath)).to.equal(12582);
    });
  });

  it('handles s3 errors', () => {
    let url = 's3://foo/bar.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/access denied/i);
      }
    );
  });

  it('handles http 404 errors', () => {
    let url = 'http://google.com/nothing.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/got 404 for/i);
      }
    );
  });

  it('handles http host errors', () => {
    let url = 'http://foo.bar.gov/nothing.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/ENOTFOUND/i);
      }
    );
  });

  it('handles s3 not found errors', () => {
    let url = `s3://${s3Path}/doesnotexist`;
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/key does not exist/i);
      }
    );
  });

  it('does not recognize other formats', () => {
    let url = `foobar://${s3Path}`;
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unrecognized url format/i);
      }
    );
  });

});
