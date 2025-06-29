import type { PerformanceMetrics, TestMetrics } from '../types';

export class PerformanceMonitor {
  private performanceMetrics: PerformanceMetrics[] = [];
  private testStartTime: Date | null = null;

  /**
   * Start performance monitoring for a test run
   */
  startTestRun(): void {
    this.testStartTime = new Date();
    this.performanceMetrics = [];
  }

  /**
   * Record performance metrics for an operation
   */
  recordPerformanceMetrics(
    operationName: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    error?: string,
    retryCount = 0,
    awsService = 'unknown'
  ): void {
    const metrics: PerformanceMetrics = {
      operationName,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      success,
      error,
      retryCount,
      awsService,
    };

    this.performanceMetrics.push(metrics);
  }

  /**
   * Get comprehensive test metrics
   */
  getTestMetrics(): TestMetrics {
    if (this.performanceMetrics.length === 0) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        slowestOperation: null,
        fastestOperation: null,
        errorRate: 0,
        retryRate: 0,
      };
    }

    const successfulOperations = this.performanceMetrics.filter(
      (m) => m.success
    );
    const failedOperations = this.performanceMetrics.filter((m) => !m.success);
    const totalDuration = this.performanceMetrics.reduce(
      (sum, m) => sum + m.duration,
      0
    );
    const totalRetries = this.performanceMetrics.reduce(
      (sum, m) => sum + m.retryCount,
      0
    );

    const slowestOperation = this.performanceMetrics.reduce(
      (slowest, current) =>
        current.duration > slowest.duration ? current : slowest
    );

    const fastestOperation = this.performanceMetrics.reduce(
      (fastest, current) =>
        current.duration < fastest.duration ? current : fastest
    );

    return {
      totalTests: this.performanceMetrics.length,
      passedTests: successfulOperations.length,
      failedTests: failedOperations.length,
      averageExecutionTime: totalDuration / this.performanceMetrics.length,
      totalExecutionTime: totalDuration,
      slowestOperation,
      fastestOperation,
      errorRate:
        (failedOperations.length / this.performanceMetrics.length) * 100,
      retryRate: (totalRetries / this.performanceMetrics.length) * 100,
    };
  }

  /**
   * Get performance metrics for specific AWS service
   */
  getServiceMetrics(awsService: string): PerformanceMetrics[] {
    return this.performanceMetrics.filter((m) => m.awsService === awsService);
  }

  /**
   * Get slowest operations (top N)
   */
  getSlowestOperations(count = 5): PerformanceMetrics[] {
    return this.performanceMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * Get operations with most retries
   */
  getOperationsWithMostRetries(count = 5): PerformanceMetrics[] {
    return this.performanceMetrics
      .filter((m) => m.retryCount > 0)
      .sort((a, b) => b.retryCount - a.retryCount)
      .slice(0, count);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const metrics = this.getTestMetrics();
    const slowestOps = this.getSlowestOperations(3);
    const mostRetries = this.getOperationsWithMostRetries(3);

    return `
Performance Report
==================

Test Run Summary:
- Total Operations: ${metrics.totalTests}
- Successful: ${metrics.passedTests}
- Failed: ${metrics.failedTests}
- Success Rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(2)}%
- Error Rate: ${metrics.errorRate.toFixed(2)}%
- Retry Rate: ${metrics.retryRate.toFixed(2)}%

Timing Metrics:
- Total Execution Time: ${metrics.totalExecutionTime}ms
- Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms
- Fastest Operation: ${metrics.fastestOperation?.operationName} (${metrics.fastestOperation?.duration}ms)
- Slowest Operation: ${metrics.slowestOperation?.operationName} (${metrics.slowestOperation?.duration}ms)

Slowest Operations:
${slowestOps.map((op) => `- ${op.operationName}: ${op.duration}ms (${op.retryCount} retries)`).join('\n')}

Operations with Most Retries:
${mostRetries.map((op) => `- ${op.operationName}: ${op.retryCount} retries (${op.duration}ms)`).join('\n')}

Service Breakdown:
${this.getServiceBreakdown()}
    `.trim();
  }

  private getServiceBreakdown(): string {
    const serviceMap = new Map<string, PerformanceMetrics[]>();

    for (const metric of this.performanceMetrics) {
      const existing = serviceMap.get(metric.awsService) || [];
      existing.push(metric);
      serviceMap.set(metric.awsService, existing);
    }

    return Array.from(serviceMap.entries())
      .map(([service, metrics]) => {
        const avgDuration =
          metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        const successRate =
          (metrics.filter((m) => m.success).length / metrics.length) * 100;
        return `- ${service}: ${metrics.length} operations, ${avgDuration.toFixed(2)}ms avg, ${successRate.toFixed(2)}% success`;
      })
      .join('\n');
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = [];
    this.testStartTime = null;
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.performanceMetrics.length;
  }
}
