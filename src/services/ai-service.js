import { Ollama } from 'ollama';
import OpenAI from 'openai';

export class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'ollama';
    this.model = this.getModelName();
    this.embeddingCache = new Map();
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
      default:
        return 'llama3.2:latest';
    }
  }

  initializeClient() {
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
        this.openaiClient = new OpenAI({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: 'https://api.anthropic.com/v1',
        });
        break;
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

  async generateEmbedding(text) {
    // Simple cache based on text hash (first 100 chars as key)
    const cacheKey = text.substring(0, 100);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    let embedding;
    
    if (this.provider === 'ollama') {
      const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
      const response = await this.ollamaClient.embeddings({
        model: embeddingModel,
        prompt: text,
      });
      embedding = response.embedding;
    } else if (this.provider === 'openai') {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      embedding = response.data[0].embedding;
    } else {
      throw new Error(`Embedding generation not supported for provider: ${this.provider}`);
    }

    // Cache the result (limit cache size to 1000 entries)
    if (this.embeddingCache.size > 1000) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
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
      } else if (this.provider === 'openai' || this.provider === 'anthropic') {
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
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error) {
      throw new Error(`AI completion failed: ${error}`);
    }
  }

  async checkAvailability() {
    try {
      if (this.provider === 'ollama') {
        // Check if Ollama is running
        await this.ollamaClient.list();
        return true;
      }
      return true;
    } catch (error) {
      console.error('AI service not available:', error);
      return false;
    }
  }
}
