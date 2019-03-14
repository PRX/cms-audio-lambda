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

    // file detection metadata
    this.size = null;
    this.audio = null;
    this.video = null;

    // ffprobe doesn't quite work on streams, so write to tmp disk
    this.localPath = null;

    // keep track of s3 origin so we can direct copy
    this.s3Bucket = null;
    this.s3Key = null;

    // state
    this.downloaded = false;
    this.detected = false;
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

  setDetected(detectData) {
    if (detectData) {
      this.size = detectData.size;
      if (detectData.audio) {
        this.audio = JSON.parse(JSON.stringify(detectData.audio));
      }
      if (detectData.video) {
        this.video = JSON.parse(JSON.stringify(detectData.video));
      }
    }
    this.detected = (this.audio || this.video) ? true : false;
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
      // status
      downloaded: this.downloaded,
      detected: this.detected,
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
