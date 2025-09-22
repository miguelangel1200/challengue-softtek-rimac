// tests/setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock AWS SDK
jest.mock('aws-sdk');

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.DYNAMODB_TABLE = 'test-appointments-table';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-2:123456789012:test-topic';
process.env.EVENTBRIDGE_BUS_NAME = 'test-event-bus';
process.env.JWT_SECRET = 'test-secret-key';

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
