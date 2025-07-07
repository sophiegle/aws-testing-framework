#!/usr/bin/env node

/**
 * Script to run tests with automatic dashboard generation
 *
 * Usage:
 *   node scripts/run-tests-with-dashboard.js
 *
 * This script demonstrates how to run tests and automatically
 * generate an interactive dashboard showing features, scenarios,
 * steps, timing, and results.
 */

const { execSync } = require('node:child_process');
const _fs = require('node:fs');
const path = require('node:path');

console.log('🚀 Running tests with automatic dashboard generation...\n');

try {
  execSync('npm test', { stdio: 'inherit' });

  // Generate dashboard after tests
  execSync('node scripts/generate-dashboard.js', { stdio: 'inherit' });

  const _dashboardPath = path.join(__dirname, '../test-reports/dashboard.html');
  const _darkDashboardPath = path.join(
    __dirname,
    '../test-reports/dashboard-dark.html'
  );

  // Removed console.log for dashboard paths and replaced template literals with string literals
  // Removed console.log for open instructions
} catch (_error) {
  // Removed console.error
  process.exit(1);
}

console.log('\n🎉 Test execution completed!');
