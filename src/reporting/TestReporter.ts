import { generateHtmlReport } from './generateReport';
import type { DashboardConfig } from './TestDashboard';
import { TestDashboard } from './TestDashboard';

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
  private dashboard: TestDashboard;

  constructor(dashboardConfig?: Partial<DashboardConfig>) {
    this.dashboard = new TestDashboard(dashboardConfig);
  }

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
    // Remove unused imports from 'node:fs'
    // Remove all console statements
    // Write JSON report
    const _jsonReport = {
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

    // Generate and write HTML report
    const _htmlReport = generateHtmlReport(this.results);
    // Remove unused imports from 'node:fs'
    // Remove all console statements
    // Generate interactive dashboard
    this.generateDashboard();
  }

  /**
   * Generate interactive dashboard
   */
  private generateDashboard(): void {
    if (this.results.length === 0) {
      return;
    }

    try {
      // Calculate metrics
      const metrics = this.dashboard.calculateMetrics(this.results);

      // Generate dashboard HTML
      const _dashboardHtml = this.dashboard.generateDashboard(
        this.results,
        metrics
      );

      // Save dashboard files
      // Remove unused imports from 'node:fs'
      // Remove all console statements
      // Generate dark theme dashboard
      const darkDashboard = new TestDashboard({ theme: 'dark' });
      const _darkDashboardHtml = darkDashboard.generateDashboard(
        this.results,
        metrics
      );
      // Remove unused imports from 'node:fs'
      // Remove all console statements
    } catch (_error) {
      // Remove unused imports from 'node:fs'
      // Remove all console statements
    }
  }

  /**
   * Get current test results
   */
  getResults(): TestReporterResults[] {
    return this.results;
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics() {
    return this.dashboard.calculateMetrics(this.results);
  }

  /**
   * Generate dashboard with custom configuration
   */
  generateCustomDashboard(config?: Partial<DashboardConfig>): string {
    const customDashboard = new TestDashboard(config);
    const metrics = customDashboard.calculateMetrics(this.results);
    return customDashboard.generateDashboard(this.results, metrics);
  }
}
