'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');

describe('processor-validate', () => {

  it('returns audio file metadata', () => {
    return processor.validate(helper.readPath('test.mp3')).then(meta => {
      expect(meta.duration).to.equal(2);
      expect(meta.size).to.equal(12582);
      expect(meta.format).to.equal('mp3');
      expect(meta.bitrate).to.equal(96000);
      expect(meta.frequency).to.equal(44100);
      expect(meta.channels).to.equal(1);
      expect(meta.layout).to.equal('mono');
    });
  });

  it('returns mp2 file metadata', () => {
    return processor.validate(helper.readPath('test.mp2')).then(meta => {
      expect(meta.duration).to.equal(3);
      expect(meta.size).to.equal(90180);
      expect(meta.format).to.equal('mp2');
      expect(meta.bitrate).to.equal(256000);
      expect(meta.frequency).to.equal(44100);
      expect(meta.channels).to.equal(2);
      expect(meta.layout).to.equal('stereo');
    });
  });

  it('rejects non-audio binary files', () => {
    return processor.validate(helper.readPath('png.mp3')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/non-audio file/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects non-audio text files', () => {
    return processor.validate(helper.readPath('created.json')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/invalid data found/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects corrupt audio files', () => {
    return processor.validate(helper.readPath('corrupt.mp3')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/failed to read frame size/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

});
