import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  llmModel: process.env.CLOUDFLARE_LLM_MODEL || '@cf/mistral/mistral-7b-instruct-v0.1',
  sttModel: process.env.CLOUDFLARE_STT_MODEL || '@cf/openai/whisper',
};

if (!config.databaseUrl) {
  console.warn('⚠️ Warning: DATABASE_URL is not set in environment variables');
}
if (!config.cloudflareAccountId || !config.cloudflareApiToken) {
  console.warn('⚠️ Warning: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is missing');
}
