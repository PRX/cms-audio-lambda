'use strict';

const Q = require('q');
const AudioEvent = require('./lib/audio-event');
const processor = require('./lib/processor');

// TODO This is just a testing marker – 00001

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    return callback(new Error('Invalid event input: ' + JSON.stringify(event, null, 2)));
  }
  if (process.env.DEBUG) {
    console.log('Incoming:', JSON.stringify(event, null, 2));
  }

  // sort by task
  let invalids = [], processes = [], deletes = [], skips = [];
  event.Records.map(rec => new AudioEvent(rec)).forEach(ae => {
    if (ae.invalid) {
      invalids.push(ae);
    } else if (ae.doProcess) {
      processes.push(ae);
    } else if (ae.doDelete) {
      deletes.push(ae);
    } else {
      skips.push(ae);
    }
  });

  // invalid is insanity, so actually throw an error and abort
  if (invalids.length) {
    let invalidMsgs = invalids.map(ae => ae.invalid).join(', ');
    return callback(new Error(`Invalid records: ${invalidMsgs}`));
  }

  // process valid records
  let processWork = processes.map(ae => processor.work(ae));
  let deleteWork = deletes.map(ae => Q('TODO'));
  Q.all(processWork.concat(deleteWork)).done(
    results => {
      let out = {processed: processes.length, deleted: deletes.length, skipped: skips.length};
      if (process.env.DEBUG) {
        console.log('Out:', JSON.stringify(out));
      }
      callback(null, out);
    },
    err => callback(err)
  );
}
