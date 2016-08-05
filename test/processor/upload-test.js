'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');

describe('processor-upload', () => {

  const TEST_PATH = 'public/test_audios/1234';

  before(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  after(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('uploads 2 copies of a file to s3', function() {
    this.timeout(4000);

    let file = helper.readPath('test.mp3');
    return processor.upload(file, TEST_PATH, 'output-file.okay.mp3').then(names => {
      expect(names.length).to.equal(2);
      expect(names[0]).to.equal('output-file.okay.mp3');
      expect(names[1]).to.equal('output-file.okay_broadcast.mp3');

      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.equal(2);
        expect(keys).to.include(`${TEST_PATH}/output-file.okay.mp3`);
        expect(keys).to.include(`${TEST_PATH}/output-file.okay_broadcast.mp3`);
      });
    });
  });

});
