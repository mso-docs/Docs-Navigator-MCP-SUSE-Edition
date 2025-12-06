#!/usr/bin/env node

import express from 'express';
import { AIService } from './services/ai-service.js';
import { DocumentationService } from './services/documentation-service.js';
import { VectorService } from './services/vector-service.js';
import { ChangeDetectionService } from './services/change-detection-service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const aiService = new AIService();
const docService = new DocumentationService();
const vectorService = new VectorService();
const changeDetectionService = new ChangeDetectionService();

// Middleware
app.use(express.json());
// Serve static files from the public directory (one level up from src)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes

// Health check
app.get('/api/health', async (req, res) => {
  const aiAvailable = await aiService.checkAvailability();
  res.json({
    status: 'ok',
    aiService: aiAvailable ? 'available' : 'unavailable',
    provider: process.env.AI_PROVIDER || 'ollama',
  });
});

// List documentation sources
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await docService.listSources();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Search documentation
app.post('/api/search', async (req, res) => {
  try {
    const { query, source = 'all', limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await vectorService.search(query, source, limit);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Ask a question
app.post('/api/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Search for relevant documentation
    const searchResults = await vectorService.search(question, 'all', 5);
    
    // Generate answer using AI
    const answer = await aiService.answerQuestion(question, searchResults, context);
    
    res.json({ answer, sources: searchResults });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get documentation content
app.post('/api/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const content = await docService.fetchDocumentation(url);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Summarize documentation
app.post('/api/summarize', async (req, res) => {
  try {
    const { url, format = 'brief' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const content = await docService.fetchDocumentation(url);
    const summary = await aiService.summarize(content, format);
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Index documentation
app.post('/api/index', async (req, res) => {
  try {
    const { source, forceRefresh = false } = req.body;
    
    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }

    // Return immediately and process in background
    res.json({ message: 'Indexing started', source });
    
    // Process in background
    const status = await docService.indexDocumentation(source, forceRefresh);
    console.log('Indexing complete:', status);
  } catch (error) {
    console.error('Indexing error:', error);
  }
});

// Check for changes
app.post('/api/check-changes', async (req, res) => {
  try {
    const { source, limit, olderThanDays } = req.body;
    
    await changeDetectionService.initialize();
    
    if (source) {
      const result = await changeDetectionService.checkSourceForChanges(source, {
        limit,
        olderThanDays,
        parallel: 3,
      });
      res.json({ result });
    } else {
      return res.status(400).json({ error: 'Source is required' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get change detection statistics
app.get('/api/change-stats', async (req, res) => {
  try {
    await changeDetectionService.initialize();
    const stats = await changeDetectionService.getStatistics();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SUSE Docs Navigator Web UI running at http://localhost:${PORT}`);
  console.log(`\nConfiguration:`);
  console.log(`  AI Provider: ${process.env.AI_PROVIDER || 'ollama'}`);
  console.log(`  Model: ${process.env.OLLAMA_MODEL || 'llama3.2:latest'}`);
  console.log(`\nOpen http://localhost:${PORT} in your browser to get started!\n`);
});
