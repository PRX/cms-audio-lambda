'use strict';

const logger = require('./logger');

// interpret video mime types
exports.video = format => {
  if (['theora', 'dirac'].indexOf(format) > -1) {
    return 'video/ogg';
  } else if (['vp8', 'vp80'].indexOf(format) > -1) {
    return 'video/webm';
  } else if (['h264', 'mpeg4'].indexOf(format) > -1) {
    return 'video/mp4';
  } else if (['3gp', '3gpp'].indexOf(format) > -1) {
    return 'video/3gpp';
  } else if (format && format.match(/flv/)) {
    return 'video/x-flv';
  } else if (format && format.match(/mpeg/)) {
    return 'video/mpeg';
  } else if (format) {
    logger.warn(`Unknown mime video: ${format}`);
    return `video/${format}`;
  } else {
    return 'application/octet-stream';
  }
}

// interpret audio mime types
exports.audio = format => {
  if (['mp1', 'mp2', 'mp3', 'mpg', 'mpeg'].indexOf(format) > -1) {
    return 'audio/mpeg';
  } else if (['mp4', 'm4a'].indexOf(format) > -1) {
    return 'audio/mp4';
  } else if (format) {
    logger.warn(`Unknown mime audio: ${format}`);
    return `audio/${format}`;
  } else {
    return 'application/octet-stream';
  }
}
