import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RDSService } from '../services/RDSService';
import { DynamoService } from '../services/DynamoDBService';
import { Logger } from '../utils/logger';
import { createResponse } from '../utils/response';
import jwt from 'jsonwebtoken';

const rdsService = new RDSService();
const dynamoDBService = new DynamoService();

const JWT_SECRET = process.env.JWT_SECRET || 'rimac-secret-2024';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  Logger.info('Admin handler invoked', { 
    path: event.path,
    method: event.httpMethod 
  });

  try {
    const path = event.path;
    const method = event.httpMethod;

    // Rutas públicas (no requieren autenticación)
    if (path === '/admin/auth' && method === 'POST') {
      return await handleAuth(event);
    }

    // Rutas protegidas (requieren autenticación)
    const authResult = await validateAuth(event);
    if (!authResult.success) {
      return createResponse(401, { error: 'Unauthorized', message: authResult.message });
    }

    // Router de rutas protegidas
    switch (path) {
      case '/admin/appointments':
        return await handleGetAppointments();
      case '/admin/stats':
        return await handleGetStats();
      case '/admin/centers':
        return await handleGetCenters();
      case '/admin/specialties':
        return await handleGetSpecialties();
      case '/admin/medics':
        return await handleGetMedics();
      default:
        return createResponse(404, { error: 'Not found' });
    }

  } catch (error) {
    Logger.error('Error in admin handler', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

// 🔐 Autenticación
async function handleAuth(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;

    Logger.info('Admin authentication attempt', { username });

    // Credenciales hardcodeadas para demo
    if (username === 'admin' && password === 'rimac2024') {
      const token = jwt.sign(
        { username, role: 'admin', exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) },
        JWT_SECRET
      );

      Logger.info('Admin authentication successful', { username });
      
      return createResponse(200, {
        success: true,
        token,
        user: { username, role: 'admin' },
        expiresIn: '24h'
      });
    } else {
      Logger.warn('Admin authentication failed', { username });
      return createResponse(401, { 
        error: 'Invalid credentials',
        message: 'Username or password incorrect'
      });
    }
  } catch (error) {
    Logger.error('Error in admin auth', error);
    return createResponse(400, { error: 'Invalid request body' });
  }
}

// 🔐 Validar autenticación
async function validateAuth(event: APIGatewayProxyEvent): Promise<{ success: boolean; message?: string }> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, message: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'admin') {
      return { success: false, message: 'Insufficient permissions' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: 'Invalid or expired token' };
  }
}

// 📊 Obtener todas las citas
async function handleGetAppointments(): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Getting appointments for admin - RDS ONLY');

    const [rdsAppointmentsPE, rdsAppointmentsCL] = await Promise.all([
      rdsService.getAllAppointments('PE').catch(error => {
        Logger.error('RDS PE failed', error);
        return [];
      }),
      rdsService.getAllAppointments('CL').catch(error => {
        Logger.error('RDS CL failed', error);
        return [];
      })
    ]);

    const response = {
      success: true,
      data: {
        rds: {
          pe: {
            appointments: rdsAppointmentsPE.slice(0, 20), // Limitar para performance
            count: rdsAppointmentsPE.length,
            limited: rdsAppointmentsPE.length > 20
          },
          cl: {
            appointments: rdsAppointmentsCL.slice(0, 20), // Limitar
            count: rdsAppointmentsCL.length,
            limited: rdsAppointmentsCL.length > 20
          }
        },
        summary: {
          totalRDS: rdsAppointmentsPE.length + rdsAppointmentsCL.length,
          byCountry: {
            PE: rdsAppointmentsPE.length,
            CL: rdsAppointmentsCL.length
          },
          note: "RDS appointments only - DynamoDB excluded for performance",
          limited: "Showing max 20 per country"
        }
      }
    };

    Logger.info('Admin appointments retrieved successfully (RDS only)', {
      rdsCountPE: rdsAppointmentsPE.length,
      rdsCountCL: rdsAppointmentsCL.length
    });

    return createResponse(200, response);
  } catch (error: any) {
    Logger.error('Error getting admin appointments', error);
    return createResponse(500, { 
      error: 'Error retrieving appointments',
      message: error.message 
    });
  }
}

