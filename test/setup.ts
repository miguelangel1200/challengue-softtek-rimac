// Jest setup file
import { jest } from '@jest/globals';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('mysql2/promise');

// Set up environment variables for tests
process.env.AWS_REGION = 'us-east-2';
process.env.DYNAMODB_TABLE = 'test-table';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-2:123456789012:test-topic';
process.env.SQS_PE_URL = 'https://sqs.us-east-2.amazonaws.com/123456789012/test-pe';
process.env.SQS_CL_URL = 'https://sqs.us-east-2.amazonaws.com/123456789012/test-cl';
process.env.EVENTBRIDGE_BUS_NAME = 'test-bus';
process.env.RDS_HOST = 'localhost';
process.env.RDS_USERNAME = 'test';
process.env.RDS_PASSWORD = 'test';
process.env.RDS_PORT = '3306';
process.env.RDS_PE_DATABASE = 'appointment_pe';
process.env.RDS_CL_DATABASE = 'appointment_cl';
