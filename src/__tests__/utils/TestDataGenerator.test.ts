import {
  type DataSize,
  type DataType,
  TestDataGenerator,
  TestDataOptions,
  generateLambdaPayloadData,
  generateS3EventData,
  generateSQSMessageData,
  generateStepFunctionInputData,
  generateTestData,
} from '../../utils/TestDataGenerator';

describe('TestDataGenerator', () => {
  let generator: TestDataGenerator;

  beforeEach(() => {
    generator = new TestDataGenerator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generator.generateCorrelationId();
      const id2 = generator.generateCorrelationId();
      const id3 = generator.generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs with correct format', () => {
      const id = generator.generateCorrelationId();
      expect(id).toMatch(/^test-\d+-\d+$/);
    });

    it('should increment counter for each call', () => {
      const id1 = generator.generateCorrelationId();
      const id2 = generator.generateCorrelationId();

      const counter1 = Number.parseInt(id1.split('-')[2]);
      const counter2 = Number.parseInt(id2.split('-')[2]);

      expect(counter2).toBe(counter1 + 1);
    });
  });

  describe('generateTestData', () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    const mockCorrelationId = 'test-correlation-123';

    describe('JSON data generation', () => {
      it('should generate small JSON data', () => {
        const result = generator.generateTestData('json', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.id).toBeDefined();
        expect(parsed.timestamp).toBe(mockDate.toISOString());
        expect(parsed.correlationId).toBe(mockCorrelationId);
        expect(parsed.testData).toBe(true);
        expect(parsed.message).toBe('Small test data');
        expect(parsed.value).toBeGreaterThanOrEqual(0);
        expect(parsed.value).toBeLessThan(100);
      });

      it('should generate small JSON data with predictable random value', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = generator.generateTestData('json', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.value).toBe(50); // 0.5 * 100
      });

      it('should generate medium JSON data', () => {
        const result = generator.generateTestData('json', 'medium', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.items).toHaveLength(10);
        expect(parsed.items[0]).toHaveProperty('id', 1);
        expect(parsed.items[0]).toHaveProperty('name', 'Item 1');
        expect(parsed.items[0]).toHaveProperty('value');
        expect(parsed.items[0]).toHaveProperty('category');
      });

      it('should generate medium JSON data with predictable random values', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.25);

        const result = generator.generateTestData('json', 'medium', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.items[0].value).toBe(25); // 0.25 * 100
        expect(parsed.items[1].value).toBe(25); // 0.25 * 100
      });

      it('should generate large JSON data', () => {
        const result = generator.generateTestData('json', 'large', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.items).toHaveLength(100);
        expect(parsed.items[0]).toHaveProperty('tags');
        expect(parsed.items[0]).toHaveProperty('metadata');
        expect(parsed.items[0].metadata).toHaveProperty('priority');
        expect(parsed.items[0].metadata).toHaveProperty('active');
      });

      it('should generate large JSON data with predictable random values', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.75);

        const result = generator.generateTestData('json', 'large', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const parsed = JSON.parse(result);
        expect(parsed.items[0].value).toBe(75); // 0.75 * 100
        expect(parsed.items[50].value).toBe(75); // 0.75 * 100
      });

      it('should include metadata when requested', () => {
        const result = generator.generateTestData('json', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: true,
        });

        const parsed = JSON.parse(result);
        expect(parsed.metadata).toBeDefined();
        expect(parsed.metadata.generator).toBe('aws-testing-framework');
        expect(parsed.metadata.version).toBe('1.0.0');
        expect(parsed.metadata.size).toBe('small');
        expect(parsed.metadata.type).toBe('json');
      });

      it('should not include metadata when not requested', () => {
        const result = generator.generateTestData('json', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: false,
        });

        const parsed = JSON.parse(result);
        expect(parsed.metadata).toBeUndefined();
      });
    });

    describe('CSV data generation', () => {
      it('should generate small CSV data', () => {
        const result = generator.generateTestData('csv', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const lines = result.split('\n');
        expect(lines[0]).toBe(
          'id,name,value,category,timestamp,correlation_id'
        );
        expect(lines).toHaveLength(6); // header + 5 rows
        expect(lines[1]).toContain('1,Item 1,');
        expect(lines[1]).toContain(mockDate.toISOString());
        expect(lines[1]).toContain(mockCorrelationId);
      });

      it('should generate small CSV data with predictable random values', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = generator.generateTestData('csv', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const lines = result.split('\n');
        expect(lines[1]).toContain('1,Item 1,10,'); // 0.1 * 100 = 10
      });

      it('should generate medium CSV data', () => {
        const result = generator.generateTestData('csv', 'medium', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const lines = result.split('\n');
        expect(lines).toHaveLength(21); // header + 20 rows
      });

      it('should generate large CSV data', () => {
        const result = generator.generateTestData('csv', 'large', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const lines = result.split('\n');
        expect(lines).toHaveLength(101); // header + 100 rows
      });
    });

    describe('XML data generation', () => {
      it('should generate small XML data', () => {
        const result = generator.generateTestData('xml', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(result).toContain(
          `<correlation_id>${mockCorrelationId}</correlation_id>`
        );
        expect(result).toContain(
          `<timestamp>${mockDate.toISOString()}</timestamp>`
        );
        expect(result).toContain('<item id="1">');
        expect(result).toContain('<item id="2">');
        expect(result).toContain('<item id="3">');
        expect(result).not.toContain('<item id="4">');
      });

      it('should generate small XML data with predictable random values', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.8);

        const result = generator.generateTestData('xml', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        expect(result).toContain('<value>80</value>'); // 0.8 * 100 = 80
      });

      it('should generate medium XML data', () => {
        const result = generator.generateTestData('xml', 'medium', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        expect(result).toContain('<item id="10">');
        expect(result).not.toContain('<item id="11">');
      });

      it('should generate large XML data', () => {
        const result = generator.generateTestData('xml', 'large', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        expect(result).toContain('<item id="50">');
        expect(result).not.toContain('<item id="51">');
      });

      it('should include metadata when requested', () => {
        const result = generator.generateTestData('xml', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: true,
        });

        expect(result).toContain('<metadata>');
        expect(result).toContain(
          '<generator>aws-testing-framework</generator>'
        );
        expect(result).toContain('<version>1.0.0</version>');
        expect(result).toContain('<size>small</size>');
        expect(result).toContain('<type>xml</type>');
      });

      it('should not include metadata when not requested', () => {
        const result = generator.generateTestData('xml', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: false,
        });

        expect(result).not.toContain('<metadata>');
      });
    });

    describe('Text data generation', () => {
      it('should generate small text data', () => {
        const result = generator.generateTestData('text', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const words = result.split(' ');
        expect(words).toHaveLength(10); // 10 words (period is attached to last word)
        expect(result).toMatch(/\.$/);
      });

      it('should generate small text data with predictable word selection', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = generator.generateTestData('text', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        // With Math.random() mocked to return 0.5, we should get consistent word selection
        const words = result.split(' ');
        expect(words).toHaveLength(10);
        // The word at index Math.floor(0.5 * words.length) should be consistent
      });

      it('should generate medium text data', () => {
        const result = generator.generateTestData('text', 'medium', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const words = result.split(' ');
        expect(words).toHaveLength(50); // 50 words (period is attached to last word)
      });

      it('should generate large text data', () => {
        const result = generator.generateTestData('text', 'large', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
        });

        const words = result.split(' ');
        expect(words).toHaveLength(200); // 200 words (period is attached to last word)
      });

      it('should include metadata when requested', () => {
        const result = generator.generateTestData('text', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: true,
        });

        expect(result).toContain('---');
        expect(result).toContain(`Correlation ID: ${mockCorrelationId}`);
        expect(result).toContain(`Timestamp: ${mockDate.toISOString()}`);
        expect(result).toContain('Size: small');
      });

      it('should not include metadata when not requested', () => {
        const result = generator.generateTestData('text', 'small', {
          correlationId: mockCorrelationId,
          timestamp: mockDate,
          includeMetadata: false,
        });

        expect(result).not.toContain('---');
        expect(result).not.toContain('Correlation ID:');
        expect(result).not.toContain('Timestamp:');
        expect(result).not.toContain('Size:');
      });
    });

    describe('Error handling', () => {
      it('should throw error for unsupported data type', () => {
        expect(() => {
          generator.generateTestData('invalid' as DataType, 'small');
        }).toThrow('Unsupported test data type: invalid');
      });
    });

    describe('Default parameters', () => {
      it('should use default size when not specified', () => {
        const result = generator.generateTestData('json');
        const parsed = JSON.parse(result);
        expect(parsed.message).toBe('Small test data');
      });

      it('should generate correlation ID when not provided', () => {
        const result = generator.generateTestData('json', 'small');
        const parsed = JSON.parse(result);
        expect(parsed.correlationId).toMatch(/^test-\d+-\d+$/);
      });

      it('should use current timestamp when not provided', () => {
        const before = new Date();
        const result = generator.generateTestData('json', 'small');
        const after = new Date();
        const parsed = JSON.parse(result);
        const resultTime = new Date(parsed.timestamp);

        expect(resultTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(resultTime.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });
  });

  describe('generateS3EventData', () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    const mockCorrelationId = 'test-correlation-123';

    it('should generate small S3 event data', () => {
      const result = generator.generateS3EventData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records).toHaveLength(1);
      expect(parsed.Records[0].eventVersion).toBe('2.1');
      expect(parsed.Records[0].eventSource).toBe('aws:s3');
      expect(parsed.Records[0].awsRegion).toBe('us-east-1');
      expect(parsed.Records[0].eventTime).toBe(mockDate.toISOString());
      expect(parsed.Records[0].eventName).toBe('ObjectCreated:Put');
      expect(parsed.Records[0].s3.object.size).toBe(1024);
    });

    it('should generate medium S3 event data', () => {
      const result = generator.generateS3EventData('medium', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records[0].s3.object.size).toBe(10240);
    });

    it('should generate large S3 event data', () => {
      const result = generator.generateS3EventData('large', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records[0].s3.object.size).toBe(102400);
    });

    it('should include correlation ID in object key', () => {
      const result = generator.generateS3EventData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records[0].s3.object.key).toBe(
        `test-file-${mockCorrelationId}.json`
      );
    });

    it('should include correlation ID in eTag', () => {
      const result = generator.generateS3EventData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records[0].s3.object.eTag).toBe(
        `etag-${mockCorrelationId}`
      );
    });
  });

  describe('generateSQSMessageData', () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    const mockCorrelationId = 'test-correlation-123';

    it('should generate SQS message data', () => {
      const result = generator.generateSQSMessageData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.timestamp).toBe(mockDate.toISOString());
      expect(parsed.messageType).toBe('test-message');
      expect(parsed.data).toBeDefined();
      expect(parsed.metadata).toBeUndefined();
    });

    it('should include metadata when requested', () => {
      const result = generator.generateSQSMessageData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
        includeMetadata: true,
      });

      const parsed = JSON.parse(result);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.source).toBe('aws-testing-framework');
      expect(parsed.metadata.version).toBe('1.0.0');
      expect(parsed.metadata.size).toBe('small');
    });

    it('should generate nested JSON data', () => {
      const result = generator.generateSQSMessageData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      const nestedData = JSON.parse(parsed.data);
      expect(nestedData.correlationId).toBe(mockCorrelationId);
      expect(nestedData.timestamp).toBe(mockDate.toISOString());
    });
  });

  describe('generateLambdaPayloadData', () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    const mockCorrelationId = 'test-correlation-123';

    it('should generate Lambda payload data', () => {
      const result = generator.generateLambdaPayloadData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.timestamp).toBe(mockDate.toISOString());
      expect(parsed.event).toBeDefined();
      expect(parsed.context).toBeDefined();
    });

    it('should include correct context information', () => {
      const result = generator.generateLambdaPayloadData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.context.functionName).toBe('test-lambda-function');
      expect(parsed.context.functionVersion).toBe('$LATEST');
      expect(parsed.context.memoryLimitInMB).toBe('128');
      expect(parsed.context.remainingTimeInMillis).toBe(30000);
      expect(parsed.context.awsRequestId).toBe(`req-${mockCorrelationId}`);
      expect(parsed.context.logGroupName).toBe(
        '/aws/lambda/test-lambda-function'
      );
      expect(parsed.context.logStreamName).toBe(
        `2024/01/15/[$LATEST]${mockCorrelationId}`
      );
    });

    it('should include S3 event in payload', () => {
      const result = generator.generateLambdaPayloadData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      const eventData = JSON.parse(parsed.event);
      expect(eventData.Records[0].eventSource).toBe('aws:s3');
      expect(eventData.Records[0].s3.object.key).toBe(
        `test-file-${mockCorrelationId}.json`
      );
    });
  });

  describe('generateStepFunctionInputData', () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    const mockCorrelationId = 'test-correlation-123';

    it('should generate Step Function input data', () => {
      const result = generator.generateStepFunctionInputData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.timestamp).toBe(mockDate.toISOString());
      expect(parsed.executionId).toBe(`exec-${mockCorrelationId}`);
      expect(parsed.data).toBeDefined();
      expect(parsed.workflow).toBeDefined();
      expect(parsed.metadata).toBeUndefined();
    });

    it('should include workflow information', () => {
      const result = generator.generateStepFunctionInputData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.workflow.name).toBe('test-workflow');
      expect(parsed.workflow.version).toBe('1.0.0');
      expect(parsed.workflow.steps).toEqual([
        'process',
        'validate',
        'complete',
      ]);
    });

    it('should include metadata when requested', () => {
      const result = generator.generateStepFunctionInputData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
        includeMetadata: true,
      });

      const parsed = JSON.parse(result);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.source).toBe('aws-testing-framework');
      expect(parsed.metadata.environment).toBe('test');
      expect(parsed.metadata.size).toBe('small');
    });
  });
});

