import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateHtmlReport } from './generateReport';

export interface TestFeature {
  name: string;
}

export interface TestScenario {
  name: string;
}

export interface TestStep {
  text: string;
}

export interface TestResult {
  status: string;
  duration: number;
  error?: string;
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

export class TestReporter {
  private results: TestReporterResults[] = [];
  private currentFeature: TestReporterResults | null = null;

  onFeatureStarted(feature: TestFeature) {
    this.currentFeature = {
      feature: feature.name,
      scenarios: [],
    };
    this.results.push(this.currentFeature);
  }

  onScenarioStarted(scenario: TestScenario) {
    if (!this.currentFeature) {
      throw new Error('No feature started');
    }
    this.currentFeature.scenarios.push({
      name: scenario.name,
      status: 'skipped',
      steps: [],
    });
  }

  onStepFinished(step: TestStep, result: TestResult) {
    if (!this.currentFeature) {
      throw new Error('No feature started');
    }
    const currentScenario =
      this.currentFeature.scenarios[this.currentFeature.scenarios.length - 1];
    if (!currentScenario) {
      throw new Error('No scenario started');
    }
    currentScenario.steps.push({
      name: step.text,
      status: result.status,
      duration: result.duration,
      error: result.error,
    });
    currentScenario.status = result.status;
  }

  onScenarioFinished(_scenario: TestScenario, result: TestResult) {
    if (!this.currentFeature) {
      throw new Error('No feature started');
    }
    const currentScenario =
      this.currentFeature.scenarios[this.currentFeature.scenarios.length - 1];
    if (!currentScenario) {
      throw new Error('No scenario started');
    }
    currentScenario.status = result.status;
  }

  onTestRunFinished(_options: unknown) {
    // Create test-reports directory if it doesn't exist
    const reportsDir = 'test-reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write JSON report
    const jsonReport = {
      summary: {
        total: this.results.reduce(
          (acc, feature) => acc + feature.scenarios.length,
          0
        ),
        passed: this.results.reduce(
          (acc, feature) =>
            acc + feature.scenarios.filter((s) => s.status === 'passed').length,
          0
        ),
        failed: this.results.reduce(
          (acc, feature) =>
            acc + feature.scenarios.filter((s) => s.status === 'failed').length,
          0
        ),
        skipped: this.results.reduce(
          (acc, feature) =>
            acc +
            feature.scenarios.filter((s) => s.status === 'skipped').length,
          0
        ),
      },
      features: this.results,
    };

    fs.writeFileSync(
      path.join(reportsDir, 'cucumber-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate and write HTML report
    const htmlReport = generateHtmlReport(this.results);
    fs.writeFileSync(path.join(reportsDir, 'report.html'), htmlReport);
  }

  /**
   * Get current test results
   */
  getResults(): TestReporterResults[] {
    return this.results;
  }
}
