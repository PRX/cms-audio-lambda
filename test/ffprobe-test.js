'use strict';

const helper = require('./support/test-helper');
const ffprobe = require('../lib/ffprobe');
const fluent = require('fluent-ffmpeg');

describe('ffprobe', () => {

  it('returns mp3 metadata', async () => {
    const meta = await ffprobe(helper.readPath('test.mp3'));
    expect(meta.size).to.equal(12582);
    expect(meta.audio.duration).to.equal(1019);
    expect(meta.audio.format).to.equal('mp3');
    expect(meta.audio.bitrate).to.equal(96000);
    expect(meta.audio.frequency).to.equal(44100);
    expect(meta.audio.channels).to.equal(1);
    expect(meta.audio.layout).to.equal('mono');
    expect(meta.video).to.be.undefined;
  });

  it('returns mp2 metadata', async () => {
    const meta = await ffprobe(helper.readPath('test.mp2'));
    expect(meta.size).to.equal(90180);
    expect(meta.audio.duration).to.equal(2818);
    expect(meta.audio.format).to.equal('mp2');
    expect(meta.audio.bitrate).to.equal(256000);
    expect(meta.audio.frequency).to.equal(44100);
    expect(meta.audio.channels).to.equal(2);
    expect(meta.audio.layout).to.equal('stereo');
    expect(meta.video).to.be.undefined;
  });

  it('returns mp4 metadata', async () => {
    const meta = await ffprobe(helper.readPath('test.mp4'));
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
    expect(meta.video.aspect).to.equal(null);
    expect(meta.video.framerate).to.equal('30/1');
  });

  it('detects non-audio binary files', async () => {
    const meta = await ffprobe(helper.readPath('png.mp3'));
    expect(meta.size).to.equal(8551);
    expect(meta.audio).to.be.undefined;
    expect(meta.video).to.be.undefined;
  });

  it('detects non-audio text files', async () => {
    const meta = await ffprobe(helper.readPath('created.json'));
    expect(meta.size).to.equal(1382);
    expect(meta.audio).to.be.undefined;
    expect(meta.video).to.be.undefined;
  });

  it('detects corrupt audio files', async () => {
    const meta = await ffprobe(helper.readPath('corrupt.mp3'));
    expect(meta.size).to.equal(52720);
    expect(meta.audio).to.be.undefined;
    expect(meta.video).to.be.undefined;
  });

  it('does not mistake album art as a video', async () => {
    const meta = await ffprobe(helper.readPath('withpng.mp3'));
    expect(meta.size).to.equal(9695);
    expect(meta.audio.duration).to.equal(1045);
    expect(meta.audio.format).to.equal('mp3');
    expect(meta.audio.bitrate).to.equal(64000);
    expect(meta.audio.frequency).to.equal(44100);
    expect(meta.audio.channels).to.equal(1);
    expect(meta.audio.layout).to.equal('mono');
    expect(meta.video).to.be.undefined;
  });

  it('rejects unknown ffprobe failures', async () => {
    const err = await expect(ffprobe('does/not/exist.mp3')).to.reject;
    expect(err).to.match(/no such file/i);
    expect(err.noRetry).to.be.true;
  });

});
