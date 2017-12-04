"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
// copied from https://github.com/ewnd9/inquirer-test/blob/master/index.js
// for when this list needs to be extended http://academic.evergreen.edu/projects/biophysics/technotes/program/ascii_ctrl.htm
exports.ENTER = '\x0D';
exports.UP = '\x1B\x5B\x41';
exports.DOWN = '\x1B\x5B\x42';
exports.CTRLC = '\x03';
exports.CTRLD = '\x04';
const AllControlChars = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
function _stringify(obj, replacer = null, space = 0) {
    const _replacer = (key, val) => {
        const isRegExp = (toString.call(val) === '[object RegExp]');
        return isRegExp ? val.toString() : val;
    };
    return JSON.stringify(obj, _replacer, space);
}
class CliInspectorError extends Error {
    constructor(err, details) {
        super(err);
        this.details = details;
    }
    toString() {
        return super.toString() + ` ${JSON.stringify(this.details)}`;
    }
}
exports.CliInspectorError = CliInspectorError;
/**
 * run an cli-test.
 * 1. spawn a child process with the cmd_line specified.
 * 2. Provide an array of individual interactions. See [tests](test/fixtures/inquirer/interactions.ts)
 *    for a working example. `npm run build` to see it in action.
 *    interactions.forEach( (interaction) => {
 *      - wait for the prompt on interaction.stdout (string/regexp)
 *      - pipe interaction.input to stdin
 *      - wait for interaction.stdout/interaction.stderr if specified.
 *      rinse and repeat
 * 3. Options provide control over the inspector and the child_process.
 *    The most important control provided by `cli-inspector` are
 *     - `delta`, the polling interval. Defaults to 1000
 *     - `timeout`, the time to wait in ms till
 * @export
 * @param {string} cmd_line
 * @param {Interaction[]} interactions
 * @param {Options} [options]
 */
