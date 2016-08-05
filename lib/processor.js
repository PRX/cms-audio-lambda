'use strict';

const url = require('url');
const path = require('path');
const fs = require('fs');
const Q = require('q');
const request = require('request');
const s3 = new (require('aws-sdk')).S3();
const ffmpeg = require('fluent-ffmpeg');
const UploadedFile = require('./uploaded-file');

const ALLOWED_CODECS = ['mp2', 'mp3'];
const COPY_VARIATIONS = ['broadcast'];

// do all the things
exports.work = (audioEvent) => {
  let file = new UploadedFile(audioEvent);

  // process file - catch most errors
  return exports.download(audioEvent.audioUploadPath).then(data => {
    file.setDownloaded(data);
    return exports.validate(file.localPath);
  }).then(info => {
    file.setValidated(info);
    return exports.upload(file.localPath, file.path, file.name);
  }).then(uploaded => {
    file.setProcessed(uploaded);
    return true; // success!
  }).catch(err => {
    if (err.fromDownload || err.fromValidate) {
      return false; // non-fatal errors
    }
    throw err;
  }).finally(() => {
    return file.callback();
  });
}

// upload to final s3 destination
exports.upload = (localPath, filePath, fileName) => {
  let localStream = fs.createReadStream(localPath);
  let fileParts = path.parse(fileName);
  let fileCopies = COPY_VARIATIONS.map(vary => {
    return `${fileParts.name}_${vary}${fileParts.ext}`;
  });

  // first upload the original file
  return Q.ninvoke(s3, 'upload', {
    Body: localStream,
    Bucket: process.env.DESTINATION_BUCKET,
    Key: `${filePath}/${fileName}`
  }).then(data => {
    let makeCopies = fileCopies.map(copyName => {
      return Q.ninvoke(s3, 'copyObject', {
        CopySource: `${data.Bucket}/${data.Key}`,
        Bucket: process.env.DESTINATION_BUCKET,
        Key: `${filePath}/${copyName}`
      });
    });
    return Q.all(makeCopies).then(() => {
      return [fileName].concat(fileCopies);
    });
  });
}

// identify and validate a file
exports.validate = (filePath) => {
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

// get a remote file source
exports.download = (uploadUrl) => {
  let fileName = path.basename(url.parse(uploadUrl || 'unknown').pathname);

  let getRemoteFile;
  if (!uploadUrl) {
    getRemoteFile = Q.reject(new Error('No url set for event'));
  } else if (uploadUrl.startsWith('s3://')) {
    let m = uploadUrl.match(/s3:\/\/([^\/]+)\/(.*)/);
    let params = {Bucket: m[1], Key: m[2]};
    getRemoteFile = Q.ninvoke(s3, 'getObject', params).then(data => data.Body);
  } else if (uploadUrl.match(/^https?:\/\//)) {
    let params = {url: uploadUrl, encoding: null};
    getRemoteFile = Q.ninvoke(request, 'get', params).then(resps => {
      if (resps[0].statusCode === 200) {
        return resps[1];
      } else {
        throw new Error(`Got ${resps[0].statusCode} for url: ${uploadUrl}`);
      }
    });
  } else {
    getRemoteFile = Q.reject(new Error(`Unrecognized url format: ${uploadUrl}`));
  }

  return getRemoteFile.then(
    (fileBuffer) => {
      let data = {name: fileName, localPath: `/tmp/${fileName}`};
      return Q.ninvoke(fs, 'writeFile', data.localPath, fileBuffer).then(() => data);
    },
    (err) => {
      err.fromDownload = true;
      throw err;
    }
  );
}
