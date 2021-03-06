'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const parseString = util.promisify(require('xml2js').parseString);
const timeout = 10000;

// wrapper for mpck command
module.exports = async (path) => {
  const cmd = process.env.MPCK_PATH || 'mpck';

  let xml;
  try {
    const result = await exec(`${cmd} -x ${path}`, {timeout});
    if (result.stderr) {
      throw new Error(`mpck error: ${stderr}`);
    }
    if (!result.stdout || !result.stdout.startsWith('<file>')) {
      throw new Error(`mpck non-xml output`);
    }
    xml = result.stdout;
  } catch (err) {
    if (!err.stderr && err.stdout && err.stdout.startsWith('<file>')) {
      xml = err.stdout; // sometimes mpck returns 1
    } else {
      err.noRetry = true;
      throw err;
    }
  }

  // parse xml and clean it up a bit
  const json = await parseString(xml, {mergeAttrs: true});
  const file = flatten(json.file || {});
  if (file.result && file.result.errors) {
    file.result.formattedError = formatErrors(file.result.errors);
  }
  return file;
}

// flatten xml result
function flatten(obj, depth = 0) {
  if (depth >= 10) {
    return obj;
  } else if (Array.isArray(obj)) {
    if (obj.length === 1) {
      return flatten(obj[0], depth + 1);
    } else {
      return obj.map(o => flatten(o, depth + 1));
    }
  } else if (obj instanceof Object) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = flatten(obj[key], depth + 1);
      return acc;
    }, {});
  } else if (obj === '') {
    return true;
  } else if (obj.match(/^[0-9]+$/)) {
    return parseInt(obj);
  } else {
    return obj;
  }
}

// combine errors/unidentified
function formatErrors(errors) {
  const msg = [];
  if (errors.error) {
    const arr = Array.isArray(errors.error) ? errors.error : [errors.error];
    arr.forEach(e => msg.push(e.description));
  } else if (errors.unidentified) {
    const arr = Array.isArray(errors.unidentified) ? errors.unidentified : [errors.unidentified];
    arr.forEach(u => msg.push(`unidentified: ${e.total} total`));
  } else {
    msg.push('unknown error')
  }
  return msg.join(', ');
}
