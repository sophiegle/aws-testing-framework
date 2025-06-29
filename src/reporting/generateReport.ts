import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface CucumberStep {
  keyword: string;
  name: string;
  result: {
    status: string;
    duration: number;
    error_message?: string;
  };
}

interface CucumberScenario {
  keyword: string;
  name: string;
  steps: CucumberStep[];
}

interface CucumberFeature {
  keyword: string;
  name: string;
  elements: CucumberScenario[];
}

export interface TestReporterResults {
  feature: string;
  scenarios: Array<{
    name: string;
    status: string;
    steps: Array<{
      name: string;
      status: string;
      duration: number;
      error?: string;
    }>;
  }>;
}

function convertCucumberReportToResults(
  report: CucumberFeature[]
): TestReporterResults[] {
  return report.map((feature) => ({
    feature: feature.name,
    scenarios: feature.elements.map((scenario) => ({
      name: scenario.name,
      status: scenario.steps.every((step) => step.result.status === 'passed')
        ? 'passed'
        : scenario.steps.some((step) => step.result.status === 'failed')
          ? 'failed'
          : 'pending',
      steps: scenario.steps.map((step) => ({
        name: `${step.keyword} ${step.name}`,
        status: step.result.status,
        duration: step.result.duration,
        error: step.result.error_message,
      })),
    })),
  }));
}

export function generateHtmlReport(results: TestReporterResults[]): string {
  if (!results || results.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .feature { margin-bottom: 20px; }
            .scenario { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
            .step { margin: 5px 0; padding: 5px; }
            .passed { background-color: #dff0d8; }
            .failed { background-color: #f2dede; }
            .pending { background-color: #fcf8e3; }
            .error { color: #a94442; font-family: monospace; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Test Report</h1>
          <div class="features">
            <p>No test results found</p>
          </div>
        </body>
      </html>
    `;
  }

  const totalScenarios = results.reduce(
    (acc, feature) => acc + feature.scenarios.length,
    0
  );
  const passedScenarios = results.reduce(
    (acc, feature) =>
      acc +
      feature.scenarios.filter((scenario) => scenario.status === 'passed')
        .length,
    0
  );
  const failedScenarios = results.reduce(
    (acc, feature) =>
      acc +
      feature.scenarios.filter((scenario) => scenario.status === 'failed')
        .length,
    0
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .feature { margin-bottom: 20px; }
          .scenario { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
          .step { margin: 5px 0; padding: 5px; }
          .passed { background-color: #dff0d8; }
          .failed { background-color: #f2dede; }
          .pending { background-color: #fcf8e3; }
          .error { color: #a94442; font-family: monospace; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>Test Report</h1>
        <div class="summary">
          <h2>Summary</h2>
          <p>Total Scenarios: ${totalScenarios}</p>
          <p>Passed: ${passedScenarios}</p>
          <p>Failed: ${failedScenarios}</p>
        </div>
        <div class="features">
          ${results
            .map(
              (feature) => `
            <div class="feature">
              <h2>${feature.feature}</h2>
              ${feature.scenarios
                .map(
                  (scenario) => `
                <div class="scenario ${scenario.status}">
                  <h3>${scenario.name}</h3>
                  <div class="steps">
                    ${scenario.steps
                      .map(
                        (step) => `
                      <div class="step ${step.status}">
                        <p>${step.name}</p>
                        <p>Duration: ${step.duration}ms</p>
                        ${step.error ? `<p class="error">${step.error}</p>` : ''}
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
      </body>
    </html>
  `;
}

export function main() {
  // Create coverage/functional-tests directory if it doesn't exist
  if (!existsSync('coverage/functional-tests')) {
    mkdirSync('coverage/functional-tests', { recursive: true });
  }

  const reportPath = join('coverage/functional-tests', 'cucumber-report.json');
  if (!existsSync(reportPath)) {
    // biome-ignore lint/suspicious/noConsole: Required for CLI output and test expectations
    console.error(
      'Error: No test report found at',
      'coverage/functional-tests/cucumber-report.json'
    );
    process.exit(1);
  }

  try {
    const reportContent = readFileSync(reportPath, 'utf8');

    const report = JSON.parse(reportContent) as CucumberFeature[];
    if (!Array.isArray(report)) {
      throw new Error('Invalid report format: expected an array of features');
    }

    const results = convertCucumberReportToResults(report);
    const htmlReport = generateHtmlReport(results);
    writeFileSync(join('coverage/functional-tests', 'report.html'), htmlReport);
    // biome-ignore lint/suspicious/noConsole: Required for CLI output and test expectations
    console.info(
      'HTML report generated successfully at coverage/functional-tests/report.html'
    );
  } catch (_error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
