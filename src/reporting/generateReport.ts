import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import type { DashboardConfig } from './TestDashboard';

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

export function convertCucumberReportToResults(
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

/**
 * Generate interactive dashboard from Cucumber JSON report
 * @param cucumberJsonPath Path to the Cucumber JSON report file
 * @param outputDir Directory to write dashboard files (default: 'test-reports')
 * @param config Optional dashboard configuration
 * @returns Object with paths to generated dashboard files
 */
export function generateDashboardFromCucumberJson(
  cucumberJsonPath: string,
  outputDir = 'test-reports',
  config?: { light?: Partial<DashboardConfig>; dark?: Partial<DashboardConfig> }
): { lightTheme: string; darkTheme: string } {
  // Import here to avoid circular dependencies
  const { TestDashboard } = require('./TestDashboard');
  const path = require('node:path');

  // Check if JSON report exists
  if (!existsSync(cucumberJsonPath)) {
    throw new Error(`Cucumber JSON report not found at: ${cucumberJsonPath}`);
  }

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Read and parse Cucumber JSON
  const jsonData = readFileSync(cucumberJsonPath, 'utf-8');
  const cucumberReport = JSON.parse(jsonData) as CucumberFeature[];

  // Convert to TestReporterResults format
  const results = convertCucumberReportToResults(cucumberReport);

  // Generate dashboards
  const lightDashboard = new TestDashboard({
    theme: 'light',
    ...config?.light,
  });
  const darkDashboard = new TestDashboard({ theme: 'dark', ...config?.dark });
  const metrics = lightDashboard.calculateMetrics(results);

  // Generate dashboard HTML
  const lightHtml = lightDashboard.generateDashboard(results, metrics);
  const darkHtml = darkDashboard.generateDashboard(results, metrics);

  // Write dashboard files
  const lightPath = path.join(outputDir, 'dashboard.html');
  const darkPath = path.join(outputDir, 'dashboard-dark.html');

  writeFileSync(lightPath, lightHtml);
  writeFileSync(darkPath, darkHtml);

  return {
    lightTheme: lightPath,
    darkTheme: darkPath,
  };
}

/**
 * Generate dashboard from test results (already converted format)
 * @param results Test results in TestReporterResults format
 * @param outputDir Directory to write dashboard files (default: 'test-reports')
 * @param config Optional dashboard configuration
 * @returns Object with paths to generated dashboard files
 */
export function generateDashboard(
  results: TestReporterResults[],
  outputDir = 'test-reports',
  config?: { light?: Partial<DashboardConfig>; dark?: Partial<DashboardConfig> }
): { lightTheme: string; darkTheme: string } {
  // Import here to avoid circular dependencies
  const { TestDashboard } = require('./TestDashboard');
  const path = require('node:path');

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate dashboards
  const lightDashboard = new TestDashboard({
    theme: 'light',
    ...config?.light,
  });
  const darkDashboard = new TestDashboard({ theme: 'dark', ...config?.dark });
  const metrics = lightDashboard.calculateMetrics(results);

  // Generate dashboard HTML
  const lightHtml = lightDashboard.generateDashboard(results, metrics);
  const darkHtml = darkDashboard.generateDashboard(results, metrics);

  // Write dashboard files
  const lightPath = path.join(outputDir, 'dashboard.html');
  const darkPath = path.join(outputDir, 'dashboard-dark.html');

  writeFileSync(lightPath, lightHtml);
  writeFileSync(darkPath, darkHtml);

  return {
    lightTheme: lightPath,
    darkTheme: darkPath,
  };
}

/**
 * Smart dashboard generation using auto-detected configuration
 * This is the main function users should call - it handles everything automatically
 */
export function generateSmartDashboard(
  cucumberJsonPath?: string,
  configOverrides?: Partial<DashboardConfig>
): {
  success: boolean;
  paths?: { lightTheme: string; darkTheme: string };
  message: string;
} {
  try {
    const configManager = ConfigManager.getInstance();
    const _config = configManager.autoDetectConfig();

    // Check if dashboard generation is enabled
    if (!configManager.isDashboardEnabled()) {
      return {
        success: false,
        message: 'Dashboard generation is disabled in configuration',
      };
    }

    const dashboardConfig = configManager.getDashboardConfig();
    const reportingConfig = configManager.getReportingConfig();

    // Determine input file path
    const inputPath =
      cucumberJsonPath ||
      reportingConfig.cucumberJsonPath ||
      './coverage/functional-tests/cucumber-report.json';

    if (!existsSync(inputPath)) {
      return {
        success: false,
        message: `Cucumber JSON report not found at: ${inputPath}. Please run tests first or check your configuration.`,
      };
    }

    // Determine output directory
    const outputDir = dashboardConfig.outputDir || './test-reports';

    // Prepare theme configurations
    const themeConfigs = {
      light: {
        ...dashboardConfig.lightTheme,
        ...configOverrides,
      },
      dark: {
        ...dashboardConfig.darkTheme,
        ...configOverrides,
      },
    };

    // Generate dashboards for enabled themes
    const themes = dashboardConfig.themes || ['light', 'dark'];
    const results = generateDashboardFromCucumberJson(
      inputPath,
      outputDir,
      themeConfigs
    );

    // Auto-open in development
    if (dashboardConfig.autoOpen && process.env.NODE_ENV === 'development') {
      const { exec } = require('node:child_process');
      exec(`open ${results.lightTheme}`);
    }

    return {
      success: true,
      paths: results,
      message: `Dashboard generated successfully! Themes: ${themes.join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error generating dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Auto-generate dashboard if configuration allows it
 * This function can be called automatically after test runs
 */
export function autoGenerateDashboard(): void {
  const configManager = ConfigManager.getInstance();
  const dashboardConfig = configManager.getDashboardConfig();

  // Only auto-generate if explicitly enabled
  if (dashboardConfig.autoGenerate) {
    const result = generateSmartDashboard();

    if (result.success) {
      console.log('✅ Dashboard auto-generated:', result.message);
      if (result.paths) {
        console.log(`📊 Light theme: ${result.paths.lightTheme}`);
        console.log(`🌙 Dark theme: ${result.paths.darkTheme}`);
      }
    } else {
    }
  }
}

if (require.main === module) {
  main();
}
