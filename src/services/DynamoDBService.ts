import { DynamoDBClient, ScanCommand, UpdateItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Appointment } from '../types';
import { CONSTANTS } from '../utils/constants';
import { Logger } from '../utils/logger';

export class DynamoService {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
  }

  async createAppointment(appointment: Appointment): Promise<void> {
    try {
      const item = marshall(appointment);
      
      const command = new PutItemCommand({
        TableName: CONSTANTS.DYNAMODB_TABLE,
        Item: item
      });

      await this.client.send(command);
      
      Logger.info('Appointment created in DynamoDB', { 
        appointmentId: appointment.appointmentId 
      });
    } catch (error) {
      Logger.error('Error creating appointment in DynamoDB', error);
      throw error;
    }
  }

  async getAppointmentsByInsuredId(insuredId: string): Promise<Appointment[]> {
    try {
      Logger.info('Getting appointments by insuredId using SCAN', { insuredId });
      
      const command = new ScanCommand({
        TableName: CONSTANTS.DYNAMODB_TABLE,
        FilterExpression: 'insuredId = :insuredId',
        ExpressionAttributeValues: marshall({
          ':insuredId': insuredId
        })
      });

      const result = await this.client.send(command);
      
      if (!result.Items) {
        Logger.info('No appointments found for insuredId', { insuredId });
        return [];
      }

      const appointments = result.Items.map(item => unmarshall(item)) as Appointment[];
      
      Logger.info('Appointments retrieved successfully using SCAN', { 
        insuredId, 
        count: appointments.length,
        appointments: appointments.map(a => ({ 
          appointmentId: a.appointmentId, 
          status: a.status,
          createdAt: a.createdAt
        }))
      });

      return appointments;
    } catch (error) {
      Logger.error('Error retrieving appointments using SCAN', { error, insuredId });
      throw error;
    }
  }

  async getAllAppointments(): Promise<any[]> {
    try {
      Logger.info('Getting all appointments from DynamoDB for admin');
      
      const command = new ScanCommand({
        TableName: CONSTANTS.DYNAMODB_TABLE,
        Limit: 100 // Limitar para evitar timeout
      });

      const result = await this.client.send(command);
      
      if (!result.Items) {
        Logger.info('No appointments found in DynamoDB');
        return [];
      }

      // Convertir de DynamoDB format a objetos normales
      const appointments = result.Items.map(item => unmarshall(item));
      
      Logger.info(`Retrieved ${appointments.length} appointments from DynamoDB`);
      
      return appointments;
    } catch (error: any) {
      Logger.error('Error getting all appointments from DynamoDB', error);
      // No hacer throw, devolver array vacío para que stats funcione
      Logger.warn('Returning empty array for DynamoDB appointments');
      return [];
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: CONSTANTS.DYNAMODB_TABLE,
        Key: marshall({ appointmentId }),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': status,
          ':updatedAt': new Date().toISOString()
        })
      });

      await this.client.send(command);
      
      Logger.info('Appointment status updated in DynamoDB', { 
        appointmentId, 
        status 
      });
    } catch (error) {
      Logger.error('Error updating appointment status in DynamoDB', error);
      throw error;
    }
  }
}
