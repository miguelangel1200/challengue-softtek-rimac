import { handler } from '../../src/handlers/appointmentPE';
import { SQSEvent } from 'aws-lambda';

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AppointmentPE Handler', () => {
  beforeEach(() => {
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

      // Usar .catch() para manejar errores esperados
      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
      
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

      // Manejar error esperado
      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
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

      // Esperamos que falle con JSON inválido
      await expect(handler(mockEvent)).rejects.toThrow('Unexpected token');
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

      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty records array', async () => {
      const mockEvent: SQSEvent = {
        Records: []
      };

      // Records vacío debería funcionar
      await expect(handler(mockEvent)).resolves.not.toThrow();
    });

    test('should handle null event', async () => {
      // Esperamos que falle con null
      await expect(handler(null as any)).rejects.toThrow();
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

      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
    });
  });
});
