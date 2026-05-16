import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import { ApiKeyService } from './api-key.service';

const router = Router();
const apiKeyService = new ApiKeyService();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const result = await apiKeyService.findAll(req.query);
  res.json({ success: true, ...result });
}));

router.post('/', asyncHandler(async (req, res) => {
  const key = await apiKeyService.create(req.body);
  res.status(201).json({
    success: true,
    message: 'API key created. Copy it now; it will not be shown again.',
    data: key,
  });
}));

router.patch('/:id/revoke', asyncHandler(async (req, res) => {
  const key = await apiKeyService.revoke(req.params.id);
  res.json({ success: true, data: key });
}));

router.post('/validate', asyncHandler(async (req, res) => {
  const key = await apiKeyService.validate(req.body.key, req.body.permission);
  res.json({ success: true, data: key });
}));

// Test external API key connections
router.post('/test-connection', asyncHandler(async (req: Request, res: Response) => {
  const { provider, apiKey: keyToTest, baseUrl } = req.body;
  
  if (!provider || !keyToTest) {
    return res.status(400).json({ success: false, message: 'Provider and API key are required' });
  }

  const results: { provider: string; status: 'connected' | 'failed'; message: string; latency?: number }[] = [];

  switch (provider) {
    case 'openai': {
      const start = Date.now();
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${keyToTest}` },
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok) {
          results.push({ provider: 'OpenAI', status: 'connected', message: 'Successfully connected to OpenAI API', latency });
        } else {
          const err = await response.text();
          results.push({ provider: 'OpenAI', status: 'failed', message: `OpenAI error: ${err}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'OpenAI', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'stripe': {
      const start = Date.now();
      try {
        const response = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${keyToTest}` },
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok) {
          results.push({ provider: 'Stripe', status: 'connected', message: 'Successfully connected to Stripe API', latency });
        } else {
          results.push({ provider: 'Stripe', status: 'failed', message: `Stripe error: ${response.status}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'Stripe', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'sendgrid': {
      const start = Date.now();
      try {
        const response = await fetch('https://api.sendgrid.com/v3/scopes', {
          headers: { 'Authorization': `Bearer ${keyToTest}` },
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok || response.status === 403) {
          results.push({ provider: 'SendGrid', status: 'connected', message: 'SendGrid API key is valid', latency });
        } else {
          results.push({ provider: 'SendGrid', status: 'failed', message: `SendGrid error: ${response.status}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'SendGrid', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'twilio': {
      const start = Date.now();
      try {
        const accountSid = baseUrl || 'AC';
        const response = await fetch('https://api.twilio.com/2010-04-01/Accounts.json', {
          headers: { 'Authorization': `Basic ${Buffer.from(`${accountSid}:${keyToTest}`).toString('base64')}` },
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok) {
          results.push({ provider: 'Twilio', status: 'connected', message: 'Successfully connected to Twilio API', latency });
        } else {
          results.push({ provider: 'Twilio', status: 'failed', message: `Twilio error: ${response.status}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'Twilio', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'cloudinary': {
      const start = Date.now();
      try {
        const cloudName = baseUrl || 'demo';
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok) {
          results.push({ provider: 'Cloudinary', status: 'connected', message: 'Cloudinary is reachable', latency });
        } else {
          results.push({ provider: 'Cloudinary', status: 'failed', message: `Cloudinary error: ${response.status}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'Cloudinary', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'meilisearch': {
      const start = Date.now();
      try {
        const url = baseUrl || 'http://localhost:7700';
        const response = await fetch(`${url}/health`, {
          headers: keyToTest ? { 'Authorization': `Bearer ${keyToTest}` } : {},
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        if (response.ok) {
          results.push({ provider: 'MeiliSearch', status: 'connected', message: 'MeiliSearch is reachable', latency });
        } else {
          results.push({ provider: 'MeiliSearch', status: 'failed', message: `MeiliSearch error: ${response.status}`, latency });
        }
      } catch (error: any) {
        results.push({ provider: 'MeiliSearch', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    case 'custom': {
      const start = Date.now();
      try {
        const url = baseUrl || 'https://api.example.com';
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${keyToTest}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - start;
        results.push({ provider: 'Custom API', status: response.ok ? 'connected' : 'failed', message: `${url} responded with status ${response.status}`, latency });
      } catch (error: any) {
        results.push({ provider: 'Custom API', status: 'failed', message: `Connection failed: ${error.message}`, latency: Date.now() - start });
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, message: `Unknown provider: ${provider}. Supported: openai, stripe, sendgrid, twilio, cloudinary, meilisearch, custom` });
  }

  res.json({ success: true, data: results });
}));

export default router;
