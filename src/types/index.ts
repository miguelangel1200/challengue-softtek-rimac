export { AppointmentRequest } from '../models/AppointmentRequest';
export { AppointmentEntity } from '../models/AppointmentEntity';
export { ScheduleDetails } from '../models/DatabaseModels';

export interface Appointment {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: 'PE' | 'CL';
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SNSMessage {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: 'PE' | 'CL';
}

export interface DatabaseAppointment {
  appointment_id: string;
  insured_id: string;
  schedule_id: number;
  center_id: number;
  specialty_id: number;
  medic_id: number;
  appointment_date: string;
  status: string;
}

export interface EventBridgeEvent {
  Source: string;
  DetailType: string;
  Detail: {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: 'PE' | 'CL';
    status: string;
    processedBy?: string;
    database?: string;
    timestamp?: string;
  };
  EventBusName: string;
}

export interface CreateAppointmentRequest {
  insuredId: string;
  scheduleId: number;
  countryISO: 'PE' | 'CL';
}

export interface CreateAppointmentResponse {
  message: string;
  appointmentId: string;
  status: string;
}

export interface GetAppointmentsResponse {
  insuredId: string;
  appointments: Appointment[];
  count: number;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  user: {
    username: string;
    role: string;
  };
  expiresIn: string;
}

export interface Center {
  center_id: number;
  name: string;
  address?: string;
  city?: string;
  country_iso: string;
}

export interface Specialty {
  specialty_id: number;
  name: string;
}

export interface Medic {
  medic_id: number;
  name: string;
  specialty_id: number;
  center_id: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface AppointmentStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  peAppointments: number;
  clAppointments: number;
}
