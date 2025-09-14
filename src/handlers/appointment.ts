import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../services/DynamoDBService';
import { SNSService } from '../services/SNSService';
import { validateAppointmentRequest, validateInsuredId } from '../utils/validators';
import { AppointmentEntity } from '../models/AppointmentEntity';
import { AppointmentRequest } from '../models/AppointmentRequest';
import { CONSTANTS } from '../utils/constants';
import { Logger } from '../utils/logger';

const dynamoService = new DynamoService();
const snsService = new SNSService();

// Type guard para distinguir entre eventos
function isSQSEvent(event: APIGatewayProxyEvent | SQSEvent): event is SQSEvent {
  return 'Records' in event && Array.isArray((event as SQSEvent).Records);
}

function isAPIGatewayEvent(event: APIGatewayProxyEvent | SQSEvent): event is APIGatewayProxyEvent {
  return 'httpMethod' in event && 'path' in event;
}

export const handler = async (event: APIGatewayProxyEvent | SQSEvent): Promise<APIGatewayProxyResult> => {
  Logger.info('Appointment handler invoked', { 
    eventType: isSQSEvent(event) ? 'SQS' : 'API',
    recordCount: isSQSEvent(event) ? event.Records.length : 'N/A'
  });

  try {
    // Handle SQS events (confirmations)
    if (isSQSEvent(event)) {
      Logger.info('Processing SQS confirmation event', {
        records: event.Records.length
      });
      return await handleSQSEvent(event);
    }

    // Handle API Gateway events
    if (isAPIGatewayEvent(event)) {
      return await handleAPIEvent(event);
    }

    return createErrorResponse(400, 'Invalid event type');
  } catch (error) {
    Logger.error('Error in appointment handler', error);
    return createErrorResponse(500, 'Internal server error');
  }
};


async function handleAPIEvent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const path = event.path;

  if (method === 'POST' && path === '/appointments') {
    return await createAppointment(event);
  }

  if (method === 'GET' && path.startsWith('/appointments/')) {
    return await getAppointmentsByInsuredId(event);
  }

  return createErrorResponse(404, 'Endpoint not found');
}

async function createAppointment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const requestData = JSON.parse(event.body);
    const { error, value } = validateAppointmentRequest(requestData);

    if (error) {
      return createErrorResponse(400, error);
    }

    const appointmentRequest = value as AppointmentRequest;
    const appointmentId = uuidv4();
    const now = new Date().toISOString();

    // Save to DynamoDB
    const appointment: AppointmentEntity = {
      appointmentId,
      insuredId: appointmentRequest.insuredId,
      scheduleId: appointmentRequest.scheduleId,
      countryISO: appointmentRequest.countryISO,
      status: CONSTANTS.STATUS.PENDING,
      createdAt: now,
      updatedAt: now
    };

    await dynamoService.createAppointment(appointment);

    Logger.info('About to publish to SNS', { 
      appointmentId,
      countryISO: appointmentRequest.countryISO 
    });

    // ✅ PROCESAR SÍNCRONAMENTE - ESPERAR SNS
    try {
      await snsService.publishAppointmentMessage({
        appointmentId,
        insuredId: appointmentRequest.insuredId,
        scheduleId: appointmentRequest.scheduleId,
        countryISO: appointmentRequest.countryISO
      });
      
      Logger.info('Message published to SNS successfully', { 
        appointmentId,
        messageId: 'will-be-logged-by-SNSService'
      });
    } catch (snsError) {
      Logger.error('Failed to publish to SNS', snsError);
      // Opcional: marcar appointment como failed en DynamoDB
      throw snsError; // Re-throw para devolver error 500
    }

    Logger.info('Appointment created successfully', { appointmentId });

    // ✅ RESPONDER DESPUÉS DE COMPLETAR TODO EL FLUJO
    return createSuccessResponse(201, {
      message: 'Appointment request is being processed',
      appointmentId,
      status: CONSTANTS.STATUS.PENDING
    });

  } catch (error) {
    Logger.error('Error creating appointment', error);
    return createErrorResponse(500, 'Failed to create appointment');
  }
}



async function getAppointmentsByInsuredId(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const insuredId = event.pathParameters?.insuredId;

    if (!insuredId) {
      return createErrorResponse(400, 'insuredId parameter is required');
    }

    if (!validateInsuredId(insuredId)) {
      return createErrorResponse(400, 'insuredId must be exactly 5 digits');
    }

    const appointments = await dynamoService.getAppointmentsByInsuredId(insuredId);

    Logger.info('Appointments retrieved successfully', { 
      insuredId, 
      count: appointments.length 
    });

    return createSuccessResponse(200, {
      insuredId,
      appointments,
      count: appointments.length
    });

  } catch (error) {
    Logger.error('Error retrieving appointments', error);
    return createErrorResponse(500, 'Failed to retrieve appointments');
  }
}

async function handleSQSEvent(event: SQSEvent): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Starting SQS event processing', { 
      recordCount: event.Records.length 
    });

    for (const record of event.Records) {
      Logger.info('Processing SQS record', {
        messageId: record.messageId,
        body: record.body  // Log del contenido para debugging
      });

      try {
        const messageBody = JSON.parse(record.body);
        Logger.info('Parsed message body', { messageBody });

        // Puede ser un mensaje directo o envuelto en SNS
        let eventDetail;
        if (messageBody.Message) {
          // Mensaje de SNS
          eventDetail = JSON.parse(messageBody.Message);
          Logger.info('Unwrapped SNS message', { eventDetail });
        } else {
          // Mensaje directo de EventBridge
          eventDetail = messageBody;
          Logger.info('Direct EventBridge message', { eventDetail });
        }

        // Buscar los campos Detail o detail
        let appointmentInfo;
        if (eventDetail.Detail) {
          appointmentInfo = eventDetail.Detail;
        } else if (eventDetail.detail) {
          appointmentInfo = eventDetail.detail;
        } else if (eventDetail.appointmentId) {
          appointmentInfo = eventDetail;
        } else {
          Logger.error('Cannot find appointment info in event', { eventDetail });
          continue;
        }

        Logger.info('Extracted appointment info', { appointmentInfo });

        if (appointmentInfo.appointmentId && appointmentInfo.status === 'confirmed') {
          Logger.info('Updating appointment status to completed', {
            appointmentId: appointmentInfo.appointmentId
          });

          await dynamoService.updateAppointmentStatus(
            appointmentInfo.appointmentId, 
            CONSTANTS.STATUS.COMPLETED
          );
          
          Logger.info('Appointment status updated successfully', { 
            appointmentId: appointmentInfo.appointmentId,
            newStatus: CONSTANTS.STATUS.COMPLETED
          });
        } else {
          Logger.warn('Appointment not confirmed or missing data', { 
            appointmentInfo 
          });
        }

      } catch (recordError) {
        Logger.error('Error processing individual SQS record', {
          messageId: record.messageId,
          error: recordError,
          body: record.body
        });
        // Continue processing other records
      }
    }

    Logger.info('SQS event processing completed successfully');
    return createSuccessResponse(200, { message: 'Confirmation processed successfully' });

  } catch (error) {
    Logger.error('Error processing SQS confirmation event', {
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse(500, 'Failed to process confirmation');
  }
}


function createSuccessResponse(statusCode: number, data: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ error: message })
  };
}
