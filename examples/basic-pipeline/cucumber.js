module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['node_modules/aws-testing-framework/dist/steps/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
  },
};
