# Test Execution Dashboard Guide

This guide shows you how to run tests and automatically generate an interactive dashboard that displays your test execution results with detailed timing and performance metrics.

## 🚀 Quick Start

### 1. Run Tests with Dashboard Generation

```bash
# Run tests and automatically generate dashboard
npm run test:dashboard

# Or run tests normally (dashboard is generated automatically)
npm test
```

### 2. View the Dashboard

After running tests, open the generated dashboard in your browser:

```bash
# Open light theme dashboard
open test-reports/dashboard.html

# Open dark theme dashboard
open test-reports/dashboard-dark.html
```

## 📊 Dashboard Features

### Interactive Test Structure
- **Features**: Expandable list of all test features
- **Scenarios**: Drill down into individual scenarios within each feature
- **Steps**: View detailed step-by-step execution with timing
- **Results**: Pass/fail status with error details

### Performance Metrics
- **Success Rate**: Overall test success percentage
- **Execution Times**: Average scenario and step durations
- **Slowest Items**: Identify performance bottlenecks
- **Detailed Timing**: Step-by-step execution timing

### Interactive Features
- **Search**: Find specific features, scenarios, or steps
- **Filtering**: Filter by pass/fail/skip status
- **Themes**: Light and dark theme options
- **Responsive**: Works on desktop and mobile devices

## 🎯 How to Run Tests with Dashboard

### Option 1: Using the Dashboard Script (Recommended)

```bash
# Run tests with automatic dashboard generation
npm run test:dashboard
```

This script will:
1. Run all Cucumber tests
2. Generate interactive dashboard automatically
3. Display metrics and file locations
4. Provide instructions for viewing

### Option 2: Standard Test Execution

```bash
# Run tests normally (dashboard is generated automatically)
npm test

# Run specific feature
npm test -- features/s3-operations.feature

# Run with custom tags
npm test -- --tags "@s3"
```

### Option 3: Manual Dashboard Generation

If you already have test results, you can generate the dashboard manually:

```bash
# Generate dashboard from existing JSON report
node scripts/generate-dashboard.js
```

## 📈 Understanding the Dashboard

### Dashboard Structure

```
📊 Test Execution Dashboard
├── 📈 Metrics Overview
│   ├── Total Features
│   ├── Total Scenarios  
│   ├── Total Steps
│   ├── Passed/Failed/Skipped
│   └── Success Rate
├── 🎯 Performance Analysis
│   ├── Slowest Feature
│   ├── Slowest Scenario
│   ├── Slowest Step
│   └── Average Durations
└── 📋 Test Details
    ├── Feature 1
    │   ├── Scenario 1 ✅
    │   │   ├── Step 1 (100ms) ✅
    │   │   ├── Step 2 (150ms) ✅
    │   │   └── Step 3 (200ms) ✅
    │   └── Scenario 2 ❌
    │       ├── Step 1 (50ms) ✅
    │       └── Step 2 (0ms) ❌
    └── Feature 2
        └── Scenario 3 ⏭️
```

### Key Metrics Explained

- **Success Rate**: Percentage of scenarios that passed
- **Average Scenario Duration**: Mean execution time per scenario
- **Average Step Duration**: Mean execution time per step
- **Slowest Feature/Scenario/Step**: Identifies performance bottlenecks

### Color Coding

- 🟢 **Green**: Passed tests
- 🔴 **Red**: Failed tests  
- 🟡 **Yellow**: Skipped tests
- 🔵 **Blue**: Information/metrics

## 🔧 Dashboard Configuration

### Environment Variables

```bash
# Customize dashboard generation
export DASHBOARD_THEME=dark
export DASHBOARD_AUTO_REFRESH=true
export DASHBOARD_OUTPUT_DIR=custom-reports

# Run tests with custom settings
DASHBOARD_THEME=dark npm test
```

### Programmatic Configuration

```typescript
import { TestReporter } from './src/reporting/TestReporter';

const reporter = new TestReporter({
  theme: 'dark',                    // 'light' | 'dark'
  showPerformanceMetrics: true,     // Show performance analysis
  showStepDetails: true,            // Show detailed step information
  autoRefresh: false,               // Auto-refresh dashboard
  maxFeaturesToShow: 50,           // Maximum features to display
  refreshInterval: 5000             // Refresh interval in milliseconds
});
```

