'use strict';

const helper = require('../support/test-helper');
const detect = require('../../lib/processor/detect');

describe('processor-detect', () => {

  it('returns audio file metadata', async () => {
    const meta = await detect(helper.readPath('test.mp3'));
    expect(meta.size).to.equal(12582);
    expect(meta.audio.duration).to.equal(1019);
    expect(meta.audio.format).to.equal('mp3');
    expect(meta.audio.bitrate).to.equal(96000);
    expect(meta.audio.frequency).to.equal(44100);
    expect(meta.audio.channels).to.equal(1);
    expect(meta.audio.layout).to.equal('mono');
    expect(meta.audio.layer).to.equal(3);
    expect(meta.audio.vbr).to.equal(false);
    expect(meta.audio.samples).to.equal(1152);
    expect(meta.audio.frames).to.equal(40);
    expect(meta.audio.error).to.be.undefined;
    expect(meta.video).to.be.undefined;
  });

  it('detects corrupt audio files', async () => {
    const meta = await detect(helper.readPath('corrupt.mp3'));
    expect(meta.size).to.equal(52720);
    expect(meta.audio).to.be.undefined;
    expect(meta.video).to.be.undefined;
  });

  it('rejects an mp3 with corrupted frames', async () => {
    const err = await expect(detect(helper.readPath('corruptframes.mp3'))).to.reject;
    expect(err).to.match(/unidentified bytes/);
    expect(err.noRetry).to.be.true;
  });

  it('returns video file metadata', async () => {
    const meta = await detect(helper.readPath('test.mp4'));
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

});
