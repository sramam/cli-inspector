
import { Interaction, ENTER, UP, DOWN, CTRLC, CTRLD } from '../../..';
export const errors = {
  timeout: {
    name: 'should timeout waiting for response on stdout',
    error: /Timed out. Expected:; Actual:/,
    interactions: <Interaction[]>[{
      prompt: /^Is this for delivery\? \(y\/N\)/,
      input: ENTER,
      stdout: /^Is this for DELIVERY\? No/, // cause mismatch failure/timeout
      stderr: ''
    }]
  },
  // prematureExit: {
  //   name: 'should catch premature exits',
  //   error: /CLI exited prematurely.*/,
  //   interactions: <Interaction[]>[{
  //     prompt: /^[\s\S]*Is this for delivery\? \(y\/N\)/,
  //     input: [ENTER, CTRLC, ENTER],
  //     stdout: /^[\s\S]*Is this for delivery\? No/,
  //     stderr: ''
  //   }, {
  //     prompt: /^[\s\S]*What's your phone number\? /,
  //     input: '',
  //     stdout: 'not of consequence - can be any string ',
  //     stderr: ''
  //   }]
  // }
};

