
import { spawn, SpawnOptions } from 'child_process';
import { merge } from 'lodash';

// copied from https://github.com/ewnd9/inquirer-test/blob/master/index.js
// for when this list needs to be extended http://academic.evergreen.edu/projects/biophysics/technotes/program/ascii_ctrl.htm
export const ENTER = '\x0D';
export const UP = '\x1B\x5B\x41';
export const DOWN = '\x1B\x5B\x42';
export const CTRLC = '\x03';
export const CTRLD = '\x04';

const AllControlChars = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function _stringify(obj, replacer = null, space = 0) {
  const _replacer = (key, val) => {
    const isRegExp = (toString.call(val) === '[object RegExp]');
    return isRegExp ? val.toString() : val;
  };
  return JSON.stringify(obj, _replacer, space);
}

export interface ControlChars {
  strip: boolean;
  regexp?: RegExp;
}

export interface Options extends SpawnOptions {
  /**
   * prints all child_process stdin/stdout/stderr to process stdout/stderr
   *
   * @type {boolean}
   * @default false
   */
  debug?: boolean;

  /**
   * Total timeout for each prompt-input-response sequence.
   * Specified in milliseconds
   * Can also be customized per interaction, but this sets the default value
   * for all interactions when not specified.
   *
   * @type {number}
   * @default 5000
   */
  timeout?: number;

  /**
   * delta time between polling intervals and between keyboard sequences.
   * Specified in milliseconds
   *
   * @type {number}
   * @default 1000
   */
  delta?: number;
  /**
   * Normally, the child process is killed on exit. This allows control.
   * Generally, this is not very useful except for interactive debugging.
   *
   * @type {boolean}
   * @default false
   */
  killOnExit?: boolean;

  /**
   * Crafting regular-expressions to match expressions when there are control characters
   * in the output is quite painful. With set to true/false, decides if an internally
   * defined regexp should be run over the input.
   * `/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;`
   *
   * It is also possible to provide your own regexp for the times this is not suficient.
   *
   * @type {ControlChars}
   * @default { strip: true, regexp: /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g }
   */
  controlChars?: ControlChars;
}

export interface Interaction {
  /**
   * await prompt before processing this element
   *
   * @type {(string | RegExp)}
   */
  prompt: string | RegExp;
  /**
   * when prompt found, input is piped into stdin of child process.
   * If an array, each element is sent with the delta timeout
   *
   * @type {((string | RegExp)[] | (string | RegExp))}
   */
  input: (string | RegExp)[] | (string | RegExp);
  /**
   * (Optional) message to await on stdout of child process, after input
   *
   * @type {(string | RegExp)}
   */
  stdout?: string | RegExp;
  /**
   * (Optional) message to await on stderr of child process, after input
   *
   * @type {(string | RegExp)}
   */
  stderr?: string | RegExp;
  /**
   * optional timeout for this step.
   *
   * @type {(number | null)}
   * @default (value of options.timeout)
   */
  timeout?: number | null;

  /**
   * debug this step only. useful to find problems deep in an interaction chain.
   *
   * @type {boolean}
   * @default false
   */
  debugStep?: boolean;

  /**
   * Crafting regular-expressions to match expressions when there are control characters
   * in the output is quite painful. With set to true/false, decides if an internally
   * defined regexp should be run over the input.
   * `/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;`
   *
   * It is also possible to provide your own regexp for the times this is not suficient.
   *
   * @type {ControlChars}
   * @default { strip: true, regexp: /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g }
   */
  controlChars?: ControlChars;
}


export class CliInspectorError extends Error {
  details: any;

