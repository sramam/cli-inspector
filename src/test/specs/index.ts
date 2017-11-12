
import { expect } from 'chai';
import * as path from 'path';
import * as inspect from '../..';
import { fixtures } from '../fixtures';

describe('cli-inspector', () => {
  Object.keys(fixtures).map((key) => {
    const fixture = fixtures[key];
    let result;
    it(`Testing CLI ${key}`, async () => {
      try {
        const script = path.join(__dirname, '..', 'fixtures', key, 'cli');
        const interactions = fixture.interactions;
        const cmd_line = `node ${script}`;
        const opts = {
          debug: true,
          controlChars: fixture.controlChars
        };
        result = await inspect.run(cmd_line, interactions, opts);
        expect(true).to.be.true;
      } catch (err) {
        console.log(JSON.stringify(result, null, 2));
        console.log(JSON.stringify(err, null, 2));
        expect(err).to.be.null;
      }
    });
  });

  // the error tests are only specified for inquirer.
  Object.keys(fixtures.inquirer.errors).map((key) => {
    const fixture = fixtures.inquirer.errors[key];
    const debug = key === 'inquirerStripControlChars';
    it(`${fixture.name}`, async () => {
      try {
        const script = path.join(__dirname, '..', 'fixtures', 'inquirer', 'cli');
        const interactions = fixture.interactions;
        const cmd_line = `node ${script}`;
        const opts = {
          debug,
          controlChars: fixture.controlChars
        };
        const result = await inspect.run(cmd_line, interactions, opts);
        expect(true).to.be.false; // should not be here
      } catch (err) {
        expect(err).to.be.match(fixture.error);
      }
    });
  });

});
