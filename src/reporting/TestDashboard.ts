import type { TestReporterResults } from './TestReporter';

export interface DashboardConfig {
  theme?: 'light' | 'dark';
  showPerformanceMetrics?: boolean;
  showStepDetails?: boolean;
  autoRefresh?: boolean;
  maxFeaturesToShow?: number;
  refreshInterval?: number;
}

export interface DashboardMetrics {
  totalFeatures: number;
  totalScenarios: number;
  totalSteps: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  successRate: number;
  averageScenarioDuration: number;
  averageStepDuration: number;
  slowestFeature: string;
  slowestScenario: string;
  slowestStep: string;
}

export class TestDashboard {
  private config: Required<DashboardConfig>;

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      theme: 'light',
      showPerformanceMetrics: true,
      showStepDetails: true,
      autoRefresh: false,
      maxFeaturesToShow: 50,
      refreshInterval: 5000,
      ...config,
    };
  }

  /**
   * Calculate dashboard metrics from test results
   */
  calculateMetrics(results: TestReporterResults[]): DashboardMetrics {
    const totalFeatures = results.length;
    const totalScenarios = results.reduce(
      (acc, feature) => acc + feature.scenarios.length,
      0
    );
    const totalSteps = results.reduce(
      (acc, feature) =>
        acc +
        feature.scenarios.reduce(
          (scenarioAcc, scenario) => scenarioAcc + scenario.steps.length,
          0
        ),
      0
    );

    const passedScenarios = results.reduce(
      (acc, feature) =>
        acc + feature.scenarios.filter((s) => s.status === 'passed').length,
      0
    );
    const failedScenarios = results.reduce(
      (acc, feature) =>
        acc + feature.scenarios.filter((s) => s.status === 'failed').length,
      0
    );
    const skippedScenarios = results.reduce(
      (acc, feature) =>
        acc + feature.scenarios.filter((s) => s.status === 'skipped').length,
      0
    );

    const successRate =
      totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : 0;

    // Calculate average durations
    const allScenarioDurations = results.flatMap((feature) =>
      feature.scenarios.map((scenario) =>
        scenario.steps.reduce((acc, step) => acc + step.duration, 0)
      )
    );
    const averageScenarioDuration =
      allScenarioDurations.length > 0
        ? allScenarioDurations.reduce((acc, duration) => acc + duration, 0) /
          allScenarioDurations.length
        : 0;

    const allStepDurations = results.flatMap((feature) =>
      feature.scenarios.flatMap((scenario) =>
        scenario.steps.map((step) => step.duration)
      )
    );
    const averageStepDuration =
      allStepDurations.length > 0
        ? allStepDurations.reduce((acc, duration) => acc + duration, 0) /
          allStepDurations.length
        : 0;

    // Find slowest items
    const featureDurations = results.map((feature) => ({
      name: feature.feature,
      duration: feature.scenarios.reduce(
        (acc, scenario) =>
          acc +
          scenario.steps.reduce((stepAcc, step) => stepAcc + step.duration, 0),
        0
      ),
    }));
    const slowestFeature =
      featureDurations.length > 0
        ? featureDurations.reduce((max, feature) =>
            feature.duration > max.duration ? feature : max
          ).name
        : '';

    const scenarioDurations = results.flatMap((feature) =>
      feature.scenarios.map((scenario) => ({
        name: scenario.name,
        duration: scenario.steps.reduce((acc, step) => acc + step.duration, 0),
      }))
    );
    const slowestScenario =
      scenarioDurations.length > 0
        ? scenarioDurations.reduce((max, scenario) =>
            scenario.duration > max.duration ? scenario : max
          ).name
        : '';

    const stepDurations = results.flatMap((feature) =>
      feature.scenarios.flatMap((scenario) =>
        scenario.steps.map((step) => ({
          name: step.name,
          duration: step.duration,
        }))
      )
    );
    const slowestStep =
      stepDurations.length > 0
        ? stepDurations.reduce((max, step) =>
            step.duration > max.duration ? step : max
          ).name
        : '';

    return {
      totalFeatures,
      totalScenarios,
      totalSteps,
      passedScenarios,
      failedScenarios,
      skippedScenarios,
      successRate,
      averageScenarioDuration,
      averageStepDuration,
      slowestFeature,
      slowestScenario,
      slowestStep,
    };
  }

  /**
   * Generate interactive HTML dashboard
   */
  generateDashboard(
    results: TestReporterResults[],
    metrics: DashboardMetrics
  ): string {
    const theme = this.config.theme;
    const isDark = theme === 'dark';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? '#1a1a1a' : '#f5f5f5'};
            color: ${isDark ? '#ffffff' : '#333333'};
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p {
            font-size: 1.1rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease;
        }

        .metric-card:hover {
            transform: translateY(-2px);
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .metric-label {
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .success { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .info { color: #3b82f6; }

        .features-container {
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .feature {
            margin-bottom: 30px;
            border: 1px solid ${isDark ? '#404040' : '#e5e5e5'};
            border-radius: 8px;
            overflow: hidden;
        }

        .feature-header {
            background: ${isDark ? '#404040' : '#f8f9fa'};
            padding: 20px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        .feature-header:hover {
            background: ${isDark ? '#505050' : '#e9ecef'};
        }

        .feature-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .feature-summary {
            display: flex;
            gap: 20px;
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .scenarios-container {
            padding: 20px;
            display: none;
        }

        .scenario {
            margin-bottom: 20px;
            border: 1px solid ${isDark ? '#404040' : '#e5e5e5'};
            border-radius: 6px;
            overflow: hidden;
        }

        .scenario-header {
            padding: 15px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .scenario-header:hover {
            background: ${isDark ? '#404040' : '#f8f9fa'};
        }

        .scenario-title {
            font-weight: 600;
        }

        .scenario-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-passed {
            background: #dcfce7;
            color: #166534;
        }

        .status-failed {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-skipped {
            background: #fef3c7;
            color: #92400e;
        }

        .steps-container {
            padding: 15px;
            display: none;
        }

        .step {
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 4px;
            border-left: 4px solid;
        }

        .step-passed {
            background: ${isDark ? '#1f2937' : '#f0fdf4'};
            border-left-color: #10b981;
        }

        .step-failed {
            background: ${isDark ? '#1f2937' : '#fef2f2'};
            border-left-color: #ef4444;
        }

        .step-skipped {
            background: ${isDark ? '#1f2937' : '#fffbeb'};
            border-left-color: #f59e0b;
        }

        .step-name {
            font-weight: 500;
            margin-bottom: 5px;
        }

        .step-duration {
            font-size: 0.8rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .step-error {
            margin-top: 8px;
            padding: 8px;
            background: ${isDark ? '#dc2626' : '#fee2e2'};
            color: ${isDark ? '#ffffff' : '#991b1b'};
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.8rem;
            white-space: pre-wrap;
        }

        .performance-chart {
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .chart-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .chart-container {
            height: 300px;
            position: relative;
        }

        .search-container {
            margin-bottom: 20px;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid ${isDark ? '#404040' : '#d1d5db'};
            border-radius: 8px;
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#333333'};
            font-size: 1rem;
        }

        .search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 8px 16px;
            border: 1px solid ${isDark ? '#404040' : '#d1d5db'};
            border-radius: 6px;
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#333333'};
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .filter-btn:hover {
            background: ${isDark ? '#404040' : '#f3f4f6'};
        }

        .filter-btn.active {
            background: #3b82f6;
            color: #ffffff;
            border-color: #3b82f6;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .feature-summary {
                flex-direction: column;
                gap: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Execution Dashboard</h1>
            <p>Comprehensive view of your test execution results with performance metrics and detailed analysis</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value success">${metrics.totalFeatures}</div>
                <div class="metric-label">Features</div>
            </div>
            <div class="metric-card">
                <div class="metric-value info">${metrics.totalScenarios}</div>
                <div class="metric-label">Scenarios</div>
            </div>
            <div class="metric-card">
                <div class="metric-value info">${metrics.totalSteps}</div>
                <div class="metric-label">Steps</div>
            </div>
            <div class="metric-card">
                <div class="metric-value success">${metrics.passedScenarios}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value error">${metrics.failedScenarios}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value warning">${metrics.skippedScenarios}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${metrics.successRate >= 80 ? 'success' : metrics.successRate >= 60 ? 'warning' : 'error'}">${metrics.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value info">${Math.round(metrics.averageScenarioDuration)}ms</div>
                <div class="metric-label">Avg Scenario Duration</div>
            </div>
        </div>

        ${
          this.config.showPerformanceMetrics
            ? `
        <div class="performance-chart">
            <div class="chart-title">Performance Analysis</div>
            <div class="chart-container">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4>Slowest Feature</h4>
                        <p style="font-size: 1.2rem; font-weight: 600; color: #ef4444;">${metrics.slowestFeature || 'N/A'}</p>
                    </div>
                    <div>
                        <h4>Slowest Scenario</h4>
                        <p style="font-size: 1.2rem; font-weight: 600; color: #ef4444;">${metrics.slowestScenario || 'N/A'}</p>
                    </div>
                    <div>
                        <h4>Slowest Step</h4>
                        <p style="font-size: 1.2rem; font-weight: 600; color: #ef4444;">${metrics.slowestStep || 'N/A'}</p>
                    </div>
                    <div>
                        <h4>Average Step Duration</h4>
                        <p style="font-size: 1.2rem; font-weight: 600; color: #3b82f6;">${Math.round(metrics.averageStepDuration)}ms</p>
                    </div>
                </div>
            </div>
        </div>
        `
            : ''
        }

        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search features, scenarios, or steps..." id="searchInput">
        </div>

        <div class="filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="passed">Passed</button>
            <button class="filter-btn" data-filter="failed">Failed</button>
            <button class="filter-btn" data-filter="skipped">Skipped</button>
        </div>

        <div class="features-container">
            ${results
              .map(
                (feature, featureIndex) => `
                <div class="feature" data-feature-index="${featureIndex}">
                    <div class="feature-header" onclick="toggleFeature(${featureIndex})">
                        <div class="feature-title">${this.escapeHtml(feature.feature)}</div>
                        <div class="feature-summary">
                            <span>${feature.scenarios.length} scenarios</span>
                            <span>${feature.scenarios.filter((s) => s.status === 'passed').length} passed</span>
                            <span>${feature.scenarios.filter((s) => s.status === 'failed').length} failed</span>
                            <span>${feature.scenarios.filter((s) => s.status === 'skipped').length} skipped</span>
                        </div>
                    </div>
                    <div class="scenarios-container" id="scenarios-${featureIndex}">
                        ${feature.scenarios
                          .map(
                            (scenario, scenarioIndex) => `
                            <div class="scenario" data-scenario-index="${scenarioIndex}">
                                <div class="scenario-header" onclick="toggleScenario(${featureIndex}, ${scenarioIndex})">
                                    <div class="scenario-title">${this.escapeHtml(scenario.name)}</div>
                                    <div class="scenario-status status-${scenario.status}">${scenario.status}</div>
                                </div>
                                <div class="steps-container" id="steps-${featureIndex}-${scenarioIndex}">
                                    ${scenario.steps
                                      .map(
                                        (step, _stepIndex) => `
                                        <div class="step step-${step.status}">
                                            <div class="step-name">${this.escapeHtml(step.name)}</div>
                                            <div class="step-duration">Duration: ${step.duration}ms</div>
                                            ${step.error ? `<div class="step-error">${this.escapeHtml(step.error)}</div>` : ''}
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
                </div>
            `
              )
              .join('')}
        </div>
    </div>

    <script>
        // Toggle feature visibility
        function toggleFeature(featureIndex) {
            const container = document.getElementById(\`scenarios-\${featureIndex}\`);
            if (container.style.display === 'none' || container.style.display === '') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }

        // Toggle scenario visibility
        function toggleScenario(featureIndex, scenarioIndex) {
            const container = document.getElementById(\`steps-\${featureIndex}-\${scenarioIndex}\`);
            if (container.style.display === 'none' || container.style.display === '') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const features = document.querySelectorAll('.feature');
            
            features.forEach(feature => {
                const featureTitle = feature.querySelector('.feature-title').textContent.toLowerCase();
                const scenarios = feature.querySelectorAll('.scenario');
                let hasMatch = featureTitle.includes(searchTerm);
                
                scenarios.forEach(scenario => {
                    const scenarioTitle = scenario.querySelector('.scenario-title').textContent.toLowerCase();
                    const steps = scenario.querySelectorAll('.step');
                    let scenarioHasMatch = scenarioTitle.includes(searchTerm);
                    
                    steps.forEach(step => {
                        const stepName = step.querySelector('.step-name').textContent.toLowerCase();
                        if (stepName.includes(searchTerm)) {
                            scenarioHasMatch = true;
                            hasMatch = true;
                        }
                    });
                    
                    scenario.style.display = scenarioHasMatch ? 'block' : 'none';
                });
                
                feature.style.display = hasMatch ? 'block' : 'none';
            });
        });

        // Filter functionality
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Update active button
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.dataset.filter;
                const scenarios = document.querySelectorAll('.scenario');
                
                scenarios.forEach(scenario => {
                    const status = scenario.querySelector('.scenario-status').textContent;
                    if (filter === 'all' || status === filter) {
                        scenario.style.display = 'block';
                    } else {
                        scenario.style.display = 'none';
                    }
                });
            });
        });

        ${
          this.config.autoRefresh
            ? `
        // Auto-refresh functionality
        setInterval(() => {
            location.reload();
        }, ${this.config.refreshInterval});
        `
            : ''
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