  constructor(err, details?: any) {
    super(err);
    this.details = details;
  }
  toString() {
    return super.toString() + ` ${JSON.stringify(this.details)}`;
  }
}

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
export async function run(
  cmd_line: string,
  interactions: Interaction[],
  options?: Options
) {

  // local cache of child process output. We iteratively check and consume this.
  const controlChars = merge(
    {},
    { strip: true, regexp: AllControlChars },
    options.controlChars || {});

  const cache = {
    exit: '',
    stderr: '',
    stdout: '',
    transcript: [],
    controlChars: {
      root: merge({}, controlChars),
      step: merge({}, controlChars)
    }
  };

  delete options.controlChars;

  // reconcile options with defaults and overrides.
  options = merge(
    { // defaults that may be overwritten by options
      debug: false,
      encoding: 'utf8',
      timeout: 5000,
      delta: 1000,
      killOnExit: true
    },
    options, // user provided options
    { // defaults that cannot be overwritten by the user.
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  // child process state.
  const state = {
    paused: false,
    exited: null
  };

  // spawn the process.
  // cmd_line should contain everything needed to run the child process,
  // assuming that one needs to interact with in the CLI. Else why use this lib?
  const cmd_parts = cmd_line.split(' ');
  const child = spawn(
    cmd_parts[0],
    cmd_parts.slice(1),
    options
  );

  // register pipe handlers
  child.stdout.on('data', _stdout);
  child.stderr.on('data', _error);
  child.on('error', _error);
  child.on('exit', _exit);
  child.on('close', _exit);

  // define handlers
  async function _stdin(data) {
    if (data) {
      data = (toString.call(data) === '[object Array]') ? data : [data];
      for (let idx in data) {
        await (new Promise((resolve, reject) => {
          try {
            state.paused = !(child.stdin.write(data[idx], 'utf8'));
            setTimeout(() => {
              resolve();
            }, options.delta);
          } catch (err) {
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
  };

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
  const childPoller = async (
    expected,
    expiry,
    delta = 1000
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      const _poll = () => {
        if (
          cache.stdout.match(expected.stdout) &&
          cache.stderr.match(expected.stderr)
        ) {
          // we found a match. Consume the match, and return.
          cache.stdout = cache.stdout.replace(expected.stdout, '');
          cache.stderr = cache.stderr.replace(expected.stderr, '');
          cache.transcript.push(`stdout: ${cache.stdout}`);
          cache.transcript.push(`stderr: ${cache.stderr}`);
          cache.transcript.push(`------ SUCCESS ${Date.now()}`);
          resolve(true);
        } else {
          const now = Date.now();
          if (now < expiry) {
            // continue to wait
            setTimeout(_poll, delta);
            /* istanbul ignore next */
          } else if (state.exited !== null) {
            cache.transcript.push(`stdout: ${cache.stdout}`);
            cache.transcript.push(`stdout-expected: ${expected.stdout}`);
            cache.transcript.push(`stderr: ${cache.stderr}`);
            cache.transcript.push(`stderr-expected: ${expected.stderr}`);
            cache.transcript.push(`------ PREMATURE EXIT ${Date.now()}`);
            reject(`Child Process exited prematurely. Expected: ${_stringify(expected)}; Actual: ${_stringify(cache)}`);
          } else {
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
  };

  // finally, walk the CLI interaction sequence
  for (let idx in interactions) {
    try {
      const interaction = interactions[idx];
      const debugStep = interaction.debugStep || false;
      // update cacheControl settings for this step in the interaction.
      // if not defined, use global definition
      const cc = cache.controlChars;
      cc.step = merge({}, cc.root, interaction.controlChars || {});
      const prevDebug = options.debug;
      options.debug = debugStep || options.debug;
      const timeout = interaction.timeout || options.timeout;
      if (interaction.prompt !== '') {
        // first wait for the prompt
        await childPoller(
          {
            stdout: interaction.prompt,
            stderr: ''
          },
          Date.now() + timeout,
          options.delta
        );
      }
      // send in the user input
      await _stdin(interaction.input);
      // now wait for the stdout/error, if any
      await childPoller(
        {
          stdout: interaction.stdout,
          stderr: interaction.stderr
        },
        Date.now() + timeout,
        options.delta
      );
      options.debug = prevDebug;
    } catch (err) {
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
}
