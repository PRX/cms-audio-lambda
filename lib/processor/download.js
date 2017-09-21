'use strict';

const url = require('url');
const path = require('path');
const fs = require('fs');
const Q = require('q');
const http = require('follow-redirects').http;
const https = require('follow-redirects').https;
const s3 = new (require('aws-sdk')).S3();

// get a remote file source
module.exports = (uploadUrl) => {
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
