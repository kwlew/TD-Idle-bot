const chalk = require('chalk');

// Verbose, high-frequency logs (per-poll stats fetches, cache reads) are opt-in
// via DEBUG=1 so normal operation doesn't spam the console.
const debugEnabled = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

const icon = {
    info: chalk.cyan.bold('ℹ'),
    success: chalk.green.bold('✓'),
    warn: chalk.yellow.bold('⚠'),
    error: chalk.red.bold('✗'),
    debug: chalk.magenta.bold('•'),
};

function timestamp() {
    return chalk.dim(new Date().toLocaleTimeString('en-GB'));
}

function info(message, ...rest) {
    console.log(timestamp(), icon.info, message, ...rest);
}

function success(message, ...rest) {
    console.log(timestamp(), icon.success, message, ...rest);
}

function warn(message, ...rest) {
    console.warn(timestamp(), icon.warn, chalk.yellow(message), ...rest);
}

function error(message, ...rest) {
    console.error(timestamp(), icon.error, chalk.red(message), ...rest);
}

// Only prints when DEBUG=1 — for noisy, routine chatter that's useful when
// diagnosing something but not worth seeing on every poll.
function debug(message, ...rest) {
    if (!debugEnabled) return;
    console.log(timestamp(), icon.debug, chalk.dim(message), ...rest);
}

module.exports = { info, success, warn, error, debug };
