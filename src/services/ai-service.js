import { Ollama } from 'ollama';
import OpenAI from 'openai';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'ollama';
    // Support separate provider for embeddings (defaults to main provider)
    this.embeddingProvider = process.env.EMBEDDING_PROVIDER || this.provider;
    this.model = this.getModelName();
    this.embeddingCache = new Map();
    this.cachePath = process.env.EMBEDDING_CACHE_PATH || './data/embedding-cache.json';
    this.cacheStats = {
      hits: 0,
      misses: 0,
      loaded: 0,
    };
    this.cacheLoaded = false;
    this.initializeClient();
  }

  getModelName() {
    switch (this.provider) {
      case 'ollama':
        return process.env.OLLAMA_MODEL || 'llama3.2:latest';
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      case 'anthropic':
        return process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
      case 'huggingface':
        return process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
      default:
        return 'llama3.2:latest';
    }
  }

  initializeClient() {
    // Initialize client for main provider (Q&A/chat)
    switch (this.provider) {
      case 'ollama':
        this.ollamaClient = new Ollama({
          host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        });
        break;
      case 'openai':
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        break;
      case 'anthropic':
        // Anthropic uses OpenAI-compatible API
        this.anthropicClient = new OpenAI({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: 'https://api.anthropic.com/v1',
        });
        break;
      case 'huggingface':
        // Hugging Face Inference Providers speaks the OpenAI chat API. Open models, billed to your HF account.
        this.huggingfaceClient = new OpenAI({
          apiKey: process.env.HF_TOKEN || 'missing-token',
          baseURL: process.env.HF_BASE_URL || 'https://router.huggingface.co/v1',
        });
        break;
      case 'none':
        break;
    }
    
    // Initialize separate client for embeddings if different provider
    if (this.embeddingProvider !== this.provider) {
      switch (this.embeddingProvider) {
        case 'ollama':
          if (!this.ollamaClient) {
            this.ollamaClient = new Ollama({
              host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            });
          }
          break;
        case 'openai':
          if (!this.openaiClient) {
            this.openaiClient = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });
          }
          break;
        case 'anthropic':
          // For embeddings, Anthropic uses OpenAI embeddings API
          if (!this.openaiClient) {
            this.openaiClient = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
            });
          }
          break;
      }
    }
  }

  async summarize(content, format = 'brief') {
    const prompts = {
      brief: `Provide a brief summary (2-3 sentences) of the following documentation:\n\n${content}`,
      detailed: `Provide a detailed summary of the following documentation, including key concepts, features, and important details:\n\n${content}`,
      'bullet-points': `Summarize the following documentation as a bullet-point list of key points:\n\n${content}`,
    };

    const prompt = prompts[format] || prompts.brief;

    return await this.generateCompletion(prompt);
  }

  async answerQuestion(question, searchResults, additionalContext) {
    const contextText = searchResults
      .map((result, idx) => {
        return `[Source ${idx + 1}: ${result.metadata.title} - ${result.metadata.url}]\n${result.content}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a helpful assistant that answers questions about SUSE, Rancher, K3s, and related documentation.

Question: ${question}

${additionalContext ? `Additional Context: ${additionalContext}\n\n` : ''}

Based on the following documentation sources, provide a comprehensive answer. Always cite your sources using [Source N] notation.

Documentation Sources:
${contextText}

Answer:`;

    return await this.generateCompletion(prompt);
  }

  async loadEmbeddingCache() {
    if (this.cacheLoaded) return;

    try {
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });

      const data = await fs.readFile(this.cachePath, 'utf-8');
      const cacheData = JSON.parse(data);

      // Load into Map
      for (const [key, value] of Object.entries(cacheData)) {
        this.embeddingCache.set(key, value);
      }

      this.cacheStats.loaded = this.embeddingCache.size;
      console.log(`📦 Loaded ${this.cacheStats.loaded} cached embeddings from disk`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load embedding cache:', error.message);
      }
      // If file doesn't exist, start with empty cache
    }

    this.cacheLoaded = true;
  }

  async saveEmbeddingCache() {
    try {
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });

      // Convert Map to object for JSON serialization
      const cacheData = Object.fromEntries(this.embeddingCache);

      await fs.writeFile(this.cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      console.log(`💾 Saved ${this.embeddingCache.size} embeddings to cache`);
    } catch (error) {
      console.error('Failed to save embedding cache:', error.message);
    }
  }

  hashText(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getOrCreateEmbedding(text, retries = 3) {
    // Ensure cache is loaded
    await this.loadEmbeddingCache();

    // Use SHA-256 hash as cache key
    const cacheKey = this.hashText(text);

    if (this.embeddingCache.has(cacheKey)) {
      this.cacheStats.hits++;
      return this.embeddingCache.get(cacheKey);
    }

    // Cache miss - generate new embedding with retry logic
    this.cacheStats.misses++;
    let embedding;
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Use embeddingProvider instead of provider for embeddings
        if (this.embeddingProvider === 'ollama') {
          const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
          const response = await this.ollamaClient.embeddings({
            model: embeddingModel,
            prompt: text,
          });
          embedding = response.embedding;
        } else if (this.embeddingProvider === 'openai' || this.embeddingProvider === 'anthropic') {
          // Both OpenAI and Anthropic use OpenAI's embedding API
          const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
          const response = await this.openaiClient.embeddings.create({
            model: embeddingModel,
            input: text,
          });
          embedding = response.data[0].embedding;
        } else {
          throw new Error(`Embedding generation not supported for provider: ${this.embeddingProvider}`);
        }

        // Success! Cache the result
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
      } catch (error) {
        lastError = error;
        
        // Don't retry on validation errors
        if (error.message && error.message.includes('not supported')) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
          console.warn(`Embedding request failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to generate embedding after ${retries} attempts: ${lastError.message}`);
  }

  async generateEmbedding(text) {
    // Delegate to new caching method
    return await this.getOrCreateEmbedding(text);
  }

  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(1) : '0.0';
    
    return {
      ...this.cacheStats,
      total,
      hitRate: `${hitRate}%`,
      currentSize: this.embeddingCache.size,
    };
  }

  resetCacheStats() {
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
  }

  async generateCompletion(prompt) {
    try {
      if (this.provider === 'ollama') {
        const response = await this.ollamaClient.generate({
          model: this.model,
          prompt: prompt,
          stream: false,
        });
        return response.response;
      } else if (this.provider === 'openai') {
        const response = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
        return response.choices[0]?.message?.content || 'No response generated';
      } else if (this.provider === 'huggingface') {
        const response = await this.huggingfaceClient.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1200,
        });
        return response.choices[0]?.message?.content || 'No response generated';
      } else if (this.provider === 'anthropic') {
        const response = await this.anthropicClient.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
        return response.choices[0]?.message?.content || 'No response generated';
      }

      if (this.provider === 'none') throw new Error('AI answers are turned off (AI_PROVIDER=none)');
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error) {
      throw new Error(`AI completion failed: ${error}`);
    }
  }

  async checkAvailability() {
    try {
      if (this.provider === 'none') return false;
      if (this.provider === 'ollama') {
        // Check if Ollama is running
        await this.ollamaClient.list();
        return true;
      }
      if (this.provider === 'huggingface') return Boolean(process.env.HF_TOKEN);
      if (this.provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
      if (this.provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
      return true;
    } catch (error) {
      console.error(`AI service not available (${this.provider}):`, error.message || error);
      return false;
    }
  }
}
