module.exports = {
  default: [
    '--require-module ts-node/register',
    '--require src/cucumber-support.ts',
    '--require src/framework/steps/base-steps.ts',
    '--format json:coverage/functional-tests/cucumber-report.json',
    'features/**/*.feature',
  ].join(' '),
};
