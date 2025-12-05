#!/usr/bin/env node

/**
 * Test script for the MCP server
 * This script demonstrates how to test individual components
 */

import { AIService } from '../services/ai-service.js';
import { DocumentationService } from '../services/documentation-service.js';
import { VectorService } from '../services/vector-service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAIService() {
  console.log('\n=== Testing AI Service ===');
  const aiService = new AIService();
  
  const available = await aiService.checkAvailability();
  console.log(`AI Service Available: ${available}`);
  
  if (available) {
    console.log('Generating test summary...');
    const summary = await aiService.summarize(
      'SUSE Linux Enterprise Server (SLES) is a reliable, scalable, and secure server operating system, built to power mission-critical workloads.',
      'brief'
    );
    console.log('Summary:', summary);
  }
}

async function testDocumentationService() {
  console.log('\n=== Testing Documentation Service ===');
  const docService = new DocumentationService();
  
  const sources = await docService.listSources();
  console.log('Available Documentation Sources:');
  sources.forEach(source => {
    console.log(`  - ${source.name} (${source.baseUrl})`);
  });
}

async function testVectorService() {
  console.log('\n=== Testing Vector Service ===');
  const vectorService = new VectorService();
  
  // Test adding a document
  console.log('Adding test document...');
  await vectorService.addDocument({
    id: 'test-doc-1',
    content: 'K3s is a lightweight Kubernetes distribution. It is easy to install and requires minimal resources.',
    metadata: {
      source: 'test',
      url: 'https://example.com/test',
      title: 'Test Document',
      indexedAt: new Date().toISOString(),
    },
  });
  
  console.log('Searching for "kubernetes"...');
  const results = await vectorService.search('kubernetes', 'all', 3);
  console.log(`Found ${results.length} results`);
  results.forEach((result, idx) => {
    console.log(`\n  Result ${idx + 1}:`);
    console.log(`    Title: ${result.metadata.title}`);
    console.log(`    Score: ${result.metadata.score}`);
  });
}

async function main() {
  console.log('Docs Navigator MCP - Component Tests\n');
  console.log('Configuration:');
  console.log(`  AI Provider: ${process.env.AI_PROVIDER || 'ollama'}`);
  console.log(`  Model: ${process.env.OLLAMA_MODEL || 'llama3.2:latest'}`);
  
  try {
    await testDocumentationService();
    await testAIService();
    await testVectorService();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
