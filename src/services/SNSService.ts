import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SNSMessage } from '../types';
import { CONSTANTS } from '../utils/constants';
import { Logger } from '../utils/logger';

export class SNSService {
  private client: SNSClient;

  constructor() {
    this.client = new SNSClient({ region: process.env.AWS_REGION });
  }

  async publishAppointmentMessage(message: SNSMessage): Promise<void> {
    try {
      const command = new PublishCommand({
        TopicArn: CONSTANTS.SNS_TOPIC_ARN,
        Message: JSON.stringify(message),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: message.countryISO
          }
        }
      });

      const result = await this.client.send(command);
      Logger.info('Message published to SNS', { 
        messageId: result.MessageId, 
        appointmentId: message.appointmentId 
      });
    } catch (error) {
      Logger.error('Error publishing message to SNS', error);
      throw error;
    }
  }
}