## 📁 Generated Files

After running tests, you'll find these files in the `test-reports/` directory:

```
test-reports/
├── dashboard.html              # Interactive dashboard (light theme)
├── dashboard-dark.html         # Interactive dashboard (dark theme)
├── report.html                # Basic HTML report
└── cucumber-report.json       # JSON test results
```

## 🎨 Dashboard Themes

### Light Theme
- Clean, professional appearance
- High contrast for readability
- Suitable for daytime viewing

### Dark Theme
- Easy on the eyes
- Better for low-light environments
- Modern, sleek appearance

## 🔍 Search and Filter

### Search Functionality
- Search across features, scenarios, and steps
- Real-time filtering as you type
- Case-insensitive search

### Filter Options
- **All**: Show all test results
- **Passed**: Show only passed scenarios
- **Failed**: Show only failed scenarios
- **Skipped**: Show only skipped scenarios

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- **Desktop**: Full-featured experience
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly interface

## 🚀 Advanced Usage

### Custom Dashboard Generation

```typescript
import { TestReporter } from './src/reporting/TestReporter';

// Create reporter with custom configuration
const reporter = new TestReporter({
  theme: 'dark',
  showPerformanceMetrics: true,
  autoRefresh: true,
  refreshInterval: 3000
});

// Generate custom dashboard
const customDashboard = reporter.generateCustomDashboard({
  theme: 'light',
  showStepDetails: false
});

// Save to custom location
fs.writeFileSync('custom-dashboard.html', customDashboard);
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test with Dashboard

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      - run: npm run test:dashboard
      
      # Upload dashboard as artifact
      - uses: actions/upload-artifact@v3
        with:
          name: test-dashboard
          path: test-reports/*.html
```

### Performance Analysis

The dashboard helps identify:

1. **Slow Tests**: Find scenarios that take too long
2. **Bottlenecks**: Identify slowest steps and scenarios
3. **Flaky Tests**: Track inconsistent test results
4. **Test Coverage**: See which features are tested most

## 🛠️ Troubleshooting

### Common Issues

1. **No Dashboard Generated**
   - Ensure tests were executed successfully
   - Check that `test-reports/` directory exists
   - Verify no errors during test execution

2. **Empty Dashboard**
   - Run tests that actually execute scenarios
   - Check that step definitions are properly loaded
   - Verify feature files are in the correct location

3. **Dashboard Not Opening**
   - Ensure HTML file was generated correctly
   - Check file permissions
   - Try opening in different browser

### Debug Mode

Enable debug logging to troubleshoot:

```bash
# Run with verbose output
npm test -- --verbose

# Check generated files
ls -la test-reports/
```

## 📚 Examples

### Example 1: Basic Test Run

```bash
# Run all tests with dashboard
npm run test:dashboard

# Open dashboard
open test-reports/dashboard.html
```

### Example 2: Specific Feature

```bash
# Run specific feature with dashboard
npm test -- features/s3-operations.feature

# View results
open test-reports/dashboard.html
```

### Example 3: Custom Configuration

```bash
# Run with custom dashboard settings
DASHBOARD_THEME=dark DASHBOARD_AUTO_REFRESH=true npm test
```

## 🎯 Best Practices

1. **Run Real Tests**: Dashboard works best with actual test execution
2. **Use Meaningful Names**: Clear feature/scenario names improve readability
3. **Monitor Performance**: Use dashboard to identify slow tests
4. **Share Results**: Use dashboard for team collaboration
5. **Version Control**: Include dashboard files in your repository

## 📞 Support

For issues with dashboard generation:

1. Check the console output for errors
2. Verify test execution completed successfully
3. Ensure all dependencies are installed
4. Check the generated HTML files
5. Open an issue on GitHub with details

## 🔄 Auto-Refresh

Enable auto-refresh for real-time monitoring:

```typescript
const reporter = new TestReporter({
  autoRefresh: true,
  refreshInterval: 5000  // Refresh every 5 seconds
});
```

This is useful for:
- Long-running test suites
- Continuous monitoring