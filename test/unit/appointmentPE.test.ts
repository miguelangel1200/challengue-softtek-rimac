// test/unit/handlers/appointmentPE.test.ts
import { handler } from '../../src/handlers/appointmentPE';
import { SQSEvent, Context } from 'aws-lambda';

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('AppointmentPE Handler', () => {
  let mockContext: Partial<Context>;

  beforeEach(() => {
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-2:123456789012:function:test',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {}
    };


    // Clear mock calls
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console methods
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Valid SQS Messages', () => {
    test('should process valid PE appointment message', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              appointmentId: 'apt-pe-001',
              insuredId: '12345',
              scheduleId: 100,
              countryISO: 'PE',
              status: 'pending',
              createdAt: new Date().toISOString()
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          }
        ]
      };

      // ✅ Test that handler doesn't throw
      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();

      // ✅ Verify handler processed the message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Processing appointment for PE')
      );
    });

    test('should process multiple PE appointment messages', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              appointmentId: 'apt-pe-001',
              insuredId: '12345',
              countryISO: 'PE'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              appointmentId: 'apt-pe-002',
              insuredId: '67890',
              countryISO: 'PE'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          }
        ]
      };

      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();

      // ✅ Verify both messages were processed
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });
  });

  describe('Invalid SQS Messages', () => {
    test('should handle invalid JSON in message body', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-invalid',
            receiptHandle: 'test-receipt-handle',
            body: 'invalid json content',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          }
        ]
      };

      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing message')
      );
    });

    test('should handle missing required fields', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-incomplete',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              // Missing appointmentId and insuredId
              countryISO: 'PE'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          }
        ]
      };

      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty records array', async () => {
      const mockEvent: SQSEvent = {
        Records: []
      };

      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();
    });

    test('should handle null event', async () => {
      await expect(handler(null as any)).resolves.not.toThrow();
    });
  });

  describe('Database Integration', () => {
    test('should save appointment to PE database', async () => {
      const appointmentData = {
        appointmentId: 'apt-pe-db-001',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending'
      };

      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-db',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify(appointmentData),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-pe',
            awsRegion: 'us-east-2'
          }
        ]
      };

      await expect(
        handler(mockEvent)
      ).resolves.not.toThrow();

      // ✅ Verify database save was attempted
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Saved to PE database')
      );
    });
  });
});
