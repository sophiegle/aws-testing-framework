/**
 * Test Data Generator Utility
 *
 * This module provides utilities for generating test data in various formats
 * for AWS testing scenarios. It's designed to be used independently of the
 * main framework or as a helper within test scenarios.
 */

export interface TestDataOptions {
  correlationId?: string;
  timestamp?: Date;
  includeMetadata?: boolean;
}

export type DataType = 'json' | 'csv' | 'xml' | 'text';
export type DataSize = 'small' | 'medium' | 'large';

export class TestDataGenerator {
  private correlationIdCounter = 0;

  /**
   * Generate a unique correlation ID
   */
  generateCorrelationId(): string {
    this.correlationIdCounter++;
    return `test-${Date.now()}-${this.correlationIdCounter}`;
  }

  /**
   * Generate test data for different scenarios
   */
  generateTestData(
    type: DataType,
    size: DataSize = 'small',
    options: TestDataOptions = {}
  ): string {
    // Handle null/undefined options
    const safeOptions = options || {};
    const correlationId =
      safeOptions.correlationId || this.generateCorrelationId();
    const timestamp = safeOptions.timestamp || new Date();

    switch (type) {
      case 'json':
        return this.generateJSONTestData(size, {
          correlationId,
          timestamp,
          ...safeOptions,
        });
      case 'csv':
        return this.generateCSVTestData(size, {
          correlationId,
          timestamp,
          ...safeOptions,
        });
      case 'xml':
        return this.generateXMLTestData(size, {
          correlationId,
          timestamp,
          ...safeOptions,
        });
      case 'text':
        return this.generateTextTestData(size, {
          correlationId,
          timestamp,
          ...safeOptions,
        });
      default:
        throw new Error(`Unsupported test data type: ${type}`);
    }
  }

