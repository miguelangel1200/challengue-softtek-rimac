// tests/unit/appointment.test.ts
import { validateAppointmentRequest } from '../../src/utils/validators';

describe('Appointment Validation', () => {
  test('should validate correct appointment request', () => {
    const validRequest = {
      insuredId: '12345',
      scheduleId: 100,
      countryISO: 'PE'
    };

    const result = validateAppointmentRequest(validRequest);
    expect(result.error).toBeUndefined();
  });

  test('should reject invalid insured ID', () => {
    const invalidRequest = {
      insuredId: '123', // Too short
      scheduleId: 100,
      countryISO: 'PE'
    };

    const result = validateAppointmentRequest(invalidRequest);
    expect(result.error).toBeDefined();
  });

  test('should reject invalid country code', () => {
    const invalidRequest = {
      insuredId: '12345',
      scheduleId: 100,
      countryISO: 'US' // Not supported
    };

    const result = validateAppointmentRequest(invalidRequest);
    expect(result.error).toBeDefined();
  });
});
