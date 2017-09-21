'use strict';

const Q = require('q');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// non-fatal ffprobe errors
const KNOWN_ERRORS = [
  /invalid data found/i,
  /invalid argument/i,
  /misdetection possible/i
];

// identify and validate a file
module.exports = (filePath, ffprobePromise) => {
  if (ffprobePromise === undefined) {
    ffprobePromise = Q.ninvoke(ffmpeg(filePath), 'ffprobe');
  }

  return ffprobePromise.then(
    info => {
      let meta = {size: info.format.size, hasAudio: false, hasVideo: false};
      let audioStream = info.streams.find(s => s.codec_type === 'audio');
      let videoStream = info.streams.find(s => s.codec_type === 'video' && s.duration > 0);

      // audio stream info
      if (audioStream) {
        meta.hasAudio = true;
        meta.duration = Math.ceil(audioStream.duration);
        meta.durationMs = Math.ceil(audioStream.duration * 1000);
        meta.size = info.format.size;
        meta.format = audioStream.codec_name;
        meta.bitrate = audioStream.bit_rate;
        meta.frequency = audioStream.sample_rate;
        meta.channels = audioStream.channels;
        meta.layout = audioStream.channel_layout;
      }

      // video stream info
      if (videoStream) {
        meta.hasVideo = true;
        meta.videoFormat = videoStream.codec_name;
      }
      return meta;
    },
    err => {
      if (err.message && KNOWN_ERRORS.some(r => r.test(err.message))) {
        return Q.ninvoke(fs, 'stat', filePath).then(stat => {
          return {size: stat.size, hasAudio: false, hasVideo: false};
        });
      } else {
        err.noRetry = true;
        throw err;
      }
    }
  );
}
