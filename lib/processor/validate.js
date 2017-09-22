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
      let meta = {size: info.format.size};
      let audioStream = info.streams.find(s => s.codec_type === 'audio');
      let videoStream = info.streams.find(s => s.codec_type === 'video' && s.duration > 0);

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

      // DEPRECATED audio stream info
      if (audioStream) {
        meta.deprecated = {
          duration:  Math.ceil(audioStream.duration),
          format:    audioStream.codec_name,
          bitrate:   audioStream.bit_rate,
          frequency: audioStream.sample_rate,
          channels:  audioStream.channels,
          layout:    audioStream.channel_layout
        };
      }

      return meta;
    },
    err => {
      if (err.message && KNOWN_ERRORS.some(r => r.test(err.message))) {
        return Q.ninvoke(fs, 'stat', filePath).then(stat => {
          return {size: stat.size};
        });
      } else {
        err.noRetry = true;
        throw err;
      }
    }
  );
}
