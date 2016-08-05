'use strict';

let match = process.env.SQS_CALLBACK.match(/sqs\.(.+)\.amazonaws\.com/);
const region = match && match[1];
const sqs = new (require('aws-sdk')).SQS({region: region});
const Q = require('q');

module.exports = class UploadedFile {

  constructor(audioEvent) {
    this.id = audioEvent.audioId;
    this.path = audioEvent.audioDestinationPath;
    this.name = null;    // file name

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

    // state
    this.downloaded = false;
    this.valid = false;
    this.processed = false;
  }

  setDownloaded(downloadData) {
    if (downloadData) {
      this.name = downloadData.name;
      this.localPath = downloadData.localPath;
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
      processed: this.processed
    });
  }

  callback() {
    return Q.ninvoke(sqs, 'sendMessage', {
      MessageBody: this.toJSON(),
      QueueUrl: process.env.SQS_CALLBACK
    });
  }

}