# 🩺 Dr. Priya — AI-Powered Smart Clinical Assistant & Autonomous Documentation Studio
## Comprehensive Technical & Architecture Documentation

---

## 📑 Table of Contents
1. [Executive Summary & Vision](#-executive-summary--vision)
2. [Complete Technology Stack](#-complete-technology-stack)
3. [System Architecture & Data Pipelines](#-system-architecture--data-pipelines)
4. [Database Schema & Data Models](#-database-schema--data-models)
5. [Core Functional Modules](#-core-functional-modules)
   - [Universal Multilingual Speech Recognition](#1-universal-multilingual-speech-recognition)
   - [Real-Time SSE Streaming Clinical Engine](#2-real-time-sse-streaming-clinical-engine)
   - [Medical Coding & Superbill Export Suite](#3-medical-coding--superbill-export-suite)
   - [Certified e-Prescription & Itemized Billing](#4-certified-e-prescription--itemized-billing)
   - [Baileys WhatsApp Multi-Device Gateway](#5-baileys-whatsapp-multi-device-gateway)
   - [Autonomous Clinical Pilot & Simulation](#6-autonomous-clinical-pilot--simulation)
6. [API Endpoints & Communication Protocols](#-api-endpoints--communication-protocols)
7. [Cloud Deployment Architecture](#-cloud-deployment-architecture)
8. [Local Development & Environment Setup](#-local-development--environment-setup)
9. [Security, Privacy & HIPAA Compliance](#-security-privacy--hipaa-compliance)

---

## 🌟 Executive Summary & Vision

**Dr. Priya Clinical Studio** is an enterprise-grade, AI-powered smart clinical assistant and autonomous documentation platform designed to eliminate physician burnout and modernize ambulatory and hospital workflows.

Traditional clinical encounters require doctors to spend 2-3 hours daily transcribing notes, looking up diagnosis codes (ICD-10-CM), procedural billing codes (CPT), authoring prescriptions, and manually entering EHR data. 

**Dr. Priya transforms this entire lifecycle into an instant, autonomous pipeline:**
1. **Listens** to natural doctor-patient dialogue in **any language** (English, Hindi, Spanish, Tamil, French, etc.).
2. **Streams** real-time clinical data extraction (Vitals, Physical Findings, SOAP notes, ICD-10 and CPT codes) via Fastify Server-Sent Events (SSE).
3. **Generates** certified printable e-Prescriptions, Itemized Medical Bills, and Standalone Superbills.
4. **Dispatches** authenticated PDF documents directly to the patient's WhatsApp in the background via Baileys Multi-Device socket gateway.

---

## 💻 Complete Technology Stack

| Layer | Technology | Version | Purpose & Key Role |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **React** | `19.0.0` | High-performance reactive user interface |
| **Build & Tooling** | **Vite** | `6.2.0` | Ultra-fast ES module development & production bundler |
| **Language** | **TypeScript** | `5.8.2` | Full-stack end-to-end type safety & code integrity |
| **Styling** | **Tailwind CSS** | `3.4.17` | Responsive clinical dashboard design system |
| **Icons & Alerts** | **Bootstrap Icons / SweetAlert2** | `1.11.3 / 11.26` | Interactive feedback, toast notifications, status icons |
| **PDF Generation** | **jsPDF & html2canvas** | `4.2.1 / 1.4.1` | Vector-sharp PDF prescription & superbill generation |
| **Backend Server** | **Fastify** | `5.2.1` | High-throughput asynchronous HTTP/SSE server |
| **Runtime** | **Node.js (ESM)** | `v20.x - v24.x` | Modern ECMAScript module execution environment |
| **Database** | **Neon PostgreSQL (Serverless)** | `PostgreSQL 16` | ACID-compliant cloud relational database |
| **ORM & Schema** | **Drizzle ORM & Drizzle Kit** | `0.39.3 / 0.30.5` | Zero-overhead type-safe SQL query builder and migrations |
| **Speech-to-Text (STT)**| **Cloudflare Workers AI (Whisper)**| `@cf/openai/whisper` | Low-latency multilingual audio transcription engine |
| **Clinical Intelligence** | **Cloudflare Workers AI (Mistral)**| `@cf/mistral/mistral-7b-instruct-v0.1` | Structured clinical reasoning & medical coding |
| **Messaging Gateway** | **@whiskeysockets/baileys** | `6.7.9` | Native WebSocket WhatsApp Multi-Device connection |
| **QR Code Engine** | **QRCode** | `1.5.4` | In-browser QR code generation for WhatsApp gateway |
| **Frontend Hosting** | **Cloudflare Pages** | Global Edge | Global CDN distribution with SPA edge routing |
| **Backend Hosting** | **Render Web Services** | Node.js Web | Scalable cloud container deployment |

---

## 🏗️ System Architecture & Data Pipelines

```
                                 ┌──────────────────────────────────────────────┐
                                 │   Doctor Voice / Multilingual Audio Input    │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │  Cloudflare Workers AI Whisper STT Engine    │
                                 └──────────────────────┬───────────────────────┘
                                                        │ Raw Transcript
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │  Fastify 5.x Server-Sent Events (SSE) Stream │
                                 │   • Cloudflare Mistral-7B LLM Processing     │
                                 └──────────────┬───────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌─────────────────────────────────────────┐               ┌─────────────────────────────────────────┐
│     Real-Time Progressive Extraction    │               │       Neon PostgreSQL Persistence       │
│  • Blood Pressure, Pulse, SpO2, Temp    │               │  • Patients Registry                    │
│  • Symptoms & Physical Exam Findings    │               │  • Consultations & SOAP Records         │
│  • SOAP Note (S, O, A, P Sections)      │               │  • ICD-10 & CPT Billing Code Logs       │
│  • ICD-10 Diagnosis & CPT Billing Codes │               └─────────────────────────────────────────┘
└────────────────┬────────────────────────┘
                 │
                 ├────────────────────────────────────────┬────────────────────────────────────────┐
                 ▼                                        ▼                                        ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│  Medical Code Export Studio     │      │ Certified e-Prescription & Bill │      │ Baileys WhatsApp Gateway        │
│  • Standalone Superbill PDF     │      │ • Dynamic Drug Presets          │      │ • Live In-App QR Device Pairing │
│  • RFC 4180 CSV / Excel Export  │      │ • Dosage, Frequency, Duration   │      │ • Direct PDF & Text Dispatch    │
│  • FHIR / EHR Interop JSON      │      │ • Itemized Billing Calculations │      │ • Background Delivery Status    │
│  • 1-Click EHR Clipboard Copy   │      │ • Official Physician Seal       │      │ • Patient Verification          │
└─────────────────────────────────┘      └─────────────────────────────────┘      └─────────────────────────────────┘
```

---

## 🗄️ Database Schema & Data Models

The database is built on **Neon PostgreSQL** managed via **Drizzle ORM**:

```
 ┌───────────────────────────────────────────┐         ┌───────────────────────────────────────────┐
 │                 patients                  │         │               consultations               │
 ├───────────────────────────────────────────┤         ├───────────────────────────────────────────┤
 │ id: SERIAL [PK]                           │ 1     * │ id: SERIAL [PK]                           │
 │ mrn: VARCHAR(50) [UNIQUE]                 ├─────────┤ patient_id: INT [FK -> patients.id]       │
 │ name: VARCHAR(255)                        │         │ status: VARCHAR(50)                       │
 │ age: INT                                  │         │ consultation_date: TIMESTAMP              │
 │ gender: VARCHAR(20)                       │         │ audio_url: TEXT                           │
 │ phone: VARCHAR(50)                        │         │ raw_transcript: TEXT                      │
 │ email: VARCHAR(255)                       │         │ structured_data: JSONB                    │
 │ medical_history: TEXT                     │         │ soap_note: JSONB                          │
 │ allergies: TEXT                           │         │ icd_codes: JSONB                          │
 │ created_at: TIMESTAMP                     │         │ cpt_codes: JSONB                          │
 │ updated_at: TIMESTAMP                     │         │ doctor_notes: TEXT                        │
 └───────────────────────────────────────────┘         │ doctor_name: VARCHAR(255)                 │
                                                       │ approved_at: TIMESTAMP                    │
                                                       │ created_at: TIMESTAMP                     │
                                                       │ updated_at: TIMESTAMP                     │
                                                       └───────────────────────────────────────────┘
```

---

## 🧩 Core Functional Modules

### 1. Universal Multilingual Speech Recognition
- **Audio Capture**: Web Audio API (`MediaRecorder` with Opus/WebM encoding) with real-time reactive sound wave visualizer canvas.
- **Zero-Latency Ingestion**: Dispatched as multipart streams to Cloudflare Workers AI OpenAI Whisper model.
- **Automatic Translation**: Accepts dictation in any natural language (Hindi, Spanish, French, Tamil, Arabic, Mandarin, German, etc.) and translates clinical entities directly into standardized clinical English.

---

### 2. Real-Time SSE Streaming Clinical Engine
- **Fastify SSE Stream Pipeline**: Emits granular lifecycle events (`vitals`, `soap_subjective`, `soap_objective`, `soap_assessment`, `soap_plan`, `icd_codes`, `cpt_codes`, `complete`).
- **Progressive UI Updates**: Cards animate and fill in real time as the doctor speaks, eliminating loading delays.
- **Fault-Tolerant Fallback**: Automatic fallback to standard synchronous REST parsing if SSE connection is interrupted.

---

### 3. Medical Coding & Superbill Export Suite
A dedicated clinical data export engine for medical coders, billing specialists, and insurance clearinghouses:
- 📑 **Official Superbill PDF**: High-resolution vector document containing clinic NPI/taxonomy header, patient demographics, documented ICD-10 diagnoses with clinical rationale, CPT procedure codes with billing justification, and physician certification stamp.
- 📊 **CSV / Excel Spreadsheet**: Standard RFC 4180 formatted spreadsheet supporting single encounter and batch exports across multiple patients.
- 💾 **FHIR / EHR JSON Bundle**: HL7/FHIR-compliant structured JSON interoperability payload.
- 📋 **1-Click EHR Clipboard**: Formatted plain-text and tab-delimited summary for instant copy-pasting into Epic, Cerner, AthenaHealth, or eClinicalWorks.

---

### 4. Certified e-Prescription & Itemized Billing
- **Interactive Rx Editor**: Doctors can add, modify, or delete medications (drug name, dosage, frequency, duration, special instructions).
- **1-Click Clinical Drug Presets**: Instant one-tap prescribing for common ailments (*Upper Respiratory Infection, Hypertension, Type 2 Diabetes, Acute Bronchitis, Knee Osteoarthritis*).
- **Itemized Medical Billing**: Evaluation & management charges, procedure costs, pharmacy charges, tax calculation, and discounts with live ledger summary.
- **Vector PDF Download**: High-definition client-side rendering via `html2canvas` and `jsPDF`.

---

### 5. Baileys WhatsApp Multi-Device Gateway
- **Direct WhatsApp Protocol**: Built on `@whiskeysockets/baileys` WebSocket client. Connects directly to WhatsApp servers without third-party API subscription costs.
- **Live In-App QR Scanner**: Generates an encrypted QR code directly inside the modal for instant pairing with the clinic's phone.
- **Automated Delivery**: Dispatches certified take-home prescriptions, care advice, and PDF documents directly to the patient's phone number in the background.

---

### 6. Autonomous Clinical Pilot & Simulation
- **1-Click Playwright-Style Robot Pilot**: Runs complete end-to-end consultations autonomously with interactive simulated audio chimes, cursor tracking, typing animations, and text-to-speech voice narration.
- **Multilingual Demo Scenarios**: Preloaded clinical scenarios in English, Spanish, Hindi, and Tamil.

---

## 🌐 API Endpoints & Communication Protocols

### Base URL:
- **Local:** `http://localhost:3000/api`
- **Production (Render):** `https://ai-powered-smart-clinical-assistant.onrender.com/api`

### Endpoints Matrix:

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server & DB health check | `{ status: 'online', database: 'Neon', aiModels: {...} }` |
| `GET` | `/patients` | List all registered patients | `Array<Patient>` |
| `POST` | `/patients` | Register a new patient | `{ name, age, gender, phone, email, medicalHistory, allergies }` |
| `GET` | `/patients/:id` | Get patient profile & encounters | `{ ...patient, consultations: [...] }` |
| `POST` | `/consultations/transcribe` | Upload audio file for Whisper STT | `FormData (file: Blob)` ➔ `{ text: string }` |
| `POST` | `/consultations/process-ai` | Synchronous Mistral LLM analysis | `{ transcript, patientId }` ➔ `AIClinicalResult` |
| `POST` | `/consultations/process-ai-stream`| Real-time Server-Sent Events (SSE)| Stream: `event: vitals`, `event: soap`, `event: complete` |
| `GET` | `/consultations` | List consultation records | `Array<Consultation>` |
| `POST` | `/consultations` | Save new consultation record | `{ patientId, rawTranscript, structuredData, soapNote, ... }` |
| `POST` | `/consultations/:id/approve` | Physician certify & sign off | `{ doctorNotes, doctorName, soapNote, icdCodes, ... }` |
| `GET` | `/whatsapp/status` | WhatsApp connection status | `{ connected: boolean, user: string, qrAvailable: boolean }` |
| `GET` | `/whatsapp/qr` | Get live QR Code data URL | `{ connected: boolean, qrDataUrl: string, qrRaw: string }` |
| `POST` | `/whatsapp/logout` | Reset session & generate new QR | `{ success: true, message: string }` |
| `POST` | `/whatsapp/send-prescription` | Dispatch prescription to patient | `{ phone, patientName, medications, advice, pdfBase64 }` |

---

## ☁️ Cloud Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│               Cloudflare Pages (Frontend)              │
│  • Framework: React 19 + Vite 6 (Static Assets on CDN) │
│  • SPA Redirect Rule: /* -> /index.html 200            │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS API & SSE Streams
                            ▼
┌────────────────────────────────────────────────────────┐
│               Render Web Service (Backend)             │
│  • URL: https://ai-powered-smart-clinical-assistant... │
│  • Node.js 22+ ESM Fastify 5.x Application Server      │
│  • Host: 0.0.0.0, Port: 3000                           │
│  • CORS Enabled for all Origins                        │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│ Neon Serverless PostgreSQL││ Cloudflare Workers AI     │
│ • Database: neondb        ││ • Whisper Audio STT       │
│ • Drizzle ORM Type-Safe   ││ • Mistral-7B Instruct LLM │
└───────────────────────────┘└───────────────────────────┘
```

---

## 🛠️ Local Development & Environment Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
# Backend starts at http://localhost:3000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend starts at http://localhost:5173
```

---

*Built with ❤️ for Dr. Priya Healthcare & Clinical Studios*
