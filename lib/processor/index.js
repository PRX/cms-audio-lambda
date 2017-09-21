'use strict';

const UploadedFile = require('../uploaded-file');

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
    return exports.validate(file.localPath);
  }).then(info => {
    file.setValidated(info);
    return exports.uploadAndCopy(file);
  }).then(uploaded => {
    file.setProcessed(uploaded);
    return true; // success!
  }).catch(err => {
    if (err.fromDownload || err.fromValidate) {
      file.setError(err);
      return false;
    }
    throw err; // will be retried by SNS
  }).finally(() => {
    return file.callback();
  });
}
