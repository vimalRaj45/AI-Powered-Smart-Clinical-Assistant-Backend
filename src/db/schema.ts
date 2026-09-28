import { pgTable, serial, text, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export interface VitalsData {
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

export interface StructuredClinicalData {
  chiefComplaint?: string;
  symptoms?: Array<{
    name: string;
    duration?: string;
    severity?: string;
  }>;
  vitals?: VitalsData;
  historyOfPresentIllness?: string;
  examinationFindings?: string[];
  medications?: string[];
  allergies?: string[];
  riskFactors?: string[];
}

export interface SoapNoteData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface IcdCodeItem {
  code: string;
  description: string;
  category?: string;
  confidence: number;
  rationale: string;
}

export interface CptCodeItem {
  code: string;
  description: string;
  category?: string;
  rationale?: string;
}

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  mrn: varchar('mrn', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  age: integer('age').notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  medicalHistory: text('medical_history'),
  allergies: text('allergies'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const consultations = pgTable('consultations', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft' | 'in_review' | 'approved'
  consultationDate: timestamp('consultation_date').defaultNow().notNull(),
  audioUrl: text('audio_url'),
  rawTranscript: text('raw_transcript').notNull(),
  structuredData: jsonb('structured_data').$type<StructuredClinicalData>(),
  soapNote: jsonb('soap_note').$type<SoapNoteData>(),
  icdCodes: jsonb('icd_codes').$type<IcdCodeItem[]>(),
  cptCodes: jsonb('cpt_codes').$type<CptCodeItem[]>(),
  doctorNotes: text('doctor_notes'),
  doctorName: varchar('doctor_name', { length: 255 }).default('Dr. Priya MD'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ many }) => ({
  consultations: many(consultations),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
}));

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
