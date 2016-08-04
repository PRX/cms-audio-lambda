'use strict';

const Q = require('q');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    return callback(new Error('Invalid event input: ' + JSON.stringify(event, null, 2)));
  }
  if (process.env.DEBUG) {
    console.log('Incoming:', JSON.stringify(event, null, 2));
  }

  // TODO: everything
  callback();
}
