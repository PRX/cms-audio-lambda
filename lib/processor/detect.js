'use strict';

const ffprobe = require('../ffprobe');
const mpck = require('../mpck');

// identify a file
module.exports = async (path) => {
  const meta = await ffprobe(path);

  // additional frame-by-frame checks for mp3 files
  if (meta.audio && meta.audio.format === 'mp3') {
    const check = await mpck(path);
    if (check.MPEG) {
      meta.audio.layer = check.MPEG.layer || null;
      meta.audio.vbr = check.MPEG.vbr || false;
      meta.audio.samples = check.MPEG.samples || null;
      meta.audio.frames = check.MPEG.frames || null;
    }
    if (check.result.formattedError) {
      meta.audio.error = check.result.formattedError;
    }
  }

  return meta;
}
