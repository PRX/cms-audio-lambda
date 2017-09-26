'use strict';

/**
 * Standard loggers (with prefixes so they're easy to search for)
 */
exports.log = msg => console.log('[LOG]', msg);
exports.info = msg => console.info('[INFO]', msg);
exports.warn = msg => console.warn('[WARN]', msg);
exports.error = msg => console.error('[ERROR]', msg);
