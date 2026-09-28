import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config/env.js';
import { testDbConnection, pool, db } from './db/index.js';
import { patients, consultations } from './db/schema.js';
import { patientRoutes } from './routes/patient.routes.js';
import { consultationRoutes } from './routes/consultation.routes.js';
import { whatsAppRoutes } from './routes/whatsapp.routes.js';

const fastify = Fastify({
  logger: true,
});

async function initDatabase() {
  const connected = await testDbConnection();
  if (!connected) {
    console.warn('⚠️ Database connection check failed. Ensure Neon PostgreSQL credentials are correct.');
    return;
  }

  // Create tables if they don't exist
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        mrn VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        gender VARCHAR(20) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        medical_history TEXT,
        allergies TEXT DEFAULT 'NKDA',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        audio_url TEXT,
        raw_transcript TEXT NOT NULL,
        structured_data JSONB,
        soap_note JSONB,
        icd_codes JSONB,
        cpt_codes JSONB,
        doctor_notes TEXT,
        doctor_name VARCHAR(255) DEFAULT 'Dr. Priya MD',
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    client.release();
    console.log('✅ PostgreSQL tables verified/created successfully in Neon.');

    // Seed initial demo patients if table is empty
    const existingPatients = await db.select().from(patients).limit(1);
    if (existingPatients.length === 0) {
      console.log('🌱 Seeding initial demo patients...');
      await db.insert(patients).values([
        {
          mrn: 'MRN-849201',
          name: 'Sarah Jenkins',
          age: 34,
          gender: 'Female',
          phone: '+1 (555) 234-8901',
          email: 'sarah.j@example.com',
          medicalHistory: 'Mild intermittent asthma, seasonal allergies',
          allergies: 'Penicillin (mild rash)',
        },
        {
          mrn: 'MRN-512039',
          name: 'Robert Davis',
          age: 58,
          gender: 'Male',
          phone: '+1 (555) 876-5432',
          email: 'robert.davis@example.com',
          medicalHistory: 'Type 2 Diabetes Mellitus (HbA1c 7.2%), Essential Hypertension',
          allergies: 'NKDA',
        },
        {
          mrn: 'MRN-993812',
          name: 'Elena Rostova',
          age: 46,
          gender: 'Female',
          phone: '+1 (555) 432-1098',
          email: 'elena.rostova@example.com',
          medicalHistory: 'Osteoarthritis of right knee, Hyperlipidemia',
          allergies: 'Sulfa drugs',
        },
      ]);
      console.log('✅ Seeded 3 sample patients.');
    }
  } catch (err) {
    console.error('Error during table setup or seeding:', err);
  }
}

async function bootstrap() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    // Register Multipart for Audio uploads
    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    });

    // Health check
    fastify.get('/api/health', async () => {
      return {
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'Priya Doctor AI Clinical Documentation API',
        database: 'Neon PostgreSQL (Connected)',
        aiModels: {
          llm: config.llmModel,
          stt: config.sttModel,
        },
      };
    });

    // Register API routes
    await fastify.register(patientRoutes, { prefix: '/api/patients' });
    await fastify.register(consultationRoutes, { prefix: '/api/consultations' });
    await fastify.register(whatsAppRoutes, { prefix: '/api/whatsapp' });

    // Init DB & tables
    await initDatabase();

    // Start listening
    const host = '0.0.0.0';
    await fastify.listen({ port: config.port, host });
    console.log(`🚀 Fastify Backend Server running at http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
