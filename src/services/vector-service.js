import { LocalIndex } from 'vectra';
import { AIService } from './ai-service.js';
import path from 'path';
import fs from 'fs/promises';

export class VectorService {
  constructor() {
    this.indexPath = process.env.VECTOR_DB_PATH || './data/vectors';
    this.index = new LocalIndex(this.indexPath);
    this.aiService = new AIService();
    this.initialized = false;
    this.updateQueue = Promise.resolve();
  }

  async ensureInitialized() {
    if (!this.initialized) {
      try {
        // Check if index directory exists
        await fs.access(this.indexPath);
        
        // Try to load existing index
        if (await this.index.isIndexCreated()) {
          await this.index.beginUpdate();
          await this.index.endUpdate();
        } else {
          await this.index.createIndex();
        }
      } catch (error) {
        // Create directory and index if it doesn't exist
        await fs.mkdir(this.indexPath, { recursive: true });
        await this.index.createIndex();
      }
      this.initialized = true;
    }
  }

  async addDocument(doc) {
    // Queue the update to serialize database operations
    this.updateQueue = this.updateQueue.then(async () => {
      await this.ensureInitialized();

      try {
        // Split content into chunks for better retrieval - increased chunk size for fewer chunks
        const chunks = this.splitIntoChunks(doc.content, 2000);

        await this.index.beginUpdate();

        try {
          // Generate all embeddings in parallel for this document
          const embeddingPromises = chunks.map(chunk => this.aiService.generateEmbedding(chunk));
          const embeddings = await Promise.all(embeddingPromises);

          // Insert all chunks at once
          for (let i = 0; i < chunks.length; i++) {
            const chunkId = `${doc.id}#chunk${i}`;

            await this.index.insertItem({
              id: chunkId,
              metadata: {
                ...doc.metadata,
                chunkIndex: i,
                totalChunks: chunks.length,
                originalDocId: doc.id,
              },
              vector: embeddings[i],
            });
            
            // Store chunk content separately
            await this.storeChunkContent(chunkId, chunks[i]);
          }

          await this.index.endUpdate();
        } catch (error) {
          // Ensure endUpdate is called even if there's an error
          try {
            await this.index.endUpdate();
          } catch (e) {
            // Ignore endUpdate errors
          }
          throw error;
        }
      } catch (error) {
        console.error(`Failed to add document ${doc.id}:`, error);
        throw error;
      }
    });

    // Wait for this operation to complete
    await this.updateQueue;
  }

  async search(query, source = 'all', limit = 5) {
    await this.ensureInitialized();

    try {
      // Generate query embedding
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      // Search the index
      const results = await this.index.queryItems(queryEmbedding, limit * 2);

      // Filter by source if specified
      const filteredResults = source === 'all' 
        ? results 
        : results.filter((r) => r.item.metadata.source === source);

      // Group chunks by original document and reconstruct content
      const documentMap = new Map();

      for (const result of filteredResults.slice(0, limit * 2)) {
        const originalDocId = result.item.metadata.originalDocId;
        
        if (!documentMap.has(originalDocId)) {
          // Read the chunk content from the index
          const content = await this.getChunkContent(result.item.id);
          
          documentMap.set(originalDocId, {
            content: content,
            metadata: {
              source: result.item.metadata.source,
              url: result.item.metadata.url,
              title: result.item.metadata.title,
              score: result.score,
            },
          });
        }

        if (documentMap.size >= limit) {
          break;
        }
      }

      return Array.from(documentMap.values());
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  sanitizeFilename(filename) {
    // Replace invalid characters for file systems (Windows is most restrictive)
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
      .replace(/\s+/g, '_')            // Replace spaces with underscore
      .substring(0, 200);              // Limit length to avoid path too long errors
  }

  async getChunkContent(chunkId) {
    // In Vectra, we need to store content separately or in metadata
    // For simplicity, we'll store it in a separate file structure
    try {
      const safeId = this.sanitizeFilename(chunkId);
      const contentPath = path.join(this.indexPath, 'content', `${safeId}.txt`);
      const content = await fs.readFile(contentPath, 'utf-8');
      return content;
    } catch (error) {
      return '[Content not available]';
    }
  }

  async storeChunkContent(chunkId, content) {
    try {
      const contentDir = path.join(this.indexPath, 'content');
      await fs.mkdir(contentDir, { recursive: true });
      const safeId = this.sanitizeFilename(chunkId);
      const contentPath = path.join(contentDir, `${safeId}.txt`);
      await fs.writeFile(contentPath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to store chunk content ${chunkId}:`, error);
    }
  }

  splitIntoChunks(text, maxChunkSize) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  async deleteDocument(docId) {
    await this.ensureInitialized();

    try {
      await this.index.beginUpdate();

      // Find all chunks for this document
      const allItems = await this.index.listItems();
      const chunksToDelete = allItems.filter(
        (item) => item.metadata.originalDocId === docId
      );

      for (const chunk of chunksToDelete) {
        await this.index.deleteItem(chunk.id);
      }

      await this.index.endUpdate();
    } catch (error) {
      console.error(`Failed to delete document ${docId}:`, error);
      throw error;
    }
  }

  async clear() {
    await this.ensureInitialized();
    await this.index.beginUpdate();
    const items = await this.index.listItems();
    for (const item of items) {
      await this.index.deleteItem(item.id);
    }
    await this.index.endUpdate();
  }
}
