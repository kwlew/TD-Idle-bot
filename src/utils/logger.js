const chalk = require('chalk');

// Verbose, high-frequency logs (per-poll stats fetches, cache reads) are opt-in
// via DEBUG=1 so normal operation doesn't spam the console.
const debugEnabled = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

// Visual weight escalates with severity: info/success/debug are a single
// colored glyph (routine, shouldn't fight for attention), warn/error are
// filled badges so they physically jump out of a scrolling log.
const badge = {
    info: chalk.cyan.bold('ℹ '),
    success: chalk.green.bold('✓'),
    warn: chalk.bgYellow.black.bold(' WARN '),
    error: chalk.bgRed.white.bold(' ERROR '),
    debug: chalk.gray('•'),
};

function timestamp() {
    return chalk.dim(new Date().toLocaleTimeString('en-GB'));
}

function info(message, ...rest) {
    console.log(timestamp(), badge.info, chalk.cyan(message), ...rest);
}

function success(message, ...rest) {
    console.log(timestamp(), badge.success, chalk.green.bold(message), ...rest);
}

function warn(message, ...rest) {
    console.warn(timestamp(), badge.warn, chalk.yellow.bold(message), ...rest);
}

function error(message, ...rest) {
    console.error(timestamp(), badge.error, chalk.red.bold(message), ...rest);
}

// Only prints when DEBUG=1 — for noisy, routine chatter that's useful when
// diagnosing something but not worth seeing on every poll.
function debug(message, ...rest) {
    if (!debugEnabled) return;
    console.log(timestamp(), badge.debug, chalk.gray.dim(message), ...rest);
}

module.exports = { info, success, warn, error, debug };
