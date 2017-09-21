'use strict';

const Q = require('q');
const logger = require('./lib/logger');
const AudioEvent = require('./lib/audio-event');
const processor = require('./lib/processor');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    logger.error(`Invalid event input: ${JSON.stringify(event)}`);
    return callback(null); // don't retry
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

  // invalid is insanity, so log those errors and skip them
  if (invalids.length) {
    invalids.forEach(ae => logger.error(`Invalid record: ${ae.invalid}`));
  }

  // process valid records
  let processWork = processes.map(ae => processor.work(ae));
  let deleteWork = deletes.map(ae => Q('TODO'));
  Q.all(processWork.concat(deleteWork)).done(
    results => {
      logger.info(`Processed: ${processes.length}`);
      logger.info(`Deleted: ${deletes.length}`);
      logger.log(`Skipped: ${skips.length}`);
      callback(null, {
        invalid: invalids.length,
        processed: processes.length,
        deleted: deletes.length,
        skipped: skips.length
      });
    },
    err => {
      logger.error(err.message || `${err}`);
      callback(err);
    }
  );
}
