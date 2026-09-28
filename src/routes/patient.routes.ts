import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { patients, consultations, type NewPatient } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const patientSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  mrn: z.string().optional(),
});

export const patientRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get all patients
  fastify.get('/', async (request, reply) => {
    try {
      const allPatients = await db.select().from(patients).orderBy(desc(patients.createdAt));
      return { success: true, data: allPatients };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Get patient by ID with consultations
  fastify.get('/:id', async (request: any, reply) => {
    try {
      const patientId = parseInt(request.params.id, 10);
      if (isNaN(patientId)) {
        return reply.status(400).send({ success: false, error: 'Invalid patient ID' });
      }

      const patientList = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patientList.length === 0) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      const patientConsultations = await db
        .select()
        .from(consultations)
        .where(eq(consultations.patientId, patientId))
        .orderBy(desc(consultations.consultationDate));

      return {
        success: true,
        data: {
          ...patientList[0],
          consultations: patientConsultations,
        },
      };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Create new patient
  fastify.post('/', async (request: any, reply) => {
    try {
      const parsed = patientSchema.parse(request.body);
      
      const mrn = parsed.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`;

      const newPatientData: NewPatient = {
        name: parsed.name,
        age: parsed.age,
        gender: parsed.gender,
        phone: parsed.phone || null,
        email: parsed.email || null,
        medicalHistory: parsed.medicalHistory || null,
        allergies: parsed.allergies || 'NKDA',
        mrn,
      };

      const result = await db.insert(patients).values(newPatientData).returning();
      return reply.status(201).send({ success: true, data: result[0] });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // Update patient
  fastify.put('/:id', async (request: any, reply) => {
    try {
      const patientId = parseInt(request.params.id, 10);
      if (isNaN(patientId)) {
        return reply.status(400).send({ success: false, error: 'Invalid patient ID' });
      }

      const parsed = patientSchema.partial().parse(request.body);
      const updated = await db
        .update(patients)
        .set({
          ...parsed,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patientId))
        .returning();

      if (updated.length === 0) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      return { success: true, data: updated[0] };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });
};
