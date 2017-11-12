/// <reference types="node" />
import { SpawnOptions } from 'child_process';
export declare const ENTER = "\r";
export declare const UP = "\u001B[A";
export declare const DOWN = "\u001B[B";
export declare const CTRLC = "\u0003";
export declare const CTRLD = "\u0004";
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
export declare class CliInspectorError extends Error {
    details: any;
    constructor(err: any, details?: any);
    toString(): string;
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
export declare function run(cmd_line: string, interactions: Interaction[], options?: Options): Promise<void>;
