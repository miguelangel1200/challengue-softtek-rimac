import mysql from "mysql2/promise";
import { DatabaseAppointment } from "../models/DatabaseModels";
import { Logger } from "../utils/logger";

export class RDSService {
  // Crear conexión reutilizable
  private async createConnection(
    countryISO: "PE" | "CL"
  ): Promise<mysql.Connection> {
    const database =
      countryISO === "PE"
        ? process.env.RDS_PE_DATABASE
        : process.env.RDS_CL_DATABASE;

    return await mysql.createConnection({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: database,
      port: parseInt(process.env.RDS_PORT || "3306"),
      connectTimeout: 30000,
    });
  }

  async getAllAppointments(countryISO: "PE" | "CL"): Promise<any[]> {
    let connection: mysql.Connection | null = null;

    try {
      connection = await this.createConnection(countryISO);

      Logger.info(`Getting all appointments for admin from ${countryISO}`);

      const query = `
        SELECT 
          a.*,
          m.name as medic_name,
          s.name as specialty_name,
          c.name as center_name,
          c.address as center_address,
          c.city as center_city
        FROM appointments a
        LEFT JOIN medics m ON a.medic_id = m.medic_id
        LEFT JOIN specialties s ON a.specialty_id = s.specialty_id  
        LEFT JOIN centers c ON a.center_id = c.center_id
        ORDER BY a.appointment_date DESC
        LIMIT 50
      `;

      const [rows] = await connection.execute(query);

      Logger.info(
        `Retrieved ${(rows as any[]).length} appointments from ${countryISO}`
      );

      return rows as any[];
    } catch (error) {
      Logger.error(`Error getting all appointments for ${countryISO}`, error);

      try {
        if (connection) {
          Logger.warn(`Trying fallback query for ${countryISO}`);
          const fallbackQuery = `
            SELECT 
              appointment_id,
              insured_id,
              schedule_id, 
              country_iso,
              appointment_date,
              status
            FROM appointments 
            ORDER BY appointment_date DESC 
            LIMIT 20
          `;
          const [rows] = await connection.execute(fallbackQuery);
          Logger.info(
            `Fallback query retrieved ${
              (rows as any[]).length
            } appointments from ${countryISO}`
          );
          return rows as any[];
        }
      } catch (fallbackError) {
        Logger.error(
          `Fallback query also failed for ${countryISO}`,
          fallbackError
        );
      }

      Logger.warn(`Returning empty array for ${countryISO} appointments`);
      return [];
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // Obtener centros médicos
  async getCenters(countryISO: "PE" | "CL"): Promise<any[]> {
    let connection: mysql.Connection | null = null;

    try {
      connection = await this.createConnection(countryISO);

      Logger.info(`Getting centers for ${countryISO}`);

      const [rows] = await connection.execute(
        "SELECT * FROM centers ORDER BY name"
      );

      Logger.info(
        `Retrieved ${(rows as any[]).length} centers from ${countryISO}`
      );

      return rows as any[];
    } catch (error) {
      Logger.error(`Error getting centers for ${countryISO}`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // Obtener especialidades
  async getSpecialties(countryISO: "PE" | "CL"): Promise<any[]> {
    let connection: mysql.Connection | null = null;

    try {
      connection = await this.createConnection(countryISO);

      Logger.info(`Getting specialties for ${countryISO}`);

      const [rows] = await connection.execute(
        "SELECT * FROM specialties ORDER BY name"
      );

      Logger.info(
        `Retrieved ${(rows as any[]).length} specialties from ${countryISO}`
      );

      return rows as any[];
    } catch (error) {
      Logger.error(`Error getting specialties for ${countryISO}`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // Obtener médicos con detalles
  async getMedics(countryISO: "PE" | "CL"): Promise<any[]> {
    let connection: mysql.Connection | null = null;

    try {
      connection = await this.createConnection(countryISO);

      Logger.info(`Getting medics for ${countryISO}`);

      const query = `
        SELECT 
          m.*,
          s.name as specialty_name,
          c.name as center_name,
          c.address as center_address,
          c.city as center_city
        FROM medics m
        LEFT JOIN specialties s ON m.specialty_id = s.specialty_id
        LEFT JOIN centers c ON m.center_id = c.center_id
        ORDER BY m.name
      `;

      const [rows] = await connection.execute(query);

      Logger.info(
        `Retrieved ${(rows as any[]).length} medics from ${countryISO}`
      );

      return rows as any[];
    } catch (error) {
      Logger.error(`Error getting medics for ${countryISO}`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async saveAppointment(
    countryISO: "PE" | "CL",
    appointment: DatabaseAppointment
  ): Promise<void> {
    const database =
      countryISO === "PE"
        ? process.env.RDS_PE_DATABASE
        : process.env.RDS_CL_DATABASE;

    let connection: mysql.Connection | null = null;

    try {
      Logger.info(`Connecting to real RDS ${countryISO}`, {
        database,
        appointmentId: appointment.appointment_id,
      });

      connection = await mysql.createConnection({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: database,
        port: parseInt(process.env.RDS_PORT || "3306"),
        connectTimeout: 30000,
      });

      Logger.info(`✅ Connected to ${database} successfully`);

      // ✅ OBTENER MÉDICO, ESPECIALIDAD Y CENTRO REALES
      const medic = await this.getRandomMedic(connection, countryISO);
      const specialty = await this.getSpecialtyById(
        connection,
        medic.specialty_id
      );
      const center = await this.getCenterById(connection, medic.center_id);

      // ✅ GENERAR FECHA DE CITA REALISTA (próximos 1-30 días)
      const appointmentDate = new Date();
      appointmentDate.setDate(
        appointmentDate.getDate() + Math.floor(Math.random() * 30) + 1
      );
      appointmentDate.setHours(
        8 + Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 4) * 15
      ); // 8AM-6PM, intervalos de 15min

      // ✅ INSERT CON ESTRUCTURA REAL
      const query = `
        INSERT IGNORE INTO appointments 
        (appointment_id, insured_id, schedule_id, country_iso, center_id, specialty_id, medic_id, appointment_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        appointment.appointment_id, // UUID generado
        appointment.insured_id, // ID del asegurado
        appointment.schedule_id, // Schedule ID del request
        countryISO, // PE o CL
        medic.center_id, // Centro real del médico
        medic.specialty_id, // Especialidad real del médico
        medic.medic_id, // ID del médico real
        appointmentDate, // Fecha/hora generada
        "pending", // Status inicial
      ];

      Logger.info("Executing real RDS INSERT with real data", {
        query: query.trim(),
        values,
        medic: medic.name,
        specialty: specialty.name,
        center: center.name,
      });

      const [result] = (await connection.execute(
        query,
        values
      )) as mysql.ResultSetHeader[];

      Logger.info(`🎯 Real appointment saved successfully`, {
        appointmentId: appointment.appointment_id,
        country: countryISO,
        database,
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        // Datos reales insertados
        realData: {
          centerName: center.name,
          centerAddress: center.address,
          centerCity: center.city,
          medicName: medic.name,
          specialtyName: specialty.name,
          appointmentDate: appointmentDate.toISOString(),
          status: "pending",
        },
      });

      // ✅ LOG PARA VERIFICAR QUE SE GUARDÓ
      const [verification] = (await connection.execute(
        "SELECT COUNT(*) as count FROM appointments WHERE appointment_id = ?",
        [appointment.appointment_id]
      )) as any[];

      Logger.info("Appointment verification", {
        appointmentId: appointment.appointment_id,
        existsInDB: verification[0].count > 0,
      });
    } catch (error: any) {
      Logger.error("Error in real RDS saveAppointment", {
        error: error.message,
        code: error.code,
        appointmentId: appointment.appointment_id,
        database,
        countryISO,
      });
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        Logger.info(`🔚 ${database} connection closed`);
      }
    }
  }

  // ✅ TUS MÉTODOS HELPER EXISTENTES - Corregir IDs
  private async getRandomMedic(
    connection: mysql.Connection,
    countryISO: string
  ) {
    try {
      const [medics] = (await connection.execute(
        "SELECT * FROM medics ORDER BY RAND() LIMIT 1"
      )) as any[];

      if (medics.length === 0) {
        Logger.warn(`No medics found in ${countryISO}, using default`);
        return {
          medic_id: 1,
          specialty_id: 1,
          center_id: 1,
          name: "Dr. Default",
        };
      }

      Logger.info(`Selected random medic for ${countryISO}`, medics[0]);
      return medics[0];
    } catch (error) {
      Logger.error("Error getting random medic", error);
      throw error;
    }
  }

  private async getSpecialtyById(
    connection: mysql.Connection,
    specialtyId: number
  ) {
    try {
      const [specialties] = (await connection.execute(
        "SELECT * FROM specialties WHERE specialty_id = ?",
        [specialtyId]
      )) as any[];

      if (specialties.length === 0) {
        Logger.warn(`Specialty ${specialtyId} not found, using default`);
        return { specialty_id: specialtyId, name: "Medicina General" };
      }

      return specialties[0];
    } catch (error) {
      Logger.error("Error getting specialty", error);
      throw error;
    }
  }

  private async getCenterById(connection: mysql.Connection, centerId: number) {
    try {
      const [centers] = (await connection.execute(
        "SELECT * FROM centers WHERE center_id = ?",
        [centerId]
      )) as any[];

      if (centers.length === 0) {
        Logger.warn(`Center ${centerId} not found, using default`);
        return {
          center_id: centerId,
          name: "Centro Médico RIMAC",
          address: "Dirección no disponible",
          city: "Lima",
        };
      }

      return centers[0];
    } catch (error) {
      Logger.error("Error getting center", error);
      throw error;
    }
  }

  async getAppointmentStats(countryISO: "PE" | "CL") {
    const database =
      countryISO === "PE"
        ? process.env.RDS_PE_DATABASE
        : process.env.RDS_CL_DATABASE;

    let connection: mysql.Connection | null = null;

    try {
      connection = await mysql.createConnection({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: database,
        port: parseInt(process.env.RDS_PORT || "3306"),
      });

      const [stats] = (await connection.execute(`
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM appointments
      `)) as any[];

      return stats[0];
    } catch (error) {
      Logger.error(`Error getting stats for ${countryISO}`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled"
  ): Promise<void> {
    Logger.info(
      `Attempting to update appointment ${appointmentId} status to ${status}`
    );

    let peError: any = null;
    let clError: any = null;

    // Intentar PE primero
    try {
      await this.updateAppointmentStatusInCountry(appointmentId, status, "PE");
      Logger.info(
        `✅ Appointment ${appointmentId} updated to ${status} in PE database`
      );
      return;
    } catch (error) {
      peError = error;
      Logger.info(`Appointment ${appointmentId} not found in PE, trying CL...`);
    }

    // Si no está en PE, probar CL
    try {
      await this.updateAppointmentStatusInCountry(appointmentId, status, "CL");
      Logger.info(
        `✅ Appointment ${appointmentId} updated to ${status} in CL database`
      );
      return;
    } catch (error) {
      clError = error;
      Logger.error(
        `Appointment ${appointmentId} not found in PE or CL databases`,
        {
          peError: peError?.message,
          clError: clError?.message,
        }
      );
      throw new Error(`Appointment ${appointmentId} not found in any database`);
    }
  }

  private async updateAppointmentStatusInCountry(
    appointmentId: string,
    status: string,
    countryISO: "PE" | "CL"
  ): Promise<void> {
    let connection: mysql.Connection | null = null;

    try {
      connection = await this.createConnection(countryISO);

      const query = `UPDATE appointments SET status = ? WHERE appointment_id = ?`;
      const [result] = (await connection.execute(query, [
        status,
        appointmentId,
      ])) as mysql.ResultSetHeader[];

      if (result.affectedRows === 0) {
        throw new Error(
          `No appointment found with ID ${appointmentId} in ${countryISO}`
        );
      }

      Logger.info(
        `✅ Updated appointment ${appointmentId} to ${status} in ${countryISO}`,
        {
          affectedRows: result.affectedRows,
          database:
            countryISO === "PE"
              ? process.env.RDS_PE_DATABASE
              : process.env.RDS_CL_DATABASE,
        }
      );
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
