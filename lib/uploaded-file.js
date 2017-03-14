'use strict';

let match = process.env.SQS_CALLBACK.match(/sqs\.(.+)\.amazonaws\.com/);
const region = match && match[1];
const sqs = new (require('aws-sdk')).SQS({region: region});
const Q = require('q');

module.exports = class UploadedFile {

  constructor(audioEvent) {
    this.id = audioEvent.audioId;
    this.path = audioEvent.audioDestinationPath;
    this.name = null;        // file name
    this.contentType = null; // downloaded content type

    // audio metadata
    this.duration  = null; // in seconds, ROUNDED UP
    this.size      = null; // in bytes
    this.format    = null; // codec name
    this.bitrate   = null; // 64/128/256
    this.frequency = null; // float 44.10 / 48.00 / etc
    this.channels  = null; // number of channels
    this.layout    = null; // mono/stereo/etc

    // ffprobe doesn't quite work on streams, so write to tmp disk
    this.localPath = null;

    // keep track of s3 origin so we can direct copy
    this.s3Bucket = null;
    this.s3Key = null;

    // state
    this.downloaded = false;
    this.valid = false;
    this.processed = false;
    this.error = null;
  }

  setDownloaded(downloadData) {
    if (downloadData) {
      this.name = downloadData.name;
      this.contentType = downloadData.contentType;
      this.localPath = downloadData.localPath;
      this.s3Bucket = downloadData.s3Bucket;
      this.s3Key = downloadData.s3Key;
      this.downloaded = true;
    } else {
      this.downloaded = false;
    }
  }

  setValidated(validData) {
    if (validData) {
      for (let k of Object.keys(validData)) {
        if (this.hasOwnProperty(k)) {
          this[k] = validData[k];
        }
      }
      this.valid = true;
    } else {
      this.valid = false;
    }
  }

  setProcessed(processedSuccess) {
    if (processedSuccess) {
      this.processed = true;
    } else {
      this.processed = false;
    }
  }

  setError(err) {
    this.error = err ? err.message : null;
  }

  toJSON() {
    return JSON.stringify({
      id: this.id,
      path: this.path,
      name: this.name,
      duration: this.duration,
      size: this.size,
      format: this.format,
      bitrate: this.bitrate,
      frequency: this.frequency,
      channels: this.channels,
      layout: this.layout,
      downloaded: this.downloaded,
      valid: this.valid,
      processed: this.processed,
      error: this.error
    });
  }

  mimeType() {
    if (['mp1', 'mp2', 'mp3', 'mpg', 'mpeg'].indexOf(this.format) > -1) {
      return 'audio/mpeg';
    } else if (['mp4', 'm4a'].indexOf(this.format) > -1) {
      return 'audio/mp4';
    } else if (this.format) {
      return `audio/${this.format}`;
    } else if (this.contentType) {
      return this.contentType; // fallback: trust downloaded content type
    } else {
      return undefined;
    }
  }

  callback() {
    return Q.ninvoke(sqs, 'sendMessage', {
      MessageBody: this.toJSON(),
      QueueUrl: process.env.SQS_CALLBACK
    });
  }

}
