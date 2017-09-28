'use strict';

const helper = require('../support/test-helper');
const processor = require('../../lib/processor');

describe('processor-validate', () => {

  it('returns audio file metadata', () => {
    return processor.validate(helper.readPath('test.mp3')).then(meta => {
      expect(meta.size).to.equal(12582);
      expect(meta.audio.duration).to.equal(1019);
      expect(meta.audio.format).to.equal('mp3');
      expect(meta.audio.bitrate).to.equal(96000);
      expect(meta.audio.frequency).to.equal(44100);
      expect(meta.audio.channels).to.equal(1);
      expect(meta.audio.layout).to.equal('mono');
      expect(meta.video).to.be.undefined;
    });
  });

  it('returns deprecated metadata', () => {
    return processor.validate(helper.readPath('test.mp3')).then(meta => {
      expect(meta.deprecated.duration).to.equal(2);
      expect(meta.deprecated.format).to.equal('mp3');
      expect(meta.deprecated.bitrate).to.equal(96000);
      expect(meta.deprecated.frequency).to.equal(44100);
      expect(meta.deprecated.channels).to.equal(1);
      expect(meta.deprecated.layout).to.equal('mono');
    });
  });

  it('returns mp2 file metadata', () => {
    return processor.validate(helper.readPath('test.mp2')).then(meta => {
      expect(meta.size).to.equal(90180);
      expect(meta.audio.duration).to.equal(2818);
      expect(meta.audio.format).to.equal('mp2');
      expect(meta.audio.bitrate).to.equal(256000);
      expect(meta.audio.frequency).to.equal(44100);
      expect(meta.audio.channels).to.equal(2);
      expect(meta.audio.layout).to.equal('stereo');
      expect(meta.video).to.be.undefined;
    });
  });

  it('returns mp4 file metadata', () => {
    return processor.validate(helper.readPath('test.mp4')).then(meta => {
      expect(meta.size).to.equal(383631);
      expect(meta.audio.duration).to.equal(5568);
      expect(meta.audio.format).to.equal('aac');
      expect(meta.audio.bitrate).to.equal(83050);
      expect(meta.audio.frequency).to.equal(48000);
      expect(meta.audio.channels).to.equal(1);
      expect(meta.audio.layout).to.equal('mono');
      expect(meta.video.duration).to.equal(5533);
      expect(meta.video.format).to.equal('h264');
      expect(meta.video.bitrate).to.equal(465641);
      expect(meta.video.height).to.equal(320);
      expect(meta.video.width).to.equal(560);
      expect(meta.video.aspect).to.equal('0:1');
      expect(meta.video.framerate).to.equal('30/1');
    });
  });

  it('detects non-audio binary files', () => {
    return processor.validate(helper.readPath('png.mp3')).then(meta => {
      expect(meta.size).to.equal(8551);
      expect(meta.audio).to.be.undefined;
      expect(meta.video).to.be.undefined;
    });
  });

  it('detects non-audio text files', () => {
    return processor.validate(helper.readPath('created.json')).then(meta => {
      expect(meta.size).to.equal(1382);
      expect(meta.audio).to.be.undefined;
      expect(meta.video).to.be.undefined;
    });
  });

  it('detects corrupt audio files', () => {
    return processor.validate(helper.readPath('corrupt.mp3')).then(meta => {
      expect(meta.size).to.equal(52720);
      expect(meta.audio).to.be.undefined;
      expect(meta.video).to.be.undefined;
    });
  });

  it('does not mistake album art as a video', () => {
    return processor.validate(helper.readPath('withpng.mp3')).then(meta => {
      expect(meta.size).to.equal(9695);
      expect(meta.audio.duration).to.equal(1045);
      expect(meta.audio.format).to.equal('mp3');
      expect(meta.audio.bitrate).to.equal(64000);
      expect(meta.audio.frequency).to.equal(44100);
      expect(meta.audio.channels).to.equal(1);
      expect(meta.audio.layout).to.equal('mono');
      expect(meta.video).to.be.undefined;
    });
  });

  it('rejects unknown ffprobe failures', () => {
    let err = Q.reject(new Error('Some unknown error'));
    return processor.validate(helper.readPath('test.mp3'), err).then(
      (meta) => { throw new Error('should have gotten an error'); },
      (err) => {
        expect(err.message).to.match(/some unknown error/i);
        expect(err.noRetry).to.equal(true);
      }
    );
  });

});
