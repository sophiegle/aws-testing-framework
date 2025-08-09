#!/usr/bin/env node

/**
 * Script to generate dashboard from Cucumber JSON report
 */

// Use node: protocol for built-in modules
const fs = require('node:fs');
const path = require('node:path');
// Import the dashboard classes and converter
const { TestDashboard } = require('../dist/reporting/TestDashboard');

// Converter function from generateReport.ts
function convertCucumberReportToResults(report) {
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

function generateDashboardFromJson() {
  const jsonReportPath = path.join(
    __dirname,
    '../coverage/functional-tests/cucumber-report.json'
  );
  const dashboardPath = path.join(__dirname, '../test-reports/dashboard.html');
  const darkDashboardPath = path.join(
    __dirname,
    '../test-reports/dashboard-dark.html'
  );

  if (!fs.existsSync(jsonReportPath)) {
    // biome-ignore lint/suspicious/noConsole: CLI script requires console output
    console.error(`❌ JSON report not found at: ${jsonReportPath}`);
    console.log('💡 Run tests first to generate the JSON report');
    process.exit(1);
  }

  console.log('🔍 Found JSON report, generating dashboard...');

  // Ensure test-reports directory exists
  const testReportsDir = path.join(__dirname, '../test-reports');
  if (!fs.existsSync(testReportsDir)) {
    fs.mkdirSync(testReportsDir, { recursive: true });
  }

  const jsonData = fs.readFileSync(jsonReportPath, 'utf-8');
  const cucumberReport = JSON.parse(jsonData);

  // Convert Cucumber JSON format to TestReporterResults format
  const results = convertCucumberReportToResults(cucumberReport);

  const dashboard = new TestDashboard({ theme: 'light' });
  const darkDashboard = new TestDashboard({ theme: 'dark' });
  const metrics = dashboard.calculateMetrics(results);

  try {
    fs.writeFileSync(
      dashboardPath,
      dashboard.generateDashboard(results, metrics)
    );
    fs.writeFileSync(
      darkDashboardPath,
      darkDashboard.generateDashboard(results, metrics)
    );

    console.log('✅ Dashboard generated successfully!');
    console.log(`📊 Light theme: ${dashboardPath}`);
    console.log(`🌙 Dark theme: ${darkDashboardPath}`);
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: CLI script requires console output
    console.error('❌ Error generating dashboard:', error.message);
    process.exit(1);
  }
}

generateDashboardFromJson();
