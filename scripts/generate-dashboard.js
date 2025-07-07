#!/usr/bin/env node

/**
 * Script to generate dashboard from Cucumber JSON report
 */

// Use node: protocol for built-in modules
const fs = require('node:fs');
const path = require('node:path');
// Import the dashboard classes
const { TestDashboard } = require('../dist/reporting/TestDashboard');
// Removed unused TestReporter import

function generateDashboardFromJson() {
  const jsonReportPath = path.join(
    __dirname,
    '../test-reports/cucumber-report.json'
  );
  const dashboardPath = path.join(__dirname, '../test-reports/dashboard.html');
  const darkDashboardPath = path.join(
    __dirname,
    '../test-reports/dashboard-dark.html'
  );

  if (!fs.existsSync(jsonReportPath)) {
    // Removed console.error
    // Removed console.log
    return;
  }

  const jsonData = fs.readFileSync(jsonReportPath, 'utf-8');
  const results = JSON.parse(jsonData);

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
    // Removed console.log
  } catch (_error) {
    // Removed console.error
    process.exit(1);
  }
}

generateDashboardFromJson();