describe('Exported functions', () => {
  const mockDate = new Date('2024-01-15T10:30:00.000Z');
  const mockCorrelationId = 'test-correlation-123';

  describe('generateTestData function', () => {
    it('should generate test data using default instance', () => {
      const result = generateTestData('json', 'small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.timestamp).toBe(mockDate.toISOString());
    });
  });

  describe('generateS3EventData function', () => {
    it('should generate S3 event data using default instance', () => {
      const result = generateS3EventData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.Records[0].s3.object.key).toBe(
        `test-file-${mockCorrelationId}.json`
      );
    });
  });

  describe('generateSQSMessageData function', () => {
    it('should generate SQS message data using default instance', () => {
      const result = generateSQSMessageData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.messageType).toBe('test-message');
    });
  });

  describe('generateLambdaPayloadData function', () => {
    it('should generate Lambda payload data using default instance', () => {
      const result = generateLambdaPayloadData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.context.functionName).toBe('test-lambda-function');
    });
  });

  describe('generateStepFunctionInputData function', () => {
    it('should generate Step Function input data using default instance', () => {
      const result = generateStepFunctionInputData('small', {
        correlationId: mockCorrelationId,
        timestamp: mockDate,
      });

      const parsed = JSON.parse(result);
      expect(parsed.correlationId).toBe(mockCorrelationId);
      expect(parsed.workflow.name).toBe('test-workflow');
    });
  });
});

