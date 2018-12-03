'use strict';

const path = require('path');
const fs = require('fs');
const Q = require('q');
const s3 = new (require('aws-sdk')).S3();
const COPY_VARIATIONS = ['broadcast'];

// upload mp3 and make copies as needed
module.exports = (file) => {
  let dest = `${file.path}/${file.name}`;
  let type = file.mimeType();

  let uploadOriginal;
  if (file.s3Bucket && file.s3Key) {
    uploadOriginal = s3Copy(file.s3Bucket, file.s3Key, dest, type);
  } else {
    uploadOriginal = localUpload(file.localPath, dest, type);
  }

  let fileParts = path.parse(file.name);

  // Ensure that the extension is lowercased so that it matches what CMS
  // AudioFileUploader expects as a version filename extension format.
  let extension = fileParts.ext.toLowerCase();

  let fileCopies = COPY_VARIATIONS.map(vary => {
    return `${fileParts.name}_${vary}${extension}`;
  });

  return uploadOriginal.then(data => {
    let makeCopies = fileCopies.map(name => {
      s3Copy(data.Bucket, data.Key, `${file.path}/${name}`, type);
    });
    return Q.all(makeCopies).then(() => [file.name].concat(fileCopies));
  });
};

// copy between s3 locations
const s3Copy = (fromBucket, fromKey, destKey, contentType) => {
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

// upload from local to s3
const localUpload = (localPath, destKey, contentType) => {
  return Q.ninvoke(s3, 'upload', {
    Body: fs.createReadStream(localPath),
    Bucket: process.env.DESTINATION_BUCKET,
    Key: destKey,
    ContentType: contentType
  })
}
