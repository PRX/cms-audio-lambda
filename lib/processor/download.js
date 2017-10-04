'use strict';

const url = require('url');
const path = require('path');
const fs = require('fs');
const Q = require('q');
const uuidv4 = require('uuid/v4');
const http = require('follow-redirects').http;
const https = require('follow-redirects').https;
const s3 = new (require('aws-sdk')).S3();

// get a remote file source
module.exports = (uploadUrl) => {
  let fileName = path.basename(url.parse(uploadUrl || 'unknown').pathname);
  let tmpPath = '/tmp/' + uuidv4();
  let writeStream = fs.createWriteStream(tmpPath)
  let result = {name: fileName, localPath: tmpPath};

  return Q.Promise((resolve, reject) => {
    const rejectNoRetry = err => {
      err.noRetry = true;
      reject(err);
    }

    writeStream.on('error', err => reject(err));
    writeStream.on('close', () => {
      if (result.contentLength && +result.contentLength !== writeStream.bytesWritten) {
        reject(new Error(`Expected ${result.contentLength} bytes from ${uploadUrl} - got ${writeStream.bytesWritten}`));
      } else {
        resolve(result);
      }
    });

    if (!uploadUrl) {
      rejectNoRetry(new Error('No url set for event'));
    } else if (uploadUrl.startsWith('s3://')) {
      let m = uploadUrl.match(/s3:\/\/([^\/]+)\/(.*)/);
      result.s3Bucket = m[1];
      result.s3Key = m[2];
      s3.getObject({Bucket: result.s3Bucket, Key: result.s3Key})
        .createReadStream()
        .on('error', err => rejectNoRetry(err))
        .pipe(writeStream);
    } else if (uploadUrl.match(/^https?:\/\//)) {
      (uploadUrl.match(/^https/) ? https : http).get(uploadUrl, resp => {
        if (resp.statusCode !== 200) {
          let err = new Error(`Got ${resp.statusCode} for url: ${uploadUrl}`);
          if ([500, 502, 503, 504].indexOf(resp.statusCode) > -1) {
            reject(err);
          } else {
            rejectNoRetry(err);
          }
        } else {
          result.contentType = resp.headers['content-type'];
          result.contentLength = resp.headers['content-length'];
          resp.pipe(writeStream);
        }
      }).on('error', err => rejectNoRetry(err));
    } else {
      rejectNoRetry(new Error(`Unrecognized url format: ${uploadUrl}`));
    }
  });
}
