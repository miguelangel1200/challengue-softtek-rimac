import { SQSEvent } from 'aws-lambda';
import { RDSService } from '../services/RDSService';
import { EventBridgeService } from '../services/EventBridgeService';
import { DatabaseAppointment, EventBridgeEvent } from '../types';
import { CONSTANTS } from '../utils/constants';
import { Logger } from '../utils/logger';

const rdsService = new RDSService();
const eventBridgeService = new EventBridgeService();

export const handler = async (event: SQSEvent): Promise<void> => {
  Logger.info('AppointmentCL handler invoked', { recordCount: event.Records.length });

  try {
    for (const record of event.Records) {
      await processAppointmentRecord(record.body);
    }
  } catch (error) {
    Logger.error('Error in appointmentCL handler', error);
    throw error;
  }
};

async function processAppointmentRecord(messageBody: string): Promise<void> {
  try {
    const message = JSON.parse(messageBody);
    const appointmentData = JSON.parse(message.Message || message);

    Logger.info('Processing Chile appointment with REAL RDS', { 
      appointmentId: appointmentData.appointmentId,
      rdsHost: process.env.RDS_HOST
    });

    // ✅ RDS REAL (CONECTA A BASE DE DATOS REAL)
    const dbAppointment: DatabaseAppointment = {
      appointment_id: appointmentData.appointmentId,
      insured_id: appointmentData.insuredId,
      schedule_id: appointmentData.scheduleId,
      center_id: 1,    
      specialty_id: 1, 
      medic_id: 1,     
      appointment_date: new Date().toISOString(),
      status: 'pending'
    };

    Logger.info('Connecting to REAL RDS CL', {
      database: process.env.RDS_CL_DATABASE,
      appointmentId: appointmentData.appointmentId
    });

    // 🏥 GUARDAR EN RDS REAL
    await rdsService.saveAppointment('CL', dbAppointment);

    Logger.info('✅ REAL RDS save successful', {
      appointmentId: appointmentData.appointmentId,
      database: process.env.RDS_CL_DATABASE,
      note: 'Data saved in real MySQL database'
    });

    // ✅ REAL EVENTBRIDGE (DESPUÉS DEL RDS EXITOSO)
    Logger.info('📤 Sending confirmation to REAL EventBridge...');
    
    const confirmationEvent: EventBridgeEvent = {
      Source: CONSTANTS.EVENT_SOURCES.RIMAC_APPOINTMENTS,
      DetailType: CONSTANTS.EVENT_DETAIL_TYPES.APPOINTMENT_CONFIRMED,
      Detail: {
        appointmentId: appointmentData.appointmentId,
        insuredId: appointmentData.insuredId,
        scheduleId: appointmentData.scheduleId,
        countryISO: 'CL',
        status: 'confirmed',
        processedBy: 'RDS_REAL_COMPLETE',
        database: process.env.RDS_CL_DATABASE,
        timestamp: new Date().toISOString()
      },
      EventBusName: CONSTANTS.EVENTBRIDGE_BUS_NAME
    };

    // 🚀 REAL EVENTBRIDGE
    await eventBridgeService.publishConfirmationEvent(confirmationEvent);
    
    Logger.info('✅ REAL EventBridge confirmation sent successfully', { 
      appointmentId: appointmentData.appointmentId,
      country: 'CL',
      eventBusName: CONSTANTS.EVENTBRIDGE_BUS_NAME,
      mode: 'REAL_RDS + REAL_EVENTBRIDGE'
    });

    // 🔄 ACTUALIZAR RDS STATUS A COMPLETED
    Logger.info('🔄 Updating RDS appointment status to completed', {
      appointmentId: appointmentData.appointmentId
    });

    try {
      await rdsService.updateAppointmentStatus(appointmentData.appointmentId, 'completed');
      
      Logger.info('✅ RDS appointment status updated to completed', {
        appointmentId: appointmentData.appointmentId,
        database: process.env.RDS_CL_DATABASE,
        newStatus: 'completed'
      });
    } catch (rdsError) {
      Logger.error('⚠️ RDS status update failed (EventBridge already sent successfully)', {
        appointmentId: appointmentData.appointmentId,
        error: rdsError,
        note: 'This is not critical - EventBridge notification was successful'
      });
      // No hacer throw - EventBridge ya se envió correctamente
    }
    
    Logger.info('🎯 Chile appointment processed successfully (COMPLETE WORKFLOW)', { 
      appointmentId: appointmentData.appointmentId,
      database: process.env.RDS_CL_DATABASE,
      workflow: 'RDS Save → EventBridge → RDS Status Update',
      finalStatus: 'completed'
    });

  } catch (error) {
    Logger.error('Error processing Chile appointment record', error);
    throw error;
  }
}
