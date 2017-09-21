'use strict';

const Q = require('q');
const ffmpeg = require('fluent-ffmpeg');
const ALLOWED_CODECS = ['mp2', 'mp3'];

// identify and validate a file
module.exports = (filePath) => {
  return Q.ninvoke(ffmpeg(filePath), 'ffprobe').then(
    info => {
      let audioStream = info.streams.find(s => s.codec_type === 'audio');

      // only audio AND mp2/mp3, for now
      if (!audioStream) {
        let err = new Error('Non-audio file');
        err.fromValidate = true;
        throw err;
      } else if (ALLOWED_CODECS.indexOf(audioStream.codec_name) < 0) {
        let err = new Error(`Codec not allowed: ${audioStream.codec_name}`);
        err.fromValidate = true;
        throw err;
      } else {
        return {
          duration: Math.ceil(audioStream.duration),
          size: info.format.size,
          format: audioStream.codec_name,
          bitrate: audioStream.bit_rate,
          frequency: audioStream.sample_rate,
          channels: audioStream.channels,
          layout: audioStream.channel_layout
        };
      }
    },
    err => {
      if (err.message.match(/invalid data found/i)) {
        err.fromValidate = true;
      } else if (err.message.match(/invalid argument/i)) {
        err.fromValidate = true;
      } else if (err.message.match(/misdetection possible/i)) {
        err.fromValidate = true;
      }
      throw err;
    }
  );
}
