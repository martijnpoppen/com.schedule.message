import Homey from 'homey';

class HomeyLogger extends Homey.App {
    /**
     * Logs messages with the caller's function name and level.
     * It uses different icons for each log level and formats the output
     * to include the function name from which the log was called.
     * @param {string} level - The log level (e.g., 'log', 'info', 'debug', 'warn', 'error', 'fatal').
     * @param {...any} args - The messages to log.
     * @private
     * @description
     * This method captures the stack trace to determine the caller's function name,
     * formats the log message with an icon and the function name, and then logs it to the console.
     * The icons used are:
     * - log: 📋
     * - info: ℹ️
     * - debug: 💻
     * - warn: ⚠️
     * - error: ⛔️
     * - fatal: 🔥
     * - trace: 🔍
     */
    _logWithCaller(level, ...args) {
        let functionName = 'anonymous';
        const iconPerLevel = {
            log: '📋',
            info: 'ℹ️',
            debug: '💻',
            warn: '⚠️',
            error: '⛔️',
            fatal: '🔥',
            trace: '🔍'
        };

        const consolePerLevel = {
            log: 'log',
            debug: 'debug',
            warn: 'warn',
            error: 'error',
            fatal: 'error', // Fatal is treated as error in console
            trace: 'log',
            info: 'log'
        };

        // Check if the first argument is a string and starts with brackets
        // If so, treat it as the function name
        // log like this this.log('[myFunction]', 'This is a log message');
        if (typeof args[0] === 'string' && /^\[.*\]$/.test(args[0])) {
            functionName = args.shift().slice(1, -1); // remove brackets
        } else {
            const stack = new Error().stack;
            const stackLines = stack.split('\n');
            const callerLine = stackLines[3] || '';
            const match = callerLine.match(/at (?:Object\.)?(\S+)/);
            functionName = match ? match[1].replace('ScheduleMessageApp.', '') : functionName;
        }

        console[consolePerLevel[level]](`${iconPerLevel[level]} [${level}] [${functionName}]`, ...args);
    }

    trace(...args) {
        this._logWithCaller('trace', ...args);
    }

    debug(...args) {
        this._logWithCaller('debug', ...args);
    }

    info(...args) {
        this._logWithCaller('info', ...args);
    }

    log(...args) {
        this._logWithCaller('log', ...args);
    }

    warn(...args) {
        this._logWithCaller('warn', ...args);
    }

    error(...args) {
        this._logWithCaller('error', ...args);
    }

    fatal(...args) {
        this._logWithCaller('fatal', ...args);
    }
}

export default HomeyLogger;
