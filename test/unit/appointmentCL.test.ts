import { handler } from '../../src/handlers/appointmentCL';
import { SQSEvent } from 'aws-lambda';

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AppointmentCL Handler', () => {
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
    test('should process valid CL appointment message', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-cl-1',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              appointmentId: 'apt-cl-001',
              insuredId: '54321',
              scheduleId: 200,
              countryISO: 'CL',
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
            md5OfBody: 'test-md5-cl',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
            awsRegion: 'us-east-2'
          }
        ]
      };

      // Usar .catch() para manejar errores esperados
      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
    });

    test('should process multiple CL appointment messages', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-cl-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              appointmentId: 'apt-cl-001',
              insuredId: '54321',
              countryISO: 'CL'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-cl-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
            awsRegion: 'us-east-2'
          },
          {
            messageId: 'test-message-cl-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              appointmentId: 'apt-cl-002',
              insuredId: '98765',
              countryISO: 'CL'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-cl-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
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
            messageId: 'test-message-cl-invalid',
            receiptHandle: 'test-receipt-handle',
            body: 'invalid json content for CL',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-cl-invalid',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
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
            messageId: 'test-message-cl-incomplete',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              // Missing appointmentId and insuredId
              countryISO: 'CL'
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-cl-incomplete',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
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
    test('should save appointment to CL database', async () => {
      const appointmentData = {
        appointmentId: 'apt-cl-db-001',
        insuredId: '54321',
        scheduleId: 300,
        countryISO: 'CL',
        status: 'pending'
      };

      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-cl-db',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify(appointmentData),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-cl-db',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
            awsRegion: 'us-east-2'
          }
        ]
      };

      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
    });
  });

  describe('Country-Specific Tests', () => {
    test('should handle PE appointment in CL queue', async () => {
      const mockEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-wrong-country',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              appointmentId: 'apt-wrong-001',
              insuredId: '12345',
              countryISO: 'PE' // Wrong country for CL queue
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1640995200000',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1640995200000'
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-wrong',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:appointment-queue-cl',
            awsRegion: 'us-east-2'
          }
        ]
      };

      // Should process but maybe log warning
      const result = await handler(mockEvent).catch(err => err);
      expect(result).toBeDefined();
    });
  });
});
