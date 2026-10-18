import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { patientReports, patients } from '../db/schema.js';
import { eq, desc, or } from 'drizzle-orm';
import { z } from 'zod';

const reportSchema = z.object({
  patientId: z.number().optional(),
  patientMrn: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  reportDate: z.string().min(1),
  facilityName: z.string().min(1),
  doctorRemarks: z.string().optional(),
  findingsSummary: z.string().optional(),
  fileType: z.string().min(1),
  fileName: z.string().min(1),
  fileData: z.string().optional(), // Base64 Data URI blob
  fileSizeBytes: z.number().optional(),
});

export const reportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET all reports, optionally filtered by mrn or patientId
  fastify.get('/', async (request: any, reply) => {
    try {
      const { mrn, patientId } = request.query;

      if (mrn) {
        const results = await db
          .select()
          .from(patientReports)
          .where(eq(patientReports.patientMrn, String(mrn)))
          .orderBy(desc(patientReports.createdAt));
        return { success: true, data: results };
      }

      if (patientId) {
        const pid = parseInt(patientId, 10);
        if (!isNaN(pid)) {
          const results = await db
            .select()
            .from(patientReports)
            .where(eq(patientReports.patientId, pid))
            .orderBy(desc(patientReports.createdAt));
          return { success: true, data: results };
        }
      }

      // Return all reports if no filter provided
      const allReports = await db
        .select()
        .from(patientReports)
        .orderBy(desc(patientReports.createdAt));
      return { success: true, data: allReports };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET single report by ID
  fastify.get('/:id', async (request: any, reply) => {
    try {
      const reportId = parseInt(request.params.id, 10);
      if (isNaN(reportId)) {
        return reply.status(400).send({ success: false, error: 'Invalid report ID' });
      }

      const report = await db
        .select()
        .from(patientReports)
        .where(eq(patientReports.id, reportId))
        .limit(1);

      if (report.length === 0) {
        return reply.status(404).send({ success: false, error: 'Report not found' });
      }

      return { success: true, data: report[0] };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST create new report in Neon PostgreSQL with Blob / Base64 storage
  fastify.post('/', async (request: any, reply) => {
    try {
      const parsed = reportSchema.parse(request.body);

      // Verify or link patientId if possible
      let pid = parsed.patientId;
      if (!pid && parsed.patientMrn) {
        const pt = await db
          .select()
          .from(patients)
          .where(eq(patients.mrn, parsed.patientMrn))
          .limit(1);
        if (pt.length > 0) {
          pid = pt[0].id;
        }
      }

      const newRecord = await db
        .insert(patientReports)
        .values({
          patientId: pid || null,
          patientMrn: parsed.patientMrn,
          title: parsed.title,
          category: parsed.category,
          reportDate: parsed.reportDate,
          facilityName: parsed.facilityName,
          doctorRemarks: parsed.doctorRemarks || null,
          findingsSummary: parsed.findingsSummary || null,
          fileType: parsed.fileType,
          fileName: parsed.fileName,
          fileData: parsed.fileData || null, // Blob payload
          fileSizeBytes: parsed.fileSizeBytes || 0,
        })
        .returning();

      return reply.status(201).send({ success: true, data: newRecord[0] });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // DELETE report by ID
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const reportId = parseInt(request.params.id, 10);
      if (isNaN(reportId)) {
        return reply.status(400).send({ success: false, error: 'Invalid report ID' });
      }

      const deleted = await db
        .delete(patientReports)
        .where(eq(patientReports.id, reportId))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ success: false, error: 'Report not found' });
      }

      return { success: true, message: 'Report deleted successfully' };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message });
    }
  });
};
