import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import * as aiController from './ai.controller';
import { AiService } from './ai.service';

const router = Router();
const aiService = new AiService();

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

interface ChatCompletionResponse {
  id?: string;
  choices?: Array<{ index: number; message: { role: string; content: string }; finish_reason: string }>;
  content?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// Provider routes (admin)
router.get('/providers', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.listProviders);
router.post('/providers', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.createProvider);
router.patch('/providers/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.updateProvider);
router.delete('/providers/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.deleteProvider);
router.patch('/providers/:id/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.toggleProvider);
router.post('/providers/:id/test', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.testProviderConnection);
router.post('/providers/:id/fetch-models', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.fetchModels);

// Model routes (admin)
router.get('/models', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.listModels);
router.post('/models', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.createModel);
router.patch('/models/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.updateModel);
router.delete('/models/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), aiController.deleteModel);
router.get('/providers/:slug/models', aiController.getModelsByProvider);

// Chat completion (authenticated)
router.post('/chat/:provider/:model', authenticate, aiController.chatCompletion);

// ── OpenAI-Compatible Proxy Endpoints ──
// These endpoints mimic the OpenAI API format for compatibility

// GET /v1/models - List all active models
router.get('/v1/models', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await aiService.listModels({ page: 1, limit: 100, isActive: 'true' });
  const openaiModels = result.data.map((m: any) => ({
    id: m.slug,
    object: 'model',
    created: Math.floor(new Date(m.createdAt).getTime() / 1000),
    owned_by: m.provider?.name || 'marketplace',
  }));
  res.json({ object: 'list', data: openaiModels });
}));

// POST /v1/chat/completions - Chat completion (uses first enabled provider)
router.post('/v1/chat/completions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { model, messages, max_tokens, temperature } = req.body;
  
  // Find the provider that has this model
  const providers = await aiService.listProviders({ page: 1, limit: 50 });
  let targetProvider: string | null = null;
  let targetModel: string = model || 'gpt-3.5-turbo';

  for (const p of providers.data) {
    if (p.isEnabled && (p.models.includes(model) || p.aiModels?.some((am: any) => am.slug === model))) {
      targetProvider = p.slug;
      break;
    }
  }

  if (!targetProvider && providers.data.length > 0) {
    targetProvider = providers.data[0].slug;
  }

  if (!targetProvider) {
    return res.status(400).json({ error: { message: 'No AI providers configured', type: 'configuration_error' } });
  }

  const completion = await aiService.chatCompletion(targetProvider, targetModel, messages || []);
  const comp = completion as unknown as ChatCompletionResponse;
  
  // Return in OpenAI format
  res.json({
    id: comp.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: targetModel,
    choices: comp.choices || [{ index: 0, message: { role: 'assistant', content: comp.content || '' }, finish_reason: 'stop' }],
    usage: comp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}));

// POST /v1/completions - Text completion
router.post('/v1/completions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { model, prompt, max_tokens } = req.body;
  const providers = await aiService.listProviders({ page: 1, limit: 50 });
  const targetProvider = providers.data.find((p: any) => p.isEnabled)?.slug;
  
  if (!targetProvider) {
    return res.status(400).json({ error: { message: 'No AI providers configured', type: 'configuration_error' } });
  }

  const completion = await aiService.chatCompletion(targetProvider, model || 'gpt-3.5-turbo', [
    { role: 'user' as const, content: prompt || '' },
  ]);
  const comp = completion as unknown as ChatCompletionResponse;

  res.json({
    id: `cmpl-${Date.now()}`,
    object: 'text_completion',
    created: Math.floor(Date.now() / 1000),
    model: model || 'gpt-3.5-turbo',
    choices: [{
      text: comp.choices?.[0]?.message?.content || '',
      index: 0,
      finish_reason: 'stop',
    }],
    usage: comp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}));

// POST /v1/embeddings - Create embeddings
router.post('/v1/embeddings', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { model, input } = req.body;
  const providers = await aiService.listProviders({ page: 1, limit: 50 });
  const targetProvider = providers.data.find((p: any) => p.isEnabled)?.slug;

  if (!targetProvider) {
    return res.status(400).json({ error: { message: 'No AI providers configured', type: 'configuration_error' } });
  }

  const texts = Array.isArray(input) ? input : [input || ''];
  const embeddings = texts.map((text: string, i: number) => ({
    object: 'embedding',
    index: i,
    embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1), // Placeholder
  }));

  res.json({
    object: 'list',
    data: embeddings,
    model: model || 'text-embedding-ada-002',
    usage: { prompt_tokens: texts.join(' ').split(' ').length, total_tokens: texts.join(' ').split(' ').length },
  });
}));

// POST /v1/responses - Generate responses (OpenAI new format)
router.post('/v1/responses', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { model, input, instructions } = req.body;
  const providers = await aiService.listProviders({ page: 1, limit: 50 });
  const targetProvider = providers.data.find((p: any) => p.isEnabled)?.slug;

  if (!targetProvider) {
    return res.status(400).json({ error: { message: 'No AI providers configured', type: 'configuration_error' } });
  }

  const messages = [];
  if (instructions) messages.push({ role: 'system', content: instructions });
  messages.push({ role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) });

  const completion = await aiService.chatCompletion(targetProvider, model || 'gpt-4', messages as ChatMessage[]);
  const comp = completion as unknown as ChatCompletionResponse;

  res.json({
    id: `resp-${Date.now()}`,
    object: 'response',
    created: Math.floor(Date.now() / 1000),
    model: model || 'gpt-4',
    output: comp.choices?.[0]?.message?.content || '',
    usage: comp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}));

// GET /v1/models/:model - Get specific model details
router.get('/v1/models/:modelId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const modelSlug = req.params.modelId;
  const result = await aiService.listModels({ page: 1, limit: 100 });
  const model = result.data.find((m: any) => m.slug === modelSlug);
  
  if (!model) {
    return res.status(404).json({ error: { message: `Model '${modelSlug}' not found`, type: 'not_found' } });
  }

  res.json({
    id: model.slug,
    object: 'model',
    created: Math.floor(new Date(model.createdAt).getTime() / 1000),
    owned_by: model.provider?.name || 'marketplace',
    permissions: [{ allow_create_engine: false, allow_sampling: true, allow_logprobs: false, allow_search_indices: false, allow_view: true, allow_fine_tuning: false, is_blocking: false }],
    root: model.slug,
    parent: null,
  });
}));

export default router;