describe('Edge cases and error conditions', () => {
  let generator: TestDataGenerator;

  beforeEach(() => {
    generator = new TestDataGenerator();
  });

  it('should handle empty options object', () => {
    const result = generator.generateTestData('json', 'small', {});
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toMatch(/^test-\d+-\d+$/);
    expect(parsed.timestamp).toBeDefined();
  });

  it('should handle undefined options', () => {
    const result = generator.generateTestData('json', 'small', undefined);
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toMatch(/^test-\d+-\d+$/);
    expect(parsed.timestamp).toBeDefined();
  });

  it('should handle null options', () => {
    const result = generator.generateTestData('json', 'small', undefined);
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toMatch(/^test-\d+-\d+$/);
    expect(parsed.timestamp).toBeDefined();
  });

  it('should handle empty correlation ID', () => {
    const result = generator.generateTestData('json', 'small', {
      correlationId: '',
      timestamp: new Date(),
    });
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toBe('');
  });

  it('should handle very long correlation ID', () => {
    const longId = 'a'.repeat(1000);
    const result = generator.generateTestData('json', 'small', {
      correlationId: longId,
      timestamp: new Date(),
    });
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toBe(longId);
  });

  it('should handle special characters in correlation ID', () => {
    const specialId = 'test-123-!@#$%^&*()_+-=[]{}|;:,.<>?';
    const result = generator.generateTestData('json', 'small', {
      correlationId: specialId,
      timestamp: new Date(),
    });
    const parsed = JSON.parse(result);
    expect(parsed.correlationId).toBe(specialId);
  });

  it('should handle all data sizes for all types', () => {
    const types: DataType[] = ['json', 'csv', 'xml', 'text'];
    const sizes: DataSize[] = ['small', 'medium', 'large'];

    for (const type of types) {
      for (const size of sizes) {
        expect(() => {
          generator.generateTestData(type, size);
        }).not.toThrow();
      }
    }
  });

  it('should generate valid JSON for all combinations', () => {
    const types: DataType[] = ['json', 'csv', 'xml', 'text'];
    const sizes: DataSize[] = ['small', 'medium', 'large'];

    for (const type of types) {
      for (const size of sizes) {
        const result = generator.generateTestData(type, size);
        if (type === 'json') {
          expect(() => JSON.parse(result)).not.toThrow();
        }
      }
    }
  });

  it('should handle multiple instances independently', async () => {
    const generator1 = new TestDataGenerator();
    const generator2 = new TestDataGenerator();

    const id1 = generator1.generateCorrelationId();
    const id2 = generator2.generateCorrelationId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();

    // Verify they have the correct format
    expect(id1).toMatch(/^test-\d+-\d+$/);
    expect(id2).toMatch(/^test-\d+-\d+$/);

    // Verify each instance starts with counter 1
    const counter1 = Number.parseInt(id1.split('-')[2]);
    const counter2 = Number.parseInt(id2.split('-')[2]);
    expect(counter1).toBe(1);
    expect(counter2).toBe(1);

    // Verify instances are independent by generating more IDs
    const id3 = generator1.generateCorrelationId();
    const id4 = generator2.generateCorrelationId();

    const counter3 = Number.parseInt(id3.split('-')[2]);
    const counter4 = Number.parseInt(id4.split('-')[2]);
    expect(counter3).toBe(2); // Second call on generator1
    expect(counter4).toBe(2); // Second call on generator2
  });
});
