'use strict';

const Q = require('q');
const ffmpeg = require('fluent-ffmpeg');

// identify and validate a file
module.exports = (filePath) => {
  return Q.ninvoke(ffmpeg(filePath), 'ffprobe').then(
    info => {
      let meta = {size: info.format.size};
      let audioStream = info.streams.find(s => s.codec_type === 'audio');
      let videoStream = info.streams.find(s => s.codec_type === 'video' && s.duration > 0);

      // reject files with no audio or video streams
      if (!audioStream && !videoStream) {
        let err = new Error('Unrecognized file');
        err.fromValidate = true;
        throw err;
      }

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