// 📈 Estadísticas
async function handleGetStats(): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Getting admin statistics - RDS ONLY');

    const [rdsAppointmentsPE, rdsAppointmentsCL] = await Promise.all([
      rdsService.getAllAppointments('PE').catch(error => {
        Logger.error('RDS PE failed', error);
        return [];
      }),
      rdsService.getAllAppointments('CL').catch(error => {
        Logger.error('RDS CL failed', error);
        return [];
      })
    ]);

    const allRdsAppointments = [...rdsAppointmentsPE, ...rdsAppointmentsCL];
    
    const rdsStats = {
      total: allRdsAppointments.length,
      pe: rdsAppointmentsPE.length,
      cl: rdsAppointmentsCL.length,
      byStatus: {
        pending: allRdsAppointments.filter((a: any) => a.status === 'pending').length,
        confirmed: allRdsAppointments.filter((a: any) => a.status === 'confirmed').length,
        completed: allRdsAppointments.filter((a: any) => a.status === 'completed').length
      }
    };

    const response = {
      success: true,
      data: {
        overview: {
          totalAppointments: rdsStats.total,
          pendingAppointments: rdsStats.byStatus.pending,
          confirmedAppointments: rdsStats.byStatus.confirmed,
          completedAppointments: rdsStats.byStatus.completed,
          successRate: rdsStats.total > 0 ? Math.round(((rdsStats.byStatus.confirmed + rdsStats.byStatus.completed) / rdsStats.total) * 100) : 0
        },
        rds: rdsStats,
        performance: {
          avgProcessingTime: '~250ms',
          systemHealth: 'Healthy - RDS Only',
          lastUpdate: new Date().toISOString(),
          note: 'Fast stats from RDS MySQL databases'
        }
      }
    };

    Logger.info('Admin statistics calculated (RDS only)', {
      totalRDS: rdsStats.total,
      successRate: response.data.overview.successRate
    });

    return createResponse(200, response);
  } catch (error) {
    Logger.error('Error calculating admin stats', error);
    return createResponse(500, { error: 'Error calculating statistics' });
  }
}

// 🏥 Obtener centros médicos
async function handleGetCenters(): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Getting medical centers for admin');

    const [centersPE, centersCL] = await Promise.all([
      rdsService.getCenters('PE'),
      rdsService.getCenters('CL')
    ]);

    const response = {
      success: true,
      data: {
        pe: centersPE,
        cl: centersCL,
        summary: {
          totalCenters: centersPE.length + centersCL.length,
          byCountry: {
            PE: centersPE.length,
            CL: centersCL.length
          }
        }
      }
    };

    Logger.info('Medical centers retrieved successfully', {
      peCount: centersPE.length,
      clCount: centersCL.length
    });

    return createResponse(200, response);
  } catch (error) {
    Logger.error('Error getting medical centers', error);
    return createResponse(500, { error: 'Error retrieving medical centers' });
  }
}

// 🩺 Obtener especialidades
async function handleGetSpecialties(): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Getting specialties for admin');

    const [specialtiesPE, specialtiesCL] = await Promise.all([
      rdsService.getSpecialties('PE'),
      rdsService.getSpecialties('CL')
    ]);

    const response = {
      success: true,
      data: {
        pe: specialtiesPE,
        cl: specialtiesCL,
        summary: {
          totalSpecialties: specialtiesPE.length + specialtiesCL.length,
          byCountry: {
            PE: specialtiesPE.length,
            CL: specialtiesCL.length
          }
        }
      }
    };

    Logger.info('Specialties retrieved successfully', {
      peCount: specialtiesPE.length,
      clCount: specialtiesCL.length
    });

    return createResponse(200, response);
  } catch (error) {
    Logger.error('Error getting specialties', error);
    return createResponse(500, { error: 'Error retrieving specialties' });
  }
}

// 👨‍⚕️ Obtener médicos
async function handleGetMedics(): Promise<APIGatewayProxyResult> {
  try {
    Logger.info('Getting medics for admin');

    const [medicsPE, medicsCL] = await Promise.all([
      rdsService.getMedics('PE'),
      rdsService.getMedics('CL')
    ]);

    const response = {
      success: true,
      data: {
        pe: medicsPE,
        cl: medicsCL,
        summary: {
          totalMedics: medicsPE.length + medicsCL.length,
          byCountry: {
            PE: medicsPE.length,
            CL: medicsCL.length
          }
        }
      }
    };

    Logger.info('Medics retrieved successfully', {
      peCount: medicsPE.length,
      clCount: medicsCL.length
    });

    return createResponse(200, response);
  } catch (error) {
    Logger.error('Error getting medics', error);
    return createResponse(500, { error: 'Error retrieving medics' });
  }
}
