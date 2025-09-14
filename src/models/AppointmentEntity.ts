export interface AppointmentEntity {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: 'PE' | 'CL';
  status: string;
  createdAt: string;
  updatedAt: string;
}