function run(cmd_line, interactions, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        // local cache of child process output. We iteratively check and consume this.
        const controlChars = lodash_1.merge({}, { strip: true, regexp: AllControlChars }, options.controlChars || {});
        const cache = {
            exit: '',
            stderr: '',
            stdout: '',
            transcript: [],
            controlChars: {
                root: lodash_1.merge({}, controlChars),
                step: lodash_1.merge({}, controlChars)
            }
        };
        delete options.controlChars;
        // reconcile options with defaults and overrides.
        options = lodash_1.merge({
            debug: false,
            encoding: 'utf8',
            timeout: 5000,
            delta: 1000,
            killOnExit: true
        }, options, // user provided options
        {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        // child process state.
        const state = {
            paused: false,
            exited: null
        };
        // spawn the process.
        // cmd_line should contain everything needed to run the child process,
        // assuming that one needs to interact with in the CLI. Else why use this lib?
        const cmd_parts = cmd_line.split(' ');
        const child = child_process_1.spawn(cmd_parts[0], cmd_parts.slice(1), options);
        // register pipe handlers
        child.stdout.on('data', _stdout);
        child.stderr.on('data', _error);
        child.on('error', _error);
        child.on('exit', _exit);
        child.on('close', _exit);
        // define handlers
        function _stdin(data) {
            return __awaiter(this, void 0, void 0, function* () {
                if (data) {
                    data = (toString.call(data) === '[object Array]') ? data : [data];
                    for (let idx in data) {
                        yield (new Promise((resolve, reject) => {
                            try {
                                state.paused = !(child.stdin.write(data[idx], 'utf8'));
                                setTimeout(() => {
                                    resolve();
                                }, options.delta);
                            }
                            catch (err) {
                                /* istanbul ignore next */
                                reject();
                            }
                        }));
                    }
                    cache.transcript.push(`stdin: ${data}`);
                    if (options.debug) {
                        process.stdout.write(`${data}`);
                    }
                }
            });
        }
        function _stdout(data) {
            if (options.debug) {
                process.stdout.write(data);
            }
            const cc = cache.controlChars.step;
            // concatenate the data with cache.stderr
            const stdout = cache.stdout + data;
            // if control character stripping is enabled, do it.
            cache.stdout = cc.strip === false ? stdout : stdout.replace(cc.regexp, '');
        }
        // can'tfigure how to get inquirer to send stderr. skip?
        /* istanbul ignore next */
        function _error(data) {
            if (options.debug) {
                process.stderr.write(data);
            }
            const cc = cache.controlChars.step;
            // concatenate the data with cache.stderr
            const stderr = cache.stderr + data;
            // if control character stripping is enabled, do it.
            cache.stderr = cc.strip === false ? stderr : stderr.replace(cc.regexp, '');
        }
        function _exit(code, signal) {
            /* istanbul ignore next */
            if (options.debug) {
                process.stdout.write(`Exiting ${code} ${signal}\n`);
            }
            state.exited = {
                code: code,
                signal: signal
            };
        }
        // watches the child process for stdout/stderr.
        const childPoller = (expected, expiry, delta = 1000) => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const _poll = () => {
                    if (cache.stdout.match(expected.stdout) &&
                        cache.stderr.match(expected.stderr)) {
                        // we found a match. Consume the match, and return.
                        cache.stdout = cache.stdout.replace(expected.stdout, '');
                        cache.stderr = cache.stderr.replace(expected.stderr, '');
                        cache.transcript.push(`stdout: ${cache.stdout}`);
                        cache.transcript.push(`stderr: ${cache.stderr}`);
                        cache.transcript.push(`------ SUCCESS ${Date.now()}`);
                        resolve(true);
                    }
                    else {
                        const now = Date.now();
                        if (now < expiry) {
                            // continue to wait
                            setTimeout(_poll, delta);
                            /* istanbul ignore next */
                        }
                        else if (state.exited !== null) {
                            cache.transcript.push(`stdout: ${cache.stdout}`);
                            cache.transcript.push(`stdout-expected: ${expected.stdout}`);
                            cache.transcript.push(`stderr: ${cache.stderr}`);
                            cache.transcript.push(`stderr-expected: ${expected.stderr}`);
                            cache.transcript.push(`------ PREMATURE EXIT ${Date.now()}`);
                            reject(`Child Process exited prematurely. Expected: ${_stringify(expected)}; Actual: ${_stringify(cache)}`);
                        }
                        else {
                            // the end of time.
                            cache.transcript.push(`stdout: ${cache.stdout}`);
                            cache.transcript.push(`stdout-expected: ${expected.stdout}`);
                            cache.transcript.push(`stderr: ${cache.stderr}`);
                            cache.transcript.push(`stderr-expected: ${expected.stderr}`);
                            cache.transcript.push(`------ TIMEOUT ${Date.now()}`);
                            reject(`Timed out. Expected: ${_stringify(expected)}; Actual: ${_stringify(cache)}`);
                        }
                    }
                };
                _poll();
            });
        });
        // finally, walk the CLI interaction sequence
        for (let idx in interactions) {
            try {
                const interaction = interactions[idx];
                const debugStep = interaction.debugStep || false;
                // update cacheControl settings for this step in the interaction.
                // if not defined, use global definition
                const cc = cache.controlChars;
                cc.step = lodash_1.merge({}, cc.root, interaction.controlChars || {});
                const prevDebug = options.debug;
                options.debug = debugStep || options.debug;
                const timeout = interaction.timeout || options.timeout;
                if (interaction.prompt !== '') {
                    // first wait for the prompt
                    yield childPoller({
                        stdout: interaction.prompt,
                        stderr: ''
                    }, Date.now() + timeout, options.delta);
                }
                // send in the user input
                yield _stdin(interaction.input);
                // now wait for the stdout/error, if any
                yield childPoller({
                    stdout: interaction.stdout,
                    stderr: interaction.stderr
                }, Date.now() + timeout, options.delta);
                options.debug = prevDebug;
            }
            catch (err) {
                options.killOnExit && child.kill('SIGHUP');
                /* istanbul ignore next */
                const code = (state.exited && state.exited.code) || null;
                /* istanbul ignore next */
                const signal = (state.exited && state.exited.signal) || null;
                const cliErr = new CliInspectorError(err);
                cliErr.details = {
                    index: idx,
                    command: interactions[idx],
                    stdout: cache.stdout,
                    stderr: cache.stderr,
                    code: code,
                    signal: signal,
                    transcript: cache.transcript
                };
                throw cliErr;
            }
        }
        // finally, we are all done with the interaction.
        options.killOnExit && child.kill('SIGHUP');
    });
}
exports.run = run;
//# sourceMappingURL=cli-inspector.js.map