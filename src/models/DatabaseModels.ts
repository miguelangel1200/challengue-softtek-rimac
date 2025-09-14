export interface DatabaseAppointment {
  id?: number;
  appointment_id: string;
  insured_id: string;
  schedule_id: number;
  center_id: number;
  specialty_id: number;
  medic_id: number;
  appointment_date: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ScheduleDetails {
  scheduleId: number;
  centerId: number;
  specialtyId: number;
  medicId: number;
  date: string;
}
