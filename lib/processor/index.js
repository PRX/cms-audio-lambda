'use strict';

const UploadedFile = require('../uploaded-file');
const logger = require('../logger');

// aliases
exports.download = require('./download');
exports.validate = require('./validate');
exports.uploadAndCopy = require('./upload');

// do all the things
exports.work = (audioEvent) => {
  let file = new UploadedFile(audioEvent);

  // process file - catch most errors
  return exports.download(audioEvent.audioUploadPath).then(data => {
    file.setDownloaded(data);
    return Q.all([
      exports.validate(file.localPath),
      exports.uploadAndCopy(file)
    ]);
  }).then(results => {
    file.setValidated(results[0]);
    file.setProcessed(results[1]);
    return file.callback().then(() => true);
  }).catch(err => {
    if (err.noRetry) {
      logger.warn(err.message);
      file.setError(err);
      return file.callback().then(() => false);
    } else {
      throw err; // will be retried by SNS
    }
  });
}