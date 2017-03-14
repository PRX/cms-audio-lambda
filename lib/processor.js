'use strict';

const url = require('url');
const path = require('path');
const fs = require('fs');
const Q = require('q');
const http = require('follow-redirects').http;
const https = require('follow-redirects').https;
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

// upload mp3 and make copies as needed
exports.uploadAndCopy = (file) => {
  let dest = `${file.path}/${file.name}`;
  let type = file.mimeType();

  let uploadOriginal;
  if (file.s3Bucket && file.s3Key) {
    uploadOriginal = this.copy(file.s3Bucket, file.s3Key, dest, type);
  } else {
    uploadOriginal = this.upload(file.localPath, dest, type);
  }

  let fileParts = path.parse(file.name);
  let fileCopies = COPY_VARIATIONS.map(vary => {
    return `${fileParts.name}_${vary}${fileParts.ext}`;
  });

  return uploadOriginal.then(data => {
    let makeCopies = fileCopies.map(name => {
      this.copy(data.Bucket, data.Key, `${file.path}/${name}`, type);
    });
    return Q.all(makeCopies).then(() => [file.name].concat(fileCopies));
  });
};

// upload from local to s3
exports.upload = (localPath, destKey, contentType) => {
  return Q.ninvoke(s3, 'upload', {
    Body: fs.createReadStream(localPath),
    Bucket: process.env.DESTINATION_BUCKET,
    Key: destKey,
    ContentType: contentType
  })
}

// copy between s3 locations
exports.copy = (fromBucket, fromKey, destKey, contentType) => {
  return Q.ninvoke(s3, 'copyObject', {
    CopySource: `${fromBucket}/${fromKey}`,
    Bucket: process.env.DESTINATION_BUCKET,
    Key: destKey,
    MetadataDirective: 'REPLACE',
    ContentType: contentType
  }).then(() => {
    return {Bucket: process.env.DESTINATION_BUCKET, Key: destKey};
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
  let writeStream = fs.createWriteStream(`/tmp/${fileName}`)
  let result = {name: fileName, localPath: `/tmp/${fileName}`};

  return Q.Promise((resolve, _reject) => {
    let reject = err => { err.fromDownload = true; _reject(err) };
    writeStream.on('error', err => reject(err));
    writeStream.on('close', () => {
      if (result.contentLength && +result.contentLength !== writeStream.bytesWritten) {
        _reject(new Error(`Expected ${result.contentLength} bytes from ${uploadUrl} - got ${writeStream.bytesWritten}`));
      } else {
        resolve(result);
      }
    });

    if (!uploadUrl) {
      reject(new Error('No url set for event'));
    } else if (uploadUrl.startsWith('s3://')) {
      let m = uploadUrl.match(/s3:\/\/([^\/]+)\/(.*)/);
      result.s3Bucket = m[1];
      result.s3Key = m[2];
      s3.getObject({Bucket: m[1], Key: m[2]})
        .createReadStream()
        .on('error', err => reject(err))
        .pipe(writeStream);
    } else if (uploadUrl.match(/^https?:\/\//)) {
      (uploadUrl.match(/^https/) ? https : http).get(uploadUrl, resp => {
        if (resp.statusCode !== 200) {
          reject(new Error(`Got ${resp.statusCode} for url: ${uploadUrl}`));
        } else {
          result.contentType = resp.headers['content-type'];
          result.contentLength = resp.headers['content-length'];
          resp.pipe(writeStream);
        }
      }).on('error', err => reject(err));
    } else {
      reject(new Error(`Unrecognized url format: ${uploadUrl}`));
    }
  });
}
