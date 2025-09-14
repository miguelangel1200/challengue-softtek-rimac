// tests/env.setup.js
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-2';
process.env.STAGE = 'test';

// Mock environment variables for tests
process.env.RDS_HOST = 'mock-rds-host';
process.env.RDS_USERNAME = 'mock-user';
process.env.RDS_PASSWORD = 'mock-password';
process.env.RDS_PE_DATABASE = 'mock_pe_db';
process.env.RDS_CL_DATABASE = 'mock_cl_db';
process.env.JWT_SECRET = 'mock-jwt-secret-for-testing-only';

// DynamoDB table name for tests
process.env.DYNAMODB_TABLE = 'test-appointments-table';
