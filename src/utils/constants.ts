export const CONSTANTS = {
  DYNAMODB_TABLE: process.env.DYNAMODB_TABLE!,
  SNS_TOPIC_ARN: process.env.SNS_TOPIC_ARN!,
  SQS_PE_URL: process.env.SQS_PE_URL!,
  SQS_CL_URL: process.env.SQS_CL_URL!,
  SQS_CONFIRMATION_URL: process.env.SQS_CONFIRMATION_URL!,
  EVENTBRIDGE_BUS_NAME: process.env.EVENTBRIDGE_BUS_NAME!,
  
  RDS: {
    HOST: process.env.RDS_HOST!,
    USERNAME: process.env.RDS_USERNAME!,
    PASSWORD: process.env.RDS_PASSWORD!,
    PORT: parseInt(process.env.RDS_PORT || '3306'),
    PE_DATABASE: process.env.RDS_PE_DATABASE!,
    CL_DATABASE: process.env.RDS_CL_DATABASE!,
  },

  STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
  } as const,

  COUNTRIES: {
    PERU: 'PE',
    CHILE: 'CL'
  } as const,

  EVENT_SOURCES: {
    RIMAC_APPOINTMENTS: 'rimac.appointments'
  } as const,

  EVENT_DETAIL_TYPES: {
    APPOINTMENT_CONFIRMED: 'Appointment Confirmed'
  } as const
};
