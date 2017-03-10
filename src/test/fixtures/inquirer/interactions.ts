
import { Interaction, ENTER, UP, DOWN } from '../../..';
export const interactions = <Interaction[]>[{
  prompt: /^[\s\S]*Is this for delivery\? \(y\/N\)/,
  input: ENTER,
  stdout: /^[\s\S]*Is this for delivery\? No/,
  stderr: ''
}, {
  prompt: /^[\s\S]*What's your phone number\? /,
  input: ENTER,
  stdout: /^[\s\S]*Please enter a valid phone number/
}, {
  debugStep: true, // debug only this step - just for coverage in test
  prompt: /^\u001b\[1A\u001b\[36D\u001b\[28C/, // inquirer uses control characters. Is this cross OS?
  input: [`4081234567`, ENTER],
  stdout: /[\s\S]*What's your phone number\? 4081234567/
}, {
  // debugStep: true,
  prompt: /[\s\S]*What size do you need\? \(Use arrow keys\)[\s\S]*Small/,
  input: [DOWN, ENTER],
  stdout: /[\s\S]*What size do you need\? Medium/
}, {
  prompt: /[\s\S]*How many do you need\? /,
  input: ENTER,
  stdout: /[\s\S]*How many do you need\? 0/
}, {
  // debugStep: true,
  prompt: /[\s\S]*What about the toppings\? \(pawH\)/,
  input: ENTER,
  stdout: /[\s\S]*Pepperoni and cheese[\s\S]*All dressed[\s\S]*Hawaiian[\s\S]*Help/,
}, {
  prompt: /[\s\S]* Answer:/,
  input: ['a', ENTER],
  stdout: /[\s\S]*What about the toppings\? All dressed/
}, {
  prompt: /[\s\S]*You also get a free 2L beverage[\s\S]*Pepsi[\s\S]*7up[\s\S]*Coke[\s\S]*Answer: /,
  input: ['1', ENTER],
  stdout: /[\s\S]*You also get a free 2L beverage Pepsi/
}, {
  prompt: /[\s\S]*Any comments on your purchase experience\? \(Nope, all good!\)/,
  input: ENTER,
  stdout: /[\s\S]*Order receipt:.*/
}];

