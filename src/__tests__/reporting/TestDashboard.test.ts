import { TestDashboard } from '../../reporting/TestDashboard';
import type { TestReporterResults } from '../../reporting/TestReporter';

describe('TestDashboard', () => {
  let dashboard: TestDashboard;
  let mockResults: TestReporterResults[];

  beforeEach(() => {
    dashboard = new TestDashboard();
    mockResults = [
      {
        feature: 'Test Feature 1',
        scenarios: [
          {
            name: 'Scenario 1',
            status: 'passed',
            steps: [
              { name: 'Step 1', status: 'passed', duration: 100 },
              { name: 'Step 2', status: 'passed', duration: 150 },
            ],
          },
          {
            name: 'Scenario 2',
            status: 'failed',
            steps: [
              { name: 'Step 1', status: 'passed', duration: 80 },
              {
                name: 'Step 2',
                status: 'failed',
                duration: 0,
                error: 'Test error',
              },
            ],
          },
        ],
      },
      {
        feature: 'Test Feature 2',
        scenarios: [
          {
            name: 'Scenario 3',
            status: 'skipped',
            steps: [{ name: 'Step 1', status: 'skipped', duration: 0 }],
          },
        ],
      },
    ];
  });

  describe('calculateMetrics', () => {
    it('should calculate correct metrics', () => {
      const metrics = dashboard.calculateMetrics(mockResults);

      expect(metrics.totalFeatures).toBe(2);
      expect(metrics.totalScenarios).toBe(3);
      expect(metrics.totalSteps).toBe(5);
      expect(metrics.passedScenarios).toBe(1);
      expect(metrics.failedScenarios).toBe(1);
      expect(metrics.skippedScenarios).toBe(1);
      expect(metrics.successRate).toBeCloseTo(33.33, 2); // 1/3 * 100
      expect(metrics.averageScenarioDuration).toBe(110); // (250 + 80 + 0) / 3
      expect(metrics.averageStepDuration).toBe(66); // (100 + 150 + 80 + 0 + 0) / 5
    });

    it('should handle empty results', () => {
      const metrics = dashboard.calculateMetrics([]);

      expect(metrics.totalFeatures).toBe(0);
      expect(metrics.totalScenarios).toBe(0);
      expect(metrics.totalSteps).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageScenarioDuration).toBe(0);
      expect(metrics.averageStepDuration).toBe(0);
    });

    it('should identify slowest items', () => {
      const metrics = dashboard.calculateMetrics(mockResults);

      expect(metrics.slowestFeature).toBe('Test Feature 1');
      expect(metrics.slowestScenario).toBe('Scenario 1');
      expect(metrics.slowestStep).toBe('Step 2'); // 150ms
    });
  });

  describe('generateDashboard', () => {
    it('should generate HTML dashboard', () => {
      const metrics = dashboard.calculateMetrics(mockResults);
      const html = dashboard.generateDashboard(mockResults, metrics);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Execution Dashboard');
      expect(html).toContain('Test Feature 1');
      expect(html).toContain('Test Feature 2');
      expect(html).toContain('Scenario 1');
      expect(html).toContain('Scenario 2');
      expect(html).toContain('Step 1');
      expect(html).toContain('Step 2');
    });

    it('should include metrics in dashboard', () => {
      const metrics = dashboard.calculateMetrics(mockResults);
      const html = dashboard.generateDashboard(mockResults, metrics);

      expect(html).toContain('2'); // totalFeatures
      expect(html).toContain('3'); // totalScenarios
      expect(html).toContain('5'); // totalSteps
      expect(html).toContain('33.3'); // successRate
    });

    it('should handle dark theme', () => {
      const darkDashboard = new TestDashboard({ theme: 'dark' });
      const metrics = dashboard.calculateMetrics(mockResults);
      const html = darkDashboard.generateDashboard(mockResults, metrics);

      expect(html).toContain('#1a1a1a'); // dark background
      expect(html).toContain('#ffffff'); // light text
    });

    it('should include performance metrics when enabled', () => {
      const dashboardWithMetrics = new TestDashboard({
        showPerformanceMetrics: true,
      });
      const metrics = dashboard.calculateMetrics(mockResults);
      const html = dashboardWithMetrics.generateDashboard(mockResults, metrics);

      expect(html).toContain('Performance Analysis');
      expect(html).toContain('Slowest Feature');
      expect(html).toContain('Slowest Scenario');
      expect(html).toContain('Slowest Step');
    });

    it('should not include performance metrics when disabled', () => {
      const dashboardWithoutMetrics = new TestDashboard({
        showPerformanceMetrics: false,
      });
      const metrics = dashboard.calculateMetrics(mockResults);
      const html = dashboardWithoutMetrics.generateDashboard(
        mockResults,
        metrics
      );

      expect(html).not.toContain('Performance Analysis');
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultDashboard = new TestDashboard();
      expect(defaultDashboard).toBeDefined();
    });

    it('should use custom configuration', () => {
      const customDashboard = new TestDashboard({
        theme: 'dark',
        showPerformanceMetrics: false,
        autoRefresh: true,
        refreshInterval: 3000,
      });
      expect(customDashboard).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle results with errors', () => {
      const resultsWithErrors: TestReporterResults[] = [
        {
          feature: 'Error Feature',
          scenarios: [
            {
              name: 'Error Scenario',
              status: 'failed',
              steps: [
                {
                  name: 'Error Step',
                  status: 'failed',
                  duration: 0,
                  error: 'Test error message',
                },
              ],
            },
          ],
        },
      ];

      const metrics = dashboard.calculateMetrics(resultsWithErrors);
      const html = dashboard.generateDashboard(resultsWithErrors, metrics);

      expect(html).toContain('Error Feature');
      expect(html).toContain('Error Scenario');
      expect(html).toContain('Error Step');
      expect(html).toContain('Test error message');
    });
  });
});