  /**
   * Generate JSON test data
   */
  private generateJSONTestData(
    size: DataSize,
    options: TestDataOptions & { correlationId: string; timestamp: Date }
  ): string {
    const baseData = {
      id: Date.now(),
      timestamp: options.timestamp.toISOString(),
      correlationId: options.correlationId,
      testData: true,
    };

    if (options.includeMetadata) {
      Object.assign(baseData, {
        metadata: {
          generator: 'aws-testing-framework',
          version: '1.0.0',
          size,
          type: 'json',
        },
      });
    }

    switch (size) {
      case 'small':
        return JSON.stringify({
          ...baseData,
          message: 'Small test data',
          value: Math.random() * 100,
        });
      case 'medium':
        return JSON.stringify({
          ...baseData,
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.random() * 100,
            category: `Category ${Math.floor(i / 3) + 1}`,
          })),
        });
      case 'large':
        return JSON.stringify({
          ...baseData,
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.random() * 100,
            category: `Category ${Math.floor(i / 10) + 1}`,
            tags: [`tag${(i % 5) + 1}`, `tag${(i % 3) + 1}`],
            metadata: {
              priority: (i % 3) + 1,
              active: i % 2 === 0,
            },
          })),
        });
    }
  }

  /**
   * Generate CSV test data
   */
  private generateCSVTestData(
    size: DataSize,
    options: TestDataOptions & { correlationId: string; timestamp: Date }
  ): string {
    const headers = 'id,name,value,category,timestamp,correlation_id\n';
    const rows = [];

    const rowCount = size === 'small' ? 5 : size === 'medium' ? 20 : 100;

    for (let i = 1; i <= rowCount; i++) {
      rows.push(
        `${i},Item ${i},${Math.random() * 100},Category ${Math.floor(i / 5) + 1},${options.timestamp.toISOString()},${options.correlationId}`
      );
    }

    return headers + rows.join('\n');
  }

  /**
   * Generate XML test data
   */
  private generateXMLTestData(
    size: DataSize,
    options: TestDataOptions & { correlationId: string; timestamp: Date }
  ): string {
    const itemCount = size === 'small' ? 3 : size === 'medium' ? 10 : 50;
    const items = Array.from(
      { length: itemCount },
      (_, i) => `
    <item id="${i + 1}">
      <name>Item ${i + 1}</name>
      <value>${Math.random() * 100}</value>
      <category>Category ${Math.floor(i / 5) + 1}</category>
      <timestamp>${options.timestamp.toISOString()}</timestamp>
      <correlation_id>${options.correlationId}</correlation_id>
    </item>`
    ).join('');

    const metadata = options.includeMetadata
      ? `
  <metadata>
    <generator>aws-testing-framework</generator>
    <version>1.0.0</version>
    <size>${size}</size>
    <type>xml</type>
  </metadata>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<testdata>
  <correlation_id>${options.correlationId}</correlation_id>
  <timestamp>${options.timestamp.toISOString()}</timestamp>${metadata}
  <items>${items}
  </items>
</testdata>`;
  }

  /**
   * Generate text test data
   */
  private generateTextTestData(
    size: DataSize,
    options: TestDataOptions & { correlationId: string; timestamp: Date }
  ): string {
    const wordCount = size === 'small' ? 10 : size === 'medium' ? 50 : 200;
    const words = [
      'lorem',
      'ipsum',
      'dolor',
      'sit',
      'amet',
      'consectetur',
      'adipiscing',
      'elit',
      'sed',
      'do',
      'eiusmod',
      'tempor',
      'incididunt',
      'ut',
      'labore',
      'et',
      'dolore',
      'magna',
      'aliqua',
      'ut',
      'enim',
      'ad',
      'minim',
      'veniam',
      'quis',
      'nostrud',
      'exercitation',
      'ullamco',
      'laboris',
      'nisi',
      'ut',
      'aliquip',
      'ex',
      'ea',
      'commodo',
      'consequat',
      'duis',
      'aute',
      'irure',
      'dolor',
      'in',
      'reprehenderit',
      'voluptate',
      'velit',
      'esse',
      'cillum',
      'dolore',
      'eu',
      'fugiat',
      'nulla',
      'pariatur',
      'excepteur',
      'sint',
      'occaecat',
      'cupidatat',
      'non',
      'proident',
      'sunt',
      'culpa',
      'qui',
      'officia',
      'deserunt',
      'mollit',
      'anim',
      'id',
      'est',
      'laborum',
      'sed',
      'ut',
      'perspiciatis',
      'unde',
      'omnis',
      'iste',
      'natus',
      'error',
      'sit',
      'voluptatem',
      'accusantium',
      'doloremque',
      'laudantium',
      'totam',
      'rem',
      'aperiam',
      'eaque',
      'ipsa',
      'quae',
      'ab',
      'illo',
      'inventore',
      'veritatis',
      'et',
      'quasi',
      'architecto',
      'beatae',
      'vitae',
      'dicta',
      'sunt',
      'explicabo',
      'nemo',
      'enim',
      'ipsam',
      'voluptatem',
      'quia',
      'voluptas',
      'sit',
      'aspernatur',
      'aut',
      'odit',
      'aut',
      'fugit',
      'sed',
      'quia',
      'consequuntur',
      'magni',
      'dolores',
      'eos',
      'qui',
      'ratione',
      'voluptatem',
      'sequi',
      'nesciunt',
      'neque',
      'porro',
      'quisquam',
      'est',
      'qui',
      'dolorem',
      'ipsum',
      'quia',
      'dolor',
      'sit',
      'amet',
      'consectetur',
      'adipisci',
      'velit',
      'sed',
      'quia',
      'non',
      'numquam',
      'eius',
      'modi',
      'tempora',
      'incidunt',
      'ut',
      'labore',
      'et',
      'dolore',
      'magnam',
      'aliquam',
      'quaerat',
      'voluptatem',
      'ut',
      'enim',
      'ad',
      'minima',
      'veniam',
      'quis',
      'nostrum',
      'exercitationem',
      'ullam',
      'corporis',
      'suscipit',
      'laboriosam',
      'nisi',
      'ut',
      'aliquid',
      'ex',
      'ea',
      'commodi',
      'consequatur',
      'quis',
      'autem',
      'vel',
      'eum',
      'iure',
      'reprehenderit',
      'qui',
      'in',
      'ea',
      'voluptate',
      'velit',
      'esse',
      'quam',
      'nihil',
      'molestiae',
      'consequatur',
      'vel',
      'illum',
      'qui',
      'dolorem',
      'eum',
      'fugiat',
      'quo',
      'voluptas',
      'nulla',
      'pariatur',
    ];

    const result = [];
    for (let i = 0; i < wordCount; i++) {
      result.push(words[Math.floor(Math.random() * words.length)]);
    }

    let text = `${result.join(' ')}.`;

    if (options.includeMetadata) {
      text += `\n\n---\nCorrelation ID: ${options.correlationId}\nTimestamp: ${options.timestamp.toISOString()}\nSize: ${size}`;
    }

    return text;
  }

  /**
   * Generate test data for specific AWS service scenarios
   */
  generateS3EventData(
    size: DataSize = 'small',
    options: TestDataOptions = {}
  ): string {
    const correlationId = options.correlationId || this.generateCorrelationId();
    const timestamp = options.timestamp || new Date();

    const eventData = {
      Records: [
        {
          eventVersion: '2.1',
          eventSource: 'aws:s3',
          awsRegion: 'eu-west-2',
          eventTime: timestamp.toISOString(),
          eventName: 'ObjectCreated:Put',
          s3: {
            s3SchemaVersion: '1.0',
            configurationId: 'test-config',
            bucket: {
              name: 'test-bucket',
              ownerIdentity: {
                principalId: 'test-owner',
              },
              arn: 'arn:aws:s3:::test-bucket',
            },
            object: {
              key: `test-file-${correlationId}.json`,
              size:
                size === 'small' ? 1024 : size === 'medium' ? 10240 : 102400,
              eTag: `etag-${correlationId}`,
              sequencer: '0A1B2C3D4E5F678901',
            },
          },
        },
      ],
    };

    return JSON.stringify(eventData, null, 2);
  }

  /**
   * Generate SQS message data
   */
  generateSQSMessageData(
    size: DataSize = 'small',
    options: TestDataOptions = {}
  ): string {
    const correlationId = options.correlationId || this.generateCorrelationId();
    const timestamp = options.timestamp || new Date();

    const messageData = {
      correlationId,
      timestamp: timestamp.toISOString(),
      messageType: 'test-message',
      data: this.generateTestData('json', size, {
        correlationId,
        timestamp,
        ...options,
      }),
      metadata: options.includeMetadata
        ? {
            source: 'aws-testing-framework',
            version: '1.0.0',
            size,
          }
        : undefined,
    };

    return JSON.stringify(messageData, null, 2);
  }

  /**
   * Generate Lambda payload data
   */
  generateLambdaPayloadData(
    size: DataSize = 'small',
    options: TestDataOptions = {}
  ): string {
    const correlationId = options.correlationId || this.generateCorrelationId();
    const timestamp = options.timestamp || new Date();

    const payloadData = {
      correlationId,
      timestamp: timestamp.toISOString(),
      event: this.generateS3EventData(size, {
        correlationId,
        timestamp,
        ...options,
      }),
      context: {
        functionName: 'test-lambda-function',
        functionVersion: '$LATEST',
        invokedFunctionArn:
          'arn:aws:lambda:eu-west-2:123456789012:function:test-lambda-function',
        memoryLimitInMB: '128',
        awsRequestId: `req-${correlationId}`,
        logGroupName: '/aws/lambda/test-lambda-function',
        logStreamName: `2024/01/15/[$LATEST]${correlationId}`,
        remainingTimeInMillis: 30000,
      },
    };

    return JSON.stringify(payloadData, null, 2);
  }

  /**
   * Generate Step Function input data
   */
  generateStepFunctionInputData(
    size: DataSize = 'small',
    options: TestDataOptions = {}
  ): string {
    const correlationId = options.correlationId || this.generateCorrelationId();
    const timestamp = options.timestamp || new Date();

    const inputData = {
      correlationId,
      timestamp: timestamp.toISOString(),
      executionId: `exec-${correlationId}`,
      data: this.generateTestData('json', size, {
        correlationId,
        timestamp,
        ...options,
      }),
      workflow: {
        name: 'test-workflow',
        version: '1.0.0',
        steps: ['process', 'validate', 'complete'],
      },
      metadata: options.includeMetadata
        ? {
            source: 'aws-testing-framework',
            environment: 'test',
            size,
          }
        : undefined,
    };

    return JSON.stringify(inputData, null, 2);
  }
}

// Export a default instance for convenience
export const testDataGenerator = new TestDataGenerator();

// Export individual functions for direct use
export const generateTestData = (
  type: DataType,
  size: DataSize = 'small',
  options?: TestDataOptions
) => testDataGenerator.generateTestData(type, size, options);

export const generateS3EventData = (
  size: DataSize = 'small',
  options?: TestDataOptions
) => testDataGenerator.generateS3EventData(size, options);

export const generateSQSMessageData = (
  size: DataSize = 'small',
  options?: TestDataOptions
) => testDataGenerator.generateSQSMessageData(size, options);

export const generateLambdaPayloadData = (
  size: DataSize = 'small',
  options?: TestDataOptions
) => testDataGenerator.generateLambdaPayloadData(size, options);

export const generateStepFunctionInputData = (
  size: DataSize = 'small',
  options?: TestDataOptions
) => testDataGenerator.generateStepFunctionInputData(size, options);
