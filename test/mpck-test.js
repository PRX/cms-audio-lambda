'use strict';

const helper = require('./support/test-helper');
const mpck = require('../lib/mpck');

describe('mpck', () => {

  it('returns mp3 metadata', async () => {
    const meta = await mpck(helper.readPath('test.mp3'));
    expect(meta.size).to.equal(12582);
    expect(meta.result.ok).to.be.true;
    expect(meta.result.formattedError).to.be.undefined;
    expect(meta.MPEG.layer).to.equal(3);
    expect(meta.MPEG.stereo).to.be.true;
    expect(meta.MPEG.vbr).to.be.undefined;
    expect(meta.MPEG.bitrate).to.equal(96000);
    expect(meta.MPEG.samplerate).to.equal(44100);
    expect(meta.MPEG.samples).to.equal(1152);
    expect(meta.MPEG.frames).to.equal(40);
  });

  it('detects variable bitrate mp3s', async () => {
    const meta = await mpck(helper.readPath('withpng.mp3'));
    expect(meta.size).to.equal(9695);
    expect(meta.result.ok).to.be.true;
    expect(meta.result.formattedError).to.be.undefined;
    expect(meta.MPEG.layer).to.equal(3);
    expect(meta.MPEG.stereo).to.be.true;
    expect(meta.MPEG.vbr).to.be.true;
    expect(meta.MPEG.bitrate).to.equal(63776);
    expect(meta.MPEG.samplerate).to.equal(44100);
    expect(meta.MPEG.samples).to.equal(1152);
    expect(meta.MPEG.frames).to.equal(41);
  });

  it('returns mp2 metadata', async () => {
    const meta = await mpck(helper.readPath('test.mp2'));
    expect(meta.size).to.equal(90180);
    expect(meta.result.ok).to.be.true;
    expect(meta.result.formattedError).to.be.undefined;
    expect(meta.MPEG.layer).to.equal(2);
    expect(meta.MPEG.stereo).to.be.undefined;
    expect(meta.MPEG.vbr).to.be.undefined;
    expect(meta.MPEG.bitrate).to.equal(256000);
    expect(meta.MPEG.samplerate).to.equal(44100);
    expect(meta.MPEG.samples).to.equal(1152);
    expect(meta.MPEG.frames).to.equal(108);
  });

  it('returns errors for mp4 files', async () => {
    const meta = await mpck(helper.readPath('test.mp4'));
    expect(meta.size).to.equal(383631);
    expect(meta.result.ok).to.be.undefined;
    expect(meta.result.formattedError).not.to.be.undefined;
    expect(meta.result.formattedError).to.match(/unidentified bytes/);
    expect(meta.result.formattedError).to.match(/inconsistent frame headers/);
    expect(meta.result.formattedError).to.match(/invalid header values/);
    expect(meta.result.formattedError).to.match(/CRC error/);
    expect(meta.result.formattedError).to.match(/not enough frames found/);
  });

  it('returns errors for non-audio files', async () => {
    const meta = await mpck(helper.readPath('png.mp3'));
    expect(meta.size).to.equal(8551);
    expect(meta.result.ok).to.be.undefined;
    expect(meta.result.formattedError).not.to.be.undefined;
    expect(meta.result.formattedError).to.match(/invalid header values/);
    expect(meta.result.formattedError).to.match(/not enough frames found/);
  });

  it('detects corrupt audio files', async () => {
    const meta = await mpck(helper.readPath('corrupt.mp3'));
    expect(meta.size).to.equal(52720);
    expect(meta.result.ok).to.be.undefined;
    expect(meta.result.formattedError).not.to.be.undefined;
    expect(meta.result.formattedError).to.match(/not enough frames found/);
  });

  it('rejects non-existent files', async () => {
    let err = null;
    try {
      await mpck(helper.readPath('doesnotexist.mp3'));
    } catch (e) {
      err = e;
    }
    if (err) {
      expect(err.message).to.match(/no such file or directory/i);
    } else {
      expect.fail('should have thrown an error');
    }
  });

  it('rejects mpck errors', async () => {
    const path = process.env.MPCK_PATH;
    let err = null;
    try {
      process.env.MPCK_PATH = '/usr/bin/does/not/exist/mpck';
      await mpck(helper.readPath('test.mp3'));
    } catch (e) {
      err = e;
    }
    process.env.MPCK_PATH = path || '';
    if (err) {
      expect(err.message).to.match(/no such file or directory/i);
    } else {
      expect.fail('should have thrown an error');
    }
  });

});
