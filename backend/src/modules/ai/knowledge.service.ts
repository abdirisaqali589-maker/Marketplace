import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { AiToolRegistry } from './ai-tool-registry.service';

/**
 * KnowledgeService
 *
 * Manages knowledge base entries with embedding support for RAG-style retrieval.
 * Supports multiple embedding providers and vector similarity search.
 */

interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

export class KnowledgeService {
  private embeddingProvider: string;
  private embeddingModel: string;
  private dimension: number;

  constructor() {
    this.embeddingProvider = process.env.EMBEDDING_PROVIDER || 'openai';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimension = 1536; // Default for OpenAI text-embedding-3-small
  }

  /**
   * Create a new knowledge entry with optional embedding.
   */
  async createEntry(data: {
    title: string;
    content: string;
    category?: string;
    enabled?: boolean;
    roles?: string[];
    metadata?: Record<string, any>;
    embeddingProvider?: string;
  }): Promise<any> {
    // Generate embedding if an AI provider is configured
    let embedding: number[] | null = null;
    const provider = data.embeddingProvider || this.embeddingProvider;

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const result = await this.generateEmbedding(data.content, provider);
        embedding = result.embedding;
      } catch (error: any) {
        logger.warn('Embedding generation failed, storing without embedding', { error: error.message });
      }
    } else if (provider === 'local') {
      // Use simple hash-based embedding for local models
      embedding = this.generateLocalEmbedding(data.content);
    }

    const entry = await prisma.aiKnowledgeSource.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category || 'general',
        enabled: data.enabled ?? true,
        roles: data.roles ? JSON.stringify(data.roles) : null,
        embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return this.sanitize(entry);
  }

  /**
   * Update an existing knowledge entry.
   */
  async updateEntry(id: string, data: {
    title?: string;
    content?: string;
    category?: string;
    enabled?: boolean;
    roles?: string[];
    metadata?: Record<string, any>;
    regenerateEmbedding?: boolean;
  }): Promise<any> {
    const existing = await prisma.aiKnowledgeSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Knowledge entry not found');

    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) {
      updateData.content = data.content;
      // Regenerate embedding if content changed
      if (data.regenerateEmbedding !== false && (data.content !== existing.content)) {
        try {
          const embedding = await this.generateEmbedding(data.content, this.embeddingProvider);
          updateData.embedding = JSON.stringify(embedding.embedding);
        } catch (error: any) {
          logger.warn('Embedding regeneration failed', { error: error.message });
        }
      }
    }
    if (data.category !== undefined) updateData.category = data.category;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.roles !== undefined) updateData.roles = JSON.stringify(data.roles);
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const updated = await prisma.aiKnowledgeSource.update({ where: { id }, data: updateData });
    return this.sanitize(updated);
  }

  /**
   * Delete a knowledge entry.
   */
  async deleteEntry(id: string): Promise<any> {
    const existing = await prisma.aiKnowledgeSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Knowledge entry not found');
    await prisma.aiKnowledgeSource.delete({ where: { id } });
    return { success: true, message: 'Knowledge entry deleted' };
  }

  /**
   * Get a single knowledge entry by ID.
   */
  async getEntry(id: string): Promise<any> {
    const entry = await prisma.aiKnowledgeSource.findUnique({ where: { id } });
    if (!entry) throw new NotFoundError('Knowledge entry not found');
    return this.sanitize(entry);
  }

  /**
   * List all knowledge entries with optional filtering.
   */
  async listEntries(query: {
    category?: string;
    enabled?: boolean;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.category) where.category = query.category;
    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.aiKnowledgeSource.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.aiKnowledgeSource.count({ where }),
    ]);

    return {
      data: entries.map(e => this.sanitize(e)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Semantic search across knowledge base using vector similarity.
   * Falls back to keyword search if embeddings are not available.
   */
  async search(query: string, options?: {
    category?: string;
    role?: string;
    limit?: number;
    minScore?: number;
    useEmbeddings?: boolean;
  }): Promise<any> {
    const limit = options?.limit || 10;
    const minScore = options?.minScore || 0.7;
    const useEmbeddings = options?.useEmbeddings !== false;

    // Try embedding-based search first
    if (useEmbeddings) {
      try {
        const queryEmbedding = await this.getOrGenerateEmbedding(query);
        if (queryEmbedding) {
          const results = await this.vectorSearch(queryEmbedding, {
            category: options?.category,
            role: options?.role,
            limit: limit * 2, // Fetch more, filter by score
            minScore,
          });
          if (results.length > 0) {
            return {
              results: results.slice(0, limit),
              searchType: 'semantic',
              query,
            };
          }
        }
      } catch (error: any) {
        logger.warn('Embedding search failed, falling back to keyword', { error: error.message });
      }
    }

    // Fallback to keyword search
    const where: Record<string, any> = { enabled: true };
    if (options?.category) where.category = options.category;
    if (options?.role) {
      // Filter by role access
      const entries = await prisma.aiKnowledgeSource.findMany({ where: { enabled: true } });
      const roleEntries = entries.filter(e => {
        if (!e.roles) return true;
        const roles = JSON.parse(e.roles as string);
        return roles.includes(options.role!);
      });

      const keywordResults = this.keywordSearch(roleEntries, query);
      return {
        results: keywordResults.slice(0, limit),
        searchType: 'keyword',
        query,
      };
    }

    const entries = await prisma.aiKnowledgeSource.findMany({
      where: { enabled: true, ...(options?.category ? { category: options.category } : {}) },
    });

    const keywordResults = this.keywordSearch(entries, query);
    return {
      results: keywordResults.slice(0, limit),
      searchType: 'keyword',
      query,
    };
  }

  /**
   * Bulk import knowledge entries from a file or array.
   */
  async bulkImport(entries: Array<{
    id?: string;
    title: string;
    content: string;
    category?: string;
    roles?: string[];
    metadata?: Record<string, any>;
  }>, options?: {
    generateEmbeddings?: boolean;
    batchSize?: number;
  }): Promise<any> {
    const batchSize = options?.batchSize || 50;
    const generateEmbeddings = options?.generateEmbeddings !== false;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      for (const entry of batch) {
        try {
          let embedding: number[] | null = null;
          if (generateEmbeddings) {
            try {
              const result = await this.generateEmbedding(entry.content, this.embeddingProvider);
              embedding = result.embedding;
            } catch (error: any) {
              logger.warn(`Embedding failed for entry "${entry.title}"`, { error: error.message });
            }
          }

          await prisma.aiKnowledgeSource.upsert({
            where: { id: entry.id || '' },
            update: { content: entry.content, category: entry.category || 'general', enabled: true },
            create: {
              title: entry.title,
              content: entry.content,
              category: entry.category || 'general',
              roles: entry.roles ? JSON.stringify(entry.roles) : null,
              embedding: embedding ? JSON.stringify(embedding) : null,
              metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
              enabled: true,
            },
          });
          totalCreated++;
        } catch (error: any) {
          logger.error(`Failed to import entry "${entry.title}": ${error.message}`);
          if (error.code === 'P2002') totalSkipped++;
          else totalErrors++;
        }
      }
    }

    return { totalCreated, totalSkipped, totalErrors, totalRequested: entries.length };
  }

  /**
   * Get embedding for a text, using cache if available.
   */
  async getOrGenerateEmbedding(text: string): Promise<number[] | null> {
    // Check if we have a matching cached embedding
    const cached = await prisma.aiKnowledgeSource.findFirst({
      where: { title: text.substring(0, 100), embedding: { not: null } },
    });
    if (cached?.embedding) return JSON.parse(cached.embedding as string);

    return this.generateEmbedding(text, this.embeddingProvider).then(r => r.embedding).catch(() => null);
  }

  /**
   * Generate embedding using configured provider.
   */
  async generateEmbedding(text: string, provider: string = 'openai'): Promise<EmbeddingResult> {
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new AppError(500, 'OpenAI API key not configured for embeddings');

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `Embedding API error: ${errorText}`);
      }

      const data = await response.json() as any;
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) throw new AppError(500, 'Invalid embedding response');

      return { embedding, model: this.embeddingModel, tokens: data.usage?.total_tokens || 0 };
    }

    throw new AppError(500, `Unsupported embedding provider: ${provider}`);
  }

  /**
   * Simple local embedding using character-level hashing (for testing/demo).
   * NOT suitable for production — use a real embedding model.
   */
  private generateLocalEmbedding(text: string): number[] {
    const dimension = this.dimension;
    const embedding = new Array(dimension).fill(0);

    // Simple hash-based embedding for local testing
    for (let i = 0; i < text.length; i++) {
      const hash = this.hashChar(text.charCodeAt(i), i);
      for (let j = 0; j < Math.min(8, dimension); j++) {
        embedding[(hash + j) % dimension] += Math.sin(i * (j + 1)) * 0.1;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
    return embedding.map(v => v / magnitude);
  }

  private hashChar(charCode: number, position: number): number {
    let hash = charCode;
    hash = ((hash << 5) - hash) + position;
    hash = hash & hash; // Convert to 32-bit integer
    return Math.abs(hash);
  }

  /**
   * Vector similarity search using cosine similarity.
   */
  private async vectorSearch(queryEmbedding: number[], options?: {
    category?: string;
    role?: string;
    limit?: number;
    minScore?: number;
  }): Promise<Array<{ id: string; title: string; content: string; category: string; score: number }>> {
    const where: Record<string, any> = { enabled: true, embedding: { not: null } };
    if (options?.category) where.category = options.category;

    const entries = await prisma.aiKnowledgeSource.findMany({ where });

    const results = entries
      .map(entry => ({
        ...this.sanitize(entry),
        score: this.cosineSimilarity(
          queryEmbedding,
          entry.embedding ? JSON.parse(entry.embedding as string) : []
        ),
      }))
      .filter(r => r.score >= (options?.minScore || 0.7))
      .sort((a, b) => b.score - a.score);

    return results.slice(0, options?.limit || 10);
  }

  /**
   * Cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denominator = Math.sqrt(magA) * Math.sqrt(magB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Keyword-based fallback search using TF-IDF scoring.
   */
  private keywordSearch(entries: any[], query: string): Array<{ id: string; title: string; content: string; category: string; score: number }> {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    return entries
      .map(entry => {
        const text = `${entry.title} ${entry.content}`.toLowerCase();
        let score = 0;

        for (const word of queryWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) {
            score += matches.length;
            // Title matches are worth more
            if (entry.title.toLowerCase().includes(word)) score += 2;
          }
        }

        return { ...this.sanitize(entry), score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get knowledge context for AI — retrieves relevant entries and formats them for system prompts.
   */
  async getKnowledgeContext(query: string, options?: {
    role?: string;
    maxEntries?: number;
    category?: string;
  }): Promise<{ text: string; sources: string[] }> {
    const results = await this.search(query, {
      role: options?.role,
      category: options?.category,
      limit: options?.maxEntries || 5,
      useEmbeddings: true,
    });

    if (results.results.length === 0) return { text: '', sources: [] };

    const contextText = results.results
      .map((r: any, i: number) => `[Source ${i + 1}: ${r.title}]\n${r.content}`)
      .join('\n\n---\n\n');

    const sources = results.results.map((r: any) => r.title);

    return { text: contextText, sources };
  }

  private sanitize(entry: any) {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      embedding: entry.embedding ? JSON.parse(entry.embedding) : null,
      enabled: entry.enabled,
      roles: entry.roles ? JSON.parse(entry.roles) : null,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}

export const knowledgeService = new KnowledgeService();