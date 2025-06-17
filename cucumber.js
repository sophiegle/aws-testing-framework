module.exports = {
  default: [
    '--require-module ts-node/register',
    '--require src/steps/**/*.ts',
    '--format json:coverage/functional-tests/cucumber-report.json',
    'features/**/*.feature',
  ].join(' '),
};
