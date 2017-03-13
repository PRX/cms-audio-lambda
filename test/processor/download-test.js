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
      expect(data.contentType).to.equal('audio/mpeg');
      expect(helper.readSize(data.localPath)).to.equal(12582);
    });
  });

  it('handles missing download errors', () => {
    return processor.download(null).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/no url set/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('handles s3 errors', () => {
    let url = 's3://foo/bar.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/access denied/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('handles http 404 errors', () => {
    let url = 'http://google.com/nothing.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/got 404 for/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('handles http host errors', () => {
    let url = 'http://foo.bar.gov/nothing.jpg';
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/ENOTFOUND/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('handles s3 not found errors', () => {
    let url = `s3://${s3Path}/doesnotexist`;
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/key does not exist/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('does not recognize other formats', () => {
    let url = `foobar://${s3Path}`;
    return processor.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unrecognized url format/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('throws content-length mismatch errors', () => {
    nock('http://foo.bar').get('/mismatch.mp3').reply(200, '--mp3--', {'Content-Length': 11});
    return processor.download('http://foo.bar/mismatch.mp3').then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/expected 11 bytes/i);
        expect(err.message).to.match(/got 7/i);
        expect(err.fromDownload).to.be.falsey;
      }
    );
  });

  it('is okay with matching content-length', () => {
    nock('http://foo.bar').get('/okay.mp3').reply(200, '--mp3--', {'Content-Length': 7});
    return processor.download('http://foo.bar/okay.mp3').then(data => {
      expect(data.name).to.equal('okay.mp3');
      expect(data.localPath).to.equal('/tmp/okay.mp3');
      expect(data.contentType).to.be.undefined;
      expect(helper.readSize(data.localPath)).to.equal(7);
    });
  });

});
