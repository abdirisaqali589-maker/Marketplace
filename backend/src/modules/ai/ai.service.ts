import { prisma } from '../../common/prisma';
import { NotFoundError, AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { encrypt } from '../../common/encryption';
import { secretService } from './ai-secret.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

interface StreamCallbacks {
  onThinking?: (text: string) => void;
  onContent?: (text: string) => void;
  onToolCall?: (toolCall: any) => void;
  onDone?: (result: { content: string; thinking: string; model?: string; tokens?: number }) => void;
  onError?: (error: string) => void;
}

export class AiService {
  /**
   * Get a decrypted API key for a provider, ready for use in HTTP requests.
   */
  private async getDecryptedApiKey(providerId: string): Promise<string | null> {
    return secretService.retrieveProviderKey(providerId);
  }
  // ── Provider CRUD ──

  async createProvider(data: {
    name: string;
    slug: string;
    provider: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    config?: Record<string, any>;
  }) {
    const existing = await prisma.aiProvider.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing) throw new AppError(409, 'Provider with this name or slug already exists');

    const provider = await prisma.aiProvider.create({
      data: {
        name: data.name,
        slug: data.slug,
        provider: data.provider,
        baseUrl: data.baseUrl || null,
        apiKey: data.apiKey ? encrypt(data.apiKey) : null,
        models: JSON.stringify(data.models || []),
        config: data.config ? JSON.stringify(data.config) : null,
      },
    });
    return this.sanitizeProvider(provider);
  }

  async updateProvider(id: string, data: {
    name?: string;
    provider?: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    config?: Record<string, any>;
    isEnabled?: boolean;
  }) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.apiKey !== undefined) updateData.apiKey = encrypt(data.apiKey);
    if (data.models !== undefined) updateData.models = JSON.stringify(data.models);
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    const updated = await prisma.aiProvider.update({ where: { id }, data: updateData });
    return this.sanitizeProvider(updated);
  }

  async deleteProvider(id: string) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');
    await prisma.aiProvider.delete({ where: { id } });
    return { success: true, message: 'AI provider deleted' };
  }

  async listProviders(query: { page?: number; limit?: number; isEnabled?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.isEnabled === 'true') where.isEnabled = true;
    if (query.isEnabled === 'false') where.isEnabled = false;

    const [providers, total] = await Promise.all([
      prisma.aiProvider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { aiModels: true },
      }),
      prisma.aiProvider.count({ where }),
    ]);

    return {
      data: providers.map(p => ({ ...this.sanitizeProvider(p), aiModels: p.aiModels.map(m => this.sanitizeModel(m)) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleProvider(id: string) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');
    const updated = await prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
    });
    return this.sanitizeProvider(updated);
  }

  // ── Model CRUD ──

  async createModel(data: {
    name: string;
    slug: string;
    providerId: string;
    capabilities?: string[];
    contextLength?: number;
    pricing?: Record<string, any>;
  }) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: data.providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const model = await prisma.aiModel.create({
      data: {
        name: data.name,
        slug: data.slug,
        providerId: data.providerId,
        capabilities: JSON.stringify(data.capabilities || ['chat']),
        contextLength: data.contextLength || 4096,
        pricing: data.pricing ? JSON.stringify(data.pricing) : null,
      },
    });
    return this.sanitizeModel(model);
  }

  async updateModel(id: string, data: {
    name?: string;
    capabilities?: string[];
    contextLength?: number;
    pricing?: Record<string, any>;
    isActive?: boolean;
  }) {
    const existing = await prisma.aiModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI model not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.capabilities !== undefined) updateData.capabilities = JSON.stringify(data.capabilities);
    if (data.contextLength !== undefined) updateData.contextLength = data.contextLength;
    if (data.pricing !== undefined) updateData.pricing = JSON.stringify(data.pricing);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.aiModel.update({ where: { id }, data: updateData });
    return this.sanitizeModel(updated);
  }

  async deleteModel(id: string) {
    const existing = await prisma.aiModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI model not found');
    await prisma.aiModel.delete({ where: { id } });
    return { success: true, message: 'AI model deleted' };
  }

  async listModels(query: { page?: number; limit?: number; providerId?: string; isActive?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.providerId) where.providerId = query.providerId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;

    const [models, total] = await Promise.all([
      prisma.aiModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { provider: true },
      }),
      prisma.aiModel.count({ where }),
    ]);

    return {
      data: models.map(m => ({ ...this.sanitizeModel(m), provider: this.sanitizeProvider(m.provider) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getModelsByProvider(providerSlug: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const models = await prisma.aiModel.findMany({
      where: { providerId: provider.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    return models.map(m => this.sanitizeModel(m));
  }

  // ── Connection & Model Fetching ──

  async testConnection(providerId: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const apiKey = await this.getDecryptedApiKey(providerId);

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
        headers: { 'Authorization': apiKey ? `Bearer ${apiKey}` : '' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, status: response.status, message: `Connection failed: ${errorText}` };
      }

      return { success: true, message: 'Connection successful', status: response.status };
    } catch (error) {
      return { success: false, message: `Connection error: ${(error as Error).message}`, status: 0 };
    }
  }

  async fetchProviderModels(providerId: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const apiKey = await this.getDecryptedApiKey(providerId);

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
        headers: { 'Authorization': apiKey ? `Bearer ${apiKey}` : '' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return { success: false, models: [], message: `Failed to fetch models: ${response.statusText}` };
      }

       const data = await response.json() as any;
       const models = (data.data || data.models || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        slug: m.id.replace(/[.:]/g, '-'),
        capabilities: ['chat'],
        contextLength: 4096,
        owned_by: m.owned_by || '',
      }));

      // Auto-create models in database
      for (const modelData of models) {
        try {
          const existing = await prisma.aiModel.findFirst({
            where: { slug: modelData.slug, providerId: provider.id },
          });
          if (!existing) {
            await prisma.aiModel.create({
              data: {
                name: modelData.name,
                slug: modelData.slug,
                providerId: provider.id,
                capabilities: JSON.stringify(modelData.capabilities),
                contextLength: modelData.contextLength,
                isActive: true,
              },
            });
          }
        } catch {
          // Skip duplicates silently
        }
      }

      return { success: true, models, count: models.length };
    } catch (error) {
      return { success: false, models: [], message: `Error fetching models: ${(error as Error).message}` };
    }
  }

  // ── Chat Completion ──

  async chatCompletion(providerSlug: string, modelSlug: string, messages: ChatMessage[], options?: { temperature?: number; max_tokens?: number; stream?: boolean; tools?: any[] }) {
    const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
    if (!provider) throw new NotFoundError('AI provider not found');
    if (!provider.isEnabled) throw new AppError(400, 'AI provider is disabled');

    const model = await prisma.aiModel.findUnique({ where: { slug: modelSlug } });
    if (!model) throw new NotFoundError('AI model not found');
    if (!model.isActive) throw new AppError(400, 'AI model is not active');

    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const apiKey = await this.getDecryptedApiKey(provider.id);

    const body: any = {
      model: modelSlug,
      messages: messages.map(m => {
        const msg: any = { role: m.role };
        // Preserve tool_calls for assistant messages that contain them
        if ((m as any).tool_calls) {
          msg.tool_calls = (m as any).tool_calls;
        }
        // For tool role messages, content might be empty string
        if (m.role === 'tool') {
          msg.content = m.content;
          msg.tool_call_id = (m as any).tool_call_id;
        } else {
          msg.content = m.content;
        }
        return msg;
      }),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? Math.min(model.contextLength, 4096),
    };

    // Pass native function tools if provided
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      // Allow the model to decide when to call tools
      body.tool_choice = 'auto';
    }

    if (options?.stream) {
      body.stream = true;
    }

try {
       const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': apiKey ? `Bearer ${apiKey}` : '',
         },
         body: JSON.stringify(body),
       });

       if (!response.ok) {
         const errorText = await response.text();
         throw new AppError(response.status, `AI provider error: ${errorText}`);
       }

       if (options?.stream && response.body) {
         return response.body;
       }

       const completion = await response.json();
       return completion;
} catch (error: any) {
       if (error instanceof AppError) throw error;
       logger.error('AI chat completion failed', { error: error.message });
       throw new AppError(502, `AI provider request failed: ${error.message}`);
     }
   }

   // ── Streaming Chat Completion with XML Tag Extraction ──

   async chatCompletionStream(
     providerSlug: string,
     modelSlug: string,
     messages: ChatMessage[],
     callbacks: StreamCallbacks,
     options?: { temperature?: number; max_tokens?: number; tools?: any[] }
   ): Promise<void> {
     const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
     if (!provider) throw new NotFoundError('AI provider not found');
     if (!provider.isEnabled) throw new AppError(400, 'AI provider is disabled');

     const model = await prisma.aiModel.findUnique({ where: { slug: modelSlug } });
     if (!model) throw new NotFoundError('AI model not found');
     if (!model.isActive) throw new AppError(400, 'AI model is not active');

     const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
     const apiKey = await this.getDecryptedApiKey(provider.id);

     const body: any = {
       model: modelSlug,
       messages: messages.map(m => {
         const msg: any = { role: m.role };
         if ((m as any).tool_calls) msg.tool_calls = (m as any).tool_calls;
         if (m.role === 'tool') {
           msg.content = m.content;
           msg.tool_call_id = (m as any).tool_call_id;
         } else {
           msg.content = m.content;
         }
        return msg;
      }),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? Math.min(model.contextLength, 4096),
      stream: true,
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `AI provider error: ${errorText}`);
      }

      if (!response.body) throw new AppError(502, 'No response body from AI provider');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // XML tag parsing state machine
      let buffer = '';
      let fullContent = '';
      let fullThinking = '';
      let currentTag: 'title' | 'thinking' | 'answer' | null = null;
      let tagContentBuffer = '';
      let titleExtracted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Extract tool calls from stream
            if (parsed.choices?.[0]?.delta?.tool_calls) {
              const toolCall = parsed.choices[0].delta.tool_calls[0];
              if (callbacks.onToolCall) callbacks.onToolCall(toolCall);
              continue;
            }

            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            const token = delta.content || '';
            if (!token) continue;

            // Process token through XML state machine
            for (let i = 0; i < token.length; i++) {
              const char = token[i];
              const remaining = token.slice(i);

              if (currentTag === null) {
                // Not inside any tag — look for opening tags
                if (char === '<') {
                  if (remaining.startsWith('<title>') && !titleExtracted) {
                    currentTag = 'title';
                    tagContentBuffer = '';
                    i += '<title>'.length - 1;
                    continue;
                  } else if (remaining.startsWith('<thinking>')) {
                    currentTag = 'thinking';
                    tagContentBuffer = '';
                    i += '<thinking>'.length - 1;
                    continue;
                  } else if (remaining.startsWith('<answer>')) {
                    currentTag = 'answer';
                    tagContentBuffer = '';
                    i += '<answer>'.length - 1;
                    continue;
                  } else {
                    // Literal '<' character — treat as content
                    fullContent += char;
                    if (callbacks.onContent) callbacks.onContent(char);
                  }
                } else {
                  // Regular content outside tags
                  fullContent += char;
                  if (callbacks.onContent) callbacks.onContent(char);
                }
              } else {
                // Inside a tag — look for closing tag
                let closingTag = '';
                if (currentTag === 'title') closingTag = '</title>';
                else if (currentTag === 'thinking') closingTag = '</thinking>';
                else if (currentTag === 'answer') closingTag = '</answer>';

                if (remaining.startsWith(closingTag)) {
                  // Tag closed — process accumulated content
                  const tagContent = tagContentBuffer;

                  if (currentTag === 'title' && !titleExtracted) {
                    titleExtracted = true;
                    const extractedTitle = tagContent.trim();
                    // Title is not streamed to content callback
                    // It will be handled by the AIChatService for DB update
                  } else if (currentTag === 'thinking') {
                    fullThinking = tagContent;
                    // Send complete thinking to callback
                    if (callbacks.onThinking) callbacks.onThinking(tagContent);
                  } else if (currentTag === 'answer') {
                    // Answer tag closed — nothing special needed
                  }

                  currentTag = null;
                  tagContentBuffer = '';
                  i += closingTag.length - 1;
                } else {
                  // Accumulate content inside tag
                  tagContentBuffer += char;

                  // Stream thinking incrementally
                  if (currentTag === 'thinking') {
                    fullThinking = tagContentBuffer;
                    if (callbacks.onThinking) callbacks.onThinking(fullThinking);
                  }
                  // Stream answer content immediately
                  else if (currentTag === 'answer') {
                    fullContent += char;
                    if (callbacks.onContent) callbacks.onContent(char);
                  }
                  // Title is buffered, not streamed
                }
              }
            }

            // Check finish reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason && finishReason !== 'null' && finishReason !== null) {
              if (callbacks.onDone) {
                callbacks.onDone({
                  content: fullContent.trim(),
                  thinking: fullThinking.trim(),
                  model: parsed.model || modelSlug,
                  tokens: parsed.usage?.total_tokens || parsed.usage?.completion_tokens || 0,
                });
              }
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Stream ended without explicit done signal
      if (callbacks.onDone) {
        callbacks.onDone({
          content: fullContent.trim(),
          thinking: fullThinking.trim(),
          model: modelSlug,
          tokens: 0,
        });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('AI streaming failed', { error: (error as Error).message });
      if (callbacks.onError) callbacks.onError((error as Error).message);
    }
  }

  // ── Helpers ──

  private sanitizeProvider(provider: any) {
    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      provider: provider.provider,
      baseUrl: provider.baseUrl,
      models: JSON.parse(provider.models || '[]'),
      config: provider.config ? JSON.parse(provider.config) : null,
      isEnabled: provider.isEnabled,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  private sanitizeModel(model: any) {
    return {
      id: model.id,
      name: model.name,
      slug: model.slug,
      providerId: model.providerId,
      capabilities: JSON.parse(model.capabilities || '[]'),
      contextLength: model.contextLength,
      pricing: model.pricing ? JSON.parse(model.pricing) : null,
      isActive: model.isActive,
      createdAt: model.createdAt,
    };
  }
}