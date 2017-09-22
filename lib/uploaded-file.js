'use strict';

let match = process.env.SQS_CALLBACK.match(/sqs\.(.+)\.amazonaws\.com/);
const region = match && match[1];
const sqs = new (require('aws-sdk')).SQS({region: region});
const Q = require('q');
const mimes = require('./mimes');

module.exports = class UploadedFile {

  constructor(audioEvent) {
    this.id = audioEvent.audioId;
    this.path = audioEvent.audioDestinationPath;
    this.name = null;        // file name
    this.contentType = null; // downloaded content type

    // validation metadata
    this.size = null;
    this.audio = null;
    this.video = null;

    // DEPRECATED metadata
    this.duration  = null; // in seconds, ROUNDED UP
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
      this.size = validData.size;
      if (validData.audio) {
        this.audio = JSON.parse(JSON.stringify(validData.audio));
      }
      if (validData.video) {
        this.video = JSON.parse(JSON.stringify(validData.video));
      }
      if (validData.deprecated) {
        for (let k of Object.keys(validData.deprecated)) {
          this[k] = validData.deprecated[k];
        }
      }
    }
    this.valid = (this.audio || this.video) ? true : false;
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
      mime: this.mimeType(),
      size: this.size,
      audio: this.audio,
      video: this.video,
      // DEPRECATED metadata
      duration: this.duration,
      format: this.format,
      bitrate: this.bitrate,
      frequency: this.frequency,
      channels: this.channels,
      layout: this.layout,
      // status
      downloaded: this.downloaded,
      valid: this.valid,
      processed: this.processed,
      error: this.error
    });
  }

  mimeType() {
    if (this.video) {
      return mimes.video(this.video.format);
    } else if (this.audio) {
      return mimes.audio(this.audio.format);
    } else {
      if (this.contentType) {
        return this.contentType; // fallback: trust downloaded content type
      } else {
        return 'application/octet-stream';
      }
    }
  }

  callback() {
    return Q.ninvoke(sqs, 'sendMessage', {
      MessageBody: this.toJSON(),
      QueueUrl: process.env.SQS_CALLBACK
    });
  }

}
