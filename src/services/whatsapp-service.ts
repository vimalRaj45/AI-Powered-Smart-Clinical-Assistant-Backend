import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

export interface SendPrescriptionPayload {
  phone: string;
  patientName: string;
  mrn?: string;
  doctorName?: string;
  diagnosis?: string;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  advice?: string;
  subtotal?: number;
  total?: number;
  pdfBase64?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  status: 'sent_via_baileys_gateway' | 'sent_via_web_link';
  whatsappLink?: string;
  recipient: string;
  timestamp: string;
  messagePreview: string;
  documentSent?: boolean;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private qrCodeRaw: string | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private connectedUser: string | null = null;
  private authDir: string;
  private logger: any = pino({ level: 'silent' });

  constructor() {
    this.authDir = path.resolve(process.cwd(), 'auth_info_baileys');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    this.initBaileys();
  }

  public async initBaileys() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      console.log('[Baileys Gateway] Initializing WhatsApp multi-device connection...');
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[Baileys Gateway] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: true,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        generateHighQualityLinkPreview: true,
        browser: ['Dr. Priya Clinical Studio', 'Chrome', '1.0.0'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCodeRaw = qr;
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: {
                dark: '#034b75',
                light: '#ffffff',
              },
            });
            console.log('[Baileys Gateway] New QR Code generated for WhatsApp connection.');
          } catch (err) {
            console.error('[Baileys Gateway] QR Generation error:', err);
          }
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(
            `[Baileys Gateway] Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`
          );
          this.isConnected = false;
          this.connectedUser = null;
          this.isConnecting = false;

          if (shouldReconnect) {
            setTimeout(() => this.initBaileys(), 3000);
          } else {
            // Clean auth state on log out
            this.clearAuthState();
            setTimeout(() => this.initBaileys(), 2000);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.isConnecting = false;
          this.qrCodeDataUrl = null;
          this.qrCodeRaw = null;
          this.connectedUser = this.sock?.user?.id || 'Connected Doctor Device';
          console.log(`[Baileys Gateway] ✅ WhatsApp Connected Successfully! Logged in as: ${this.connectedUser}`);
        }
      });
    } catch (err) {
      console.error('[Baileys Gateway] Connection init error:', err);
      this.isConnecting = false;
    }
  }

  public clearAuthState() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
      this.isConnected = false;
      this.connectedUser = null;
      this.qrCodeDataUrl = null;
      this.qrCodeRaw = null;
    } catch (err) {
      console.error('[Baileys Gateway] Error clearing auth state:', err);
    }
  }

  public async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {
      // ignore
    }
    this.clearAuthState();
    this.initBaileys();
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      qrAvailable: !!this.qrCodeDataUrl,
      qrDataUrl: this.qrCodeDataUrl,
      qrRaw: this.qrCodeRaw,
      user: this.connectedUser,
      provider: 'Baileys Multi-Device Native Socket',
    };
  }

  public cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      // Default to standard prefix
      cleaned = '1' + cleaned;
    }
    return cleaned;
  }

  public formatPrescriptionMessage(payload: SendPrescriptionPayload): string {
    const docName = payload.doctorName || 'Dr. Priya MD';
    const patientName = payload.patientName;
    const mrn = payload.mrn || 'N/A';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let msg = `🏥 *PRIYA HEALTHCARE MEDICAL CLINIC*\n`;
    msg += `*Official e-Prescription & Consultation Summary*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `👤 *Patient:* ${patientName} (MRN: ${mrn})\n`;
    msg += `🩺 *Attending Doctor:* ${docName}\n`;
    msg += `📅 *Date:* ${dateStr}\n`;
    if (payload.diagnosis) {
      msg += `📋 *Diagnosis:* ${payload.diagnosis}\n`;
    }
    msg += `\n💊 *PRESCRIBED MEDICATIONS (Rx):*\n`;

    if (payload.medications && payload.medications.length > 0) {
      payload.medications.forEach((med, idx) => {
        msg += `${idx + 1}. *${med.name}*\n`;
        if (med.frequency) msg += `   ▫ Frequency: ${med.frequency}\n`;
        if (med.dosage) msg += `   ▫ Dosage: ${med.dosage}\n`;
        if (med.duration) msg += `   ▫ Duration: ${med.duration}\n`;
        if (med.instructions) msg += `   ▫ Instructions: ${med.instructions}\n`;
      });
    } else {
      msg += `• Standard supportive therapy prescribed.\n`;
    }

    if (payload.advice) {
      msg += `\n📝 *PHYSICIAN ADVICE & CARE NOTES:*\n`;
      msg += `${payload.advice}\n`;
    }

    if (payload.total !== undefined) {
      msg += `\n💳 *BILLING SUMMARY:*\n`;
      msg += `Total Amount: $${payload.total.toFixed(2)} (Insurance Claim Ready)\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *Digital Prescription Document Generated*\n`;
    msg += `Clinic Emergency Helpline: +1 (800) 555-PRIYA\n`;
    msg += `_Thank you for trusting Priya Healthcare. Wishing you good health!_`;

    return msg;
  }

  public async sendPrescription(payload: SendPrescriptionPayload): Promise<WhatsAppSendResult> {
    const cleanedPhone = this.cleanPhoneNumber(payload.phone);
    const jid = `${cleanedPhone}@s.whatsapp.net`;
    const messageText = this.formatPrescriptionMessage(payload);
    const timestamp = new Date().toISOString();
    let messageId = `WA-${Date.now()}`;
    let documentSent = false;

    // Send directly over Baileys Socket if connected
    if (this.isConnected && this.sock) {
      try {
        console.log(`[Baileys Gateway] Transmitting direct WhatsApp message to ${jid}...`);
        const result = await this.sock.sendMessage(jid, { text: messageText });
        messageId = result?.key?.id || messageId;

        // If PDF base64 is attached, send PDF document automatically
        if (payload.pdfBase64) {
          const pdfBuffer = Buffer.from(payload.pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
          await this.sock.sendMessage(jid, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: `Prescription_${payload.patientName.replace(/\s+/g, '_')}.pdf`,
            caption: `Official e-Prescription (Rx) for ${payload.patientName}`,
          });
          documentSent = true;
          console.log(`[Baileys Gateway] ✅ Attached Prescription PDF sent to ${jid}`);
        }

        return {
          success: true,
          messageId,
          status: 'sent_via_baileys_gateway',
          recipient: cleanedPhone,
          timestamp,
          messagePreview: messageText,
          documentSent,
        };
      } catch (err: any) {
        console.error('[Baileys Gateway] Failed to send via socket, falling back to Web Link:', err);
      }
    }

    // Fallback: Web WhatsApp Click-to-Chat URL
    const encodedText = encodeURIComponent(messageText);
    const whatsappLink = `https://wa.me/${cleanedPhone}?text=${encodedText}`;

    return {
      success: true,
      messageId,
      status: 'sent_via_web_link',
      whatsappLink,
      recipient: cleanedPhone,
      timestamp,
      messagePreview: messageText,
      documentSent: false,
    };
  }
}

export const whatsAppService = new WhatsAppService();
