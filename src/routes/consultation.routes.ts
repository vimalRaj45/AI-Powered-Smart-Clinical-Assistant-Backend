import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { consultations, patients, type NewConsultation } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { cloudflareAIService } from '../services/cloudflare-ai.js';
import { z } from 'zod';

const processAiSchema = z.object({
  transcript: z.string().min(1),
  patientId: z.number().int().optional(),
});

const saveConsultationSchema = z.object({
  patientId: z.number().int().positive(),
  status: z.enum(['draft', 'in_review', 'approved']).default('in_review'),
  rawTranscript: z.string().min(1),
  audioUrl: z.string().optional(),
  structuredData: z.any().optional(),
  soapNote: z.any().optional(),
  icdCodes: z.any().optional(),
  cptCodes: z.any().optional(),
  doctorNotes: z.string().optional(),
  doctorName: z.string().optional(),
});

export const consultationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Audio Transcription via Cloudflare Whisper
  fastify.post('/transcribe', async (request: any, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ success: false, error: 'No audio file uploaded' });
      }

      const buffer = await data.toBuffer();
      console.log(`Received audio upload: ${data.filename}, size: ${buffer.length} bytes, mimetype: ${data.mimetype}`);

      const transcriptionResult = await cloudflareAIService.transcribeAudio(buffer);
      return { success: true, text: transcriptionResult.text };
    } catch (error: any) {
      console.error('Transcription route error:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 2. Process Transcript with Cloudflare Mistral LLM (Standard JSON)
  fastify.post('/process-ai', async (request: any, reply) => {
    try {
      const { transcript, patientId } = processAiSchema.parse(request.body);

      let patientContext: { name?: string; age?: number; gender?: string; history?: string } | undefined;

      if (patientId) {
        const found = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (found.length > 0) {
          patientContext = {
            name: found[0].name,
            age: found[0].age,
            gender: found[0].gender,
            history: found[0].medicalHistory || undefined,
          };
        }
      }

      const aiResult = await cloudflareAIService.processConsultation(transcript, patientContext);
      return { success: true, data: aiResult };
    } catch (error: any) {
      console.error('AI processing error:', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 2.1 REAL-TIME SSE STREAMING ENDPOINT (/process-ai-stream)
  fastify.post('/process-ai-stream', async (request: any, reply) => {
    const { transcript, patientId } = processAiSchema.parse(request.body);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    const sendSSE = (event: string, payload: any) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      sendSSE('step', {
        step: 1,
        total: 5,
        title: 'Verifying Consultation & Patient Demographics',
        progress: 15,
      });

      let patientContext: { name?: string; age?: number; gender?: string; history?: string } | undefined;
      if (patientId) {
        const found = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (found.length > 0) {
          patientContext = {
            name: found[0].name,
            age: found[0].age,
            gender: found[0].gender,
            history: found[0].medicalHistory || undefined,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 120));

      sendSSE('step', {
        step: 2,
        total: 5,
        title: 'Analyzing Clinical Speech & Extracting Vital Signs',
        progress: 35,
      });

      const aiResult = await cloudflareAIService.processConsultation(transcript, patientContext);

      // Stream extracted vitals & timeline
      sendSSE('vitals', {
        vitals: aiResult.structuredData.vitals,
        symptoms: aiResult.structuredData.symptoms,
      });

      await new Promise((r) => setTimeout(r, 150));

      sendSSE('step', {
        step: 3,
        total: 5,
        title: 'Formulating Physical Exam & Medications',
        progress: 55,
      });

      sendSSE('examination', {
        examinationFindings: aiResult.structuredData.examinationFindings,
        medications: aiResult.structuredData.medications,
        allergies: aiResult.structuredData.allergies,
      });

      await new Promise((r) => setTimeout(r, 150));

      sendSSE('step', {
        step: 4,
        total: 5,
        title: 'Structuring Comprehensive SOAP Clinical Note',
        progress: 75,
      });

      // Stream SOAP note sections
      sendSSE('soap', aiResult.soapNote);

      await new Promise((r) => setTimeout(r, 150));

      sendSSE('step', {
        step: 5,
        total: 5,
        title: 'Calculating ICD-10 Diagnosis Codes & CPT Billing Codes',
        progress: 95,
      });

      sendSSE('codes', {
        icdCodes: aiResult.icdCodes,
        cptCodes: aiResult.cptCodes,
      });

      await new Promise((r) => setTimeout(r, 100));

      sendSSE('complete', {
        success: true,
        data: aiResult,
      });

      reply.raw.end();
    } catch (err: any) {
      console.error('SSE Stream error:', err);
      sendSSE('error', { error: err.message || 'Stream processing failed' });
      reply.raw.end();
    }
  });

  // 3. Get all consultations with patient details
  fastify.get('/', async (request: any, reply) => {
    try {
      const allConsultations = await db
        .select({
          consultation: consultations,
          patient: patients,
        })
        .from(consultations)
        .innerJoin(patients, eq(consultations.patientId, patients.id))
        .orderBy(desc(consultations.createdAt));

      const formatted = allConsultations.map(row => ({
        ...row.consultation,
        patient: row.patient,
      }));

      return { success: true, data: formatted };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 4. Get single consultation by ID
  fastify.get('/:id', async (request: any, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid ID' });
      }

      const result = await db
        .select({
          consultation: consultations,
          patient: patients,
        })
        .from(consultations)
        .innerJoin(patients, eq(consultations.patientId, patients.id))
        .where(eq(consultations.id, id))
        .limit(1);

      if (result.length === 0) {
        return reply.status(404).send({ success: false, error: 'Consultation not found' });
      }

      return {
        success: true,
        data: {
          ...result[0].consultation,
          patient: result[0].patient,
        },
      };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 5. Create new consultation
  fastify.post('/', async (request: any, reply) => {
    try {
      const body = saveConsultationSchema.parse(request.body);

      const newRecord: NewConsultation = {
        patientId: body.patientId,
        status: body.status,
        rawTranscript: body.rawTranscript,
        audioUrl: body.audioUrl || null,
        structuredData: body.structuredData || null,
        soapNote: body.soapNote || null,
        icdCodes: body.icdCodes || null,
        cptCodes: body.cptCodes || null,
        doctorNotes: body.doctorNotes || null,
        doctorName: body.doctorName || 'Dr. Priya MD',
        approvedAt: body.status === 'approved' ? new Date() : null,
      };

      const inserted = await db.insert(consultations).values(newRecord).returning();
      return reply.status(201).send({ success: true, data: inserted[0] });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // 6. Update consultation (Doctor editing SOAP note or ICD/CPT codes)
  fastify.put('/:id', async (request: any, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid ID' });
      }

      const body = request.body as Partial<NewConsultation>;
      const updated = await db
        .update(consultations)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, id))
        .returning();

      if (updated.length === 0) {
        return reply.status(404).send({ success: false, error: 'Consultation not found' });
      }

      return { success: true, data: updated[0] };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // 7. Doctor Final Approval endpoint
  fastify.post('/:id/approve', async (request: any, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid ID' });
      }

      const { doctorNotes, doctorName, soapNote, icdCodes, cptCodes } = request.body || {};

      const updateData: any = {
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      if (doctorNotes !== undefined) updateData.doctorNotes = doctorNotes;
      if (doctorName !== undefined) updateData.doctorName = doctorName;
      if (soapNote !== undefined) updateData.soapNote = soapNote;
      if (icdCodes !== undefined) updateData.icdCodes = icdCodes;
      if (cptCodes !== undefined) updateData.cptCodes = cptCodes;

      const approved = await db
        .update(consultations)
        .set(updateData)
        .where(eq(consultations.id, id))
        .returning();

      if (approved.length === 0) {
        return reply.status(404).send({ success: false, error: 'Consultation not found' });
      }

      console.log(`✅ Consultation #${id} successfully approved by ${doctorName || 'Doctor'}`);
      return { success: true, data: approved[0], message: 'Consultation signed and approved to clinical record.' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 8. Delete consultation
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid ID' });
      }

      const deleted = await db.delete(consultations).where(eq(consultations.id, id)).returning();
      if (deleted.length === 0) {
        return reply.status(404).send({ success: false, error: 'Consultation not found' });
      }

      return { success: true, data: deleted[0] };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
};
