import { FastifyPluginAsync } from 'fastify';
import { whatsAppService, SendPrescriptionPayload } from '../services/whatsapp-service';

export const whatsAppRoutes: FastifyPluginAsync = async (fastify) => {
  // Check WhatsApp connection status & get live QR code
  fastify.get('/status', async (_request, reply) => {
    return reply.send(whatsAppService.getStatus());
  });

  // Get live QR Code data URL
  fastify.get('/qr', async (_request, reply) => {
    const status = whatsAppService.getStatus();
    return reply.send({
      connected: status.connected,
      qrDataUrl: status.qrDataUrl,
      qrRaw: status.qrRaw,
      user: status.user,
    });
  });

  // Logout / clear session and generate new QR code
  fastify.post('/logout', async (_request, reply) => {
    await whatsAppService.logout();
    return reply.send({
      success: true,
      message: 'WhatsApp session reset. Generating fresh QR code.',
    });
  });

  // Send prescription & bill directly via Baileys socket to patient's phone
  fastify.post('/send-prescription', async (request, reply) => {
    try {
      const body = request.body as SendPrescriptionPayload;
      if (!body.phone) {
        return reply.status(400).send({
          error: 'Missing recipient phone number',
        });
      }

      const result = await whatsAppService.sendPrescription(body);
      return reply.send(result);
    } catch (err: any) {
      request.log.error(err, 'Failed to send WhatsApp prescription');
      return reply.status(500).send({
        error: 'Failed to dispatch WhatsApp message',
        details: err.message,
      });
    }
  });
};
