import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { Logger } from '../utils/logger';

export class SQSService {
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({ region: process.env.AWS_REGION });
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      });

      await this.client.send(command);
      Logger.info('Message deleted from SQS', { queueUrl });
    } catch (error) {
      Logger.error('Error deleting message from SQS', error);
      throw error;
    }
  }
}
