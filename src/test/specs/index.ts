
import { expect } from 'chai';
import * as path from 'path';
import * as inspect from '../..';
import { fixtures } from '../fixtures';

describe('cli-inspector', () => {
  Object.keys(fixtures).map((key) => {
    const fixture = fixtures[key];
    it(`Testing CLI ${key}`, async () => {
      try {
        const script = path.join(__dirname, '..', 'fixtures', key, 'cli');
        const interactions = fixture.interactions;
        const cmd_line = `node ${script}`;
        const result = await inspect.run(cmd_line, interactions, { debug: true });
        expect(true).to.be.true;
      } catch (err) {
        expect(err).to.be.null;
      }
    });
  });

  // the error tests are only specified for inquirer.
  Object.keys(fixtures.inquirer.errors).map((key) => {
    const fixture = fixtures.inquirer.errors[key];
    it(`${fixture.name}`, async () => {
      try {
        const script = path.join(__dirname, '..', 'fixtures', 'inquirer', 'cli');
        const interactions = fixture.interactions;
        const cmd_line = `node ${script}`;
        const result = await inspect.run(cmd_line, interactions, { debug: false });
        expect(true).to.be.false; // should not be here
      } catch (err) {
        expect(err).to.be.match(fixture.error);
      }
    });
  });
});
