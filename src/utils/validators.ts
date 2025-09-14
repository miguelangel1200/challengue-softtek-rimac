import Joi from 'joi';
import { AppointmentRequest } from '../models/AppointmentRequest';

export const appointmentRequestSchema = Joi.object<AppointmentRequest>({
  insuredId: Joi.string()
    .pattern(/^\d{5}$/)
    .required()
    .messages({
      'string.pattern.base': 'insuredId must be exactly 5 digits',
      'any.required': 'insuredId is required'
    }),
  scheduleId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'scheduleId must be a number',
      'number.positive': 'scheduleId must be positive',
      'any.required': 'scheduleId is required'
    }),
  countryISO: Joi.string()
    .valid('PE', 'CL')
    .required()
    .messages({
      'any.only': 'countryISO must be either PE or CL',
      'any.required': 'countryISO is required'
    })
});

export const validateAppointmentRequest = (data: any): { error?: string; value?: AppointmentRequest } => {
  const { error, value } = appointmentRequestSchema.validate(data);
  
  if (error) {
    return { error: error.details[0].message };
  }
  
  return { value };
};

export const validateInsuredId = (insuredId: string): boolean => {
  return /^\d{5}$/.test(insuredId);
};
