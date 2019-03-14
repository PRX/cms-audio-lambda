'use strict';

const Q = require('q');
const fs = require('fs');
const UploadedFile = require('../uploaded-file');
const logger = require('../logger');

// aliases
exports.download = require('./download');
exports.detect = require('./detect');
exports.uploadAndCopy = require('./upload');

// do all the things
exports.work = (audioEvent) => {
  let file = new UploadedFile(audioEvent);

  // process file - catch most errors
  return exports.download(audioEvent.audioUploadPath).then(data => {
    file.setDownloaded(data);
    return Q.all([
      exports.detect(file.localPath).then(r => file.setDetected(r)),
      exports.uploadAndCopy(file).then(r => file.setProcessed(r))
    ]);
  }).then(() => {
    return file.callback().then(() => true);
  }).catch(err => {
    file.setError(err);
    if (err.noRetry) {
      logger.warn(`NoRetry ${err.message}`);
      return file.callback().then(() => false);
    } else {
      return file.callback().then(() => {
        throw err; // will be retried by SNS
      });
    }
  }).finally(() => {
    if (file.localPath) {
      return Q.ninvoke(fs, 'unlink', file.localPath).then(() => null, err => null);
    }
  });
}
