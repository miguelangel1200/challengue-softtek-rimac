import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { EventBridgeEvent } from '../types';
import { CONSTANTS } from '../utils/constants';
import { Logger } from '../utils/logger';

export class EventBridgeService {
  private client: EventBridgeClient;

  constructor() {
    this.client = new EventBridgeClient({ region: process.env.AWS_REGION });
  }

  async publishConfirmationEvent(eventData: EventBridgeEvent): Promise<void> {
    try {
      Logger.info('📤 Publishing to EventBridge - FULL DETAILS', {
        source: eventData.Source,                    // rimac.appointments
        detailType: eventData.DetailType,           // Appointment Confirmed  
        detail: eventData.Detail,                   // { appointmentId, status: confirmed, ... }
        eventBusName: eventData.EventBusName,       // rimac-appointment-backend-dev
        region: process.env.AWS_REGION              // ✅ Agregar región para debug
      });

      const command = new PutEventsCommand({
        Entries: [
          {
            Source: eventData.Source,
            DetailType: eventData.DetailType,
            Detail: JSON.stringify(eventData.Detail),
            EventBusName: eventData.EventBusName
          }
        ]
      });

      const result = await this.client.send(command);
      
      Logger.info('🎯 EventBridge response received', {
        entries: result.Entries,
        failedEntryCount: result.FailedEntryCount,
        // ✅ Mostrar más detalles del resultado
        successfulEntries: result.Entries?.filter(e => !e.ErrorCode),
        eventIds: result.Entries?.map(e => e.EventId)
      });

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        const failedEntries = result.Entries?.filter(entry => entry.ErrorCode);
        Logger.error('❌ EventBridge has failed entries', {
          failedCount: result.FailedEntryCount,
          failedEntries,
          // ✅ Mostrar códigos de error específicos
          errorCodes: failedEntries?.map(e => `${e.ErrorCode}: ${e.ErrorMessage}`)
        });
        throw new Error(`EventBridge failed: ${result.FailedEntryCount} entries failed`);
      }

      Logger.info('✅ Event published to EventBridge successfully', { 
        eventId: result.Entries?.[0]?.EventId,
        appointmentId: eventData.Detail.appointmentId,
        // ✅ Confirmar que llegó sin errores
        noErrors: result.FailedEntryCount === 0
      });

    } catch (error: any) {
      Logger.error('💥 Error publishing event to EventBridge', {
        error: error.message,
        errorCode: error.code,
        errorName: error.name,
        // ✅ Mostrar detalles del evento que falló
        eventBusName: eventData.EventBusName,
        source: eventData.Source,
        appointmentId: eventData.Detail.appointmentId
      });
      throw error;
    }
  }
}
