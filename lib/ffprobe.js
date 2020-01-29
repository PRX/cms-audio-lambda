'use strict';

const util = require('util');
const stat = util.promisify(require('fs').stat);
const ffprobe = util.promisify(require('fluent-ffmpeg').ffprobe);

// non-fatal ffprobe errors
const KNOWN_ERRORS = [
  /invalid data found/i,
  /invalid argument/i,
  /misdetection possible/i
];

// wrapper around ffprobe
module.exports = async (path) => {
  let info;
  try {
    info = await ffprobe(path);
  } catch (err) {
    if (err.message && KNOWN_ERRORS.some(r => r.test(err.message))) {
      const size = (await stat(path)).size;
      info = {format: {size}, streams: []};
    } else {
      err.noRetry = true;
      throw err;
    }
  }

  // format metadata
  let meta = {size: info.format.size};
  let audioStream = info.streams.find(s => s.codec_type === 'audio');
  let videoStream = info.streams.find(s => {
    return s.codec_type === 'video' && s.duration > 0 && s.bit_rate > 0;
  });

  // audio stream info
  if (audioStream) {
    meta.audio = {
      duration:  Math.round(audioStream.duration * 1000),
      format:    audioStream.codec_name,
      bitrate:   audioStream.bit_rate,
      frequency: audioStream.sample_rate,
      channels:  audioStream.channels,
      layout:    audioStream.channel_layout
    };
  }

  // video stream info
  if (videoStream) {
    meta.video = {
      duration:  Math.round(videoStream.duration * 1000),
      format:    videoStream.codec_name,
      bitrate:   videoStream.bit_rate,
      width:     videoStream.width,
      height:    videoStream.height,
      aspect:    videoStream.display_aspect_ratio,
      framerate: videoStream.r_frame_rate
    };
  }

  // translate to nulls
  ['audio', 'video'].forEach(type => {
    Object.keys(meta[type] || {}).forEach(key => {
      const val = meta[type][key];
      if (val === 'N/A' || (key === 'aspect' && val === '0:1')) {
        meta[type][key] = null;
      }
    });
  });

  return meta;
}
