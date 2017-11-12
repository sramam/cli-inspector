
import * as commander from './commander';
import * as inquirer from './inquirer';
import * as inquirerStripControlChars from './inquirerStripControlChars';
import { Interaction } from '../..';

export const fixtures = {
  commander: {
    interactions: commander.interactions,
    errors: null,
    controlChars: {
      strip: false
    }
  },
  inquirer: {
    interactions: inquirer.interactions,
    errors: inquirer.errors,
    controlChars: {
      strip: false
    }
  },
  inquirerStripControlChars: {
    errors: inquirer.errors,
    interactions: inquirerStripControlChars.interactions,
    controlChars: {
      strip: true
    }
  }
};
