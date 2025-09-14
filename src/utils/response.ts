import { APIGatewayProxyResult } from 'aws-lambda';

export const createResponse = (
  statusCode: number,
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

export const createSuccessResponse = (data: any): APIGatewayProxyResult => {
  return createResponse(200, {
    success: true,
    data
  });
};

export const createErrorResponse = (
  statusCode: number, 
  message: string, 
  error?: any
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error: message,
    details: error
  });
};
