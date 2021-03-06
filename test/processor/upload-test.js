'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');

describe('processor-upload', () => {

  const TEST_PATH = 'public/test_audios/1234';

  let s3Path = helper.putS3TestFile('test.mp3');

  beforeEach(() => {
    return helper.listS3Path(TEST_PATH, 0).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  afterEach(() => {
    return helper.listS3Path(TEST_PATH, 0).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('uploads 2 copies of a file to s3', function() {
    this.timeout(4000);

    let file = {
      name: 'test.mp3',
      mimeType: () => 'audio/mpeg',
      localPath: helper.readPath('test.mp3'),
      path: TEST_PATH,
      s3Bucket: null,
      s3Key: null
    };
    return processor.uploadAndCopy(file).then(names => {
      expect(names.length).to.equal(2);
      expect(names[0]).to.equal('test.mp3');
      expect(names[1]).to.equal('test_broadcast.mp3');

      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.equal(2);
        expect(keys).to.include(`${TEST_PATH}/test.mp3`);
        expect(keys).to.include(`${TEST_PATH}/test_broadcast.mp3`);

        return helper.getContentTypes(keys).then(types => {
          expect(types).to.have.members(['audio/mpeg']);
        });
      });
    });
  });

  it('uploads lowercased .mp3 extensions for broadcast versions', function() {
    this.timeout(4000);

    let file = {
      name: 'test.MP3',
      mimeType: () => 'audio/mpeg',
      localPath: helper.readPath('test.mp3'),
      path: TEST_PATH,
      s3Bucket: null,
      s3Key: null
    };
    return processor.uploadAndCopy(file).then(names => {
      expect(names.length).to.equal(2);
      expect(names[0]).to.equal('test.MP3');
      expect(names[1]).to.equal('test_broadcast.mp3');

      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.equal(2);
        expect(keys).to.include(`${TEST_PATH}/test.MP3`);
        expect(keys).to.include(`${TEST_PATH}/test_broadcast.mp3`);
      });
    });
  });

  it('copies originals directly from s3', function() {
    this.timeout(4000);
    let file = {
      name: 'test.mp3',
      mimeType: () => 'audio/something',
      localPath: helper.readPath('test.mp3'),
      path: TEST_PATH,
      s3Bucket: process.env.TEST_BUCKET,
      s3Key: `${process.env.TEST_FOLDER}/test.mp3`
    };
    return processor.uploadAndCopy(file).then(names => {
      expect(names.length).to.equal(2);
      expect(names[0]).to.equal('test.mp3');
      expect(names[1]).to.equal('test_broadcast.mp3');

      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.equal(2);
        expect(keys).to.include(`${TEST_PATH}/test.mp3`);
        expect(keys).to.include(`${TEST_PATH}/test_broadcast.mp3`);

        return helper.getContentTypes(keys).then(types => {
          expect(types).to.have.members(['audio/something']);
        });
      });
    });
  });

});
