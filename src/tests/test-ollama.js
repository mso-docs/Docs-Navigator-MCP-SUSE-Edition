#!/usr/bin/env node

/**
 * Simple test to diagnose Ollama embedding issues
 */

import { Ollama } from 'ollama';
import dotenv from 'dotenv';

dotenv.config();

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

console.log('Testing Ollama embeddings...\n');
console.log(`Ollama URL: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
console.log(`Model: nomic-embed-text\n`);

async function testSequential() {
  console.log('📝 Test 1: Sequential embeddings (one at a time)');
  
  const texts = [
    'Hello world',
    'How to install K3s',
    'Rancher documentation',
    'SUSE Linux Enterprise',
    'Kubernetes cluster management',
  ];
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const start = Date.now();
      const response = await ollama.embed({
        model: 'nomic-embed-text',
        input: texts[i],
      });
      const duration = Date.now() - start;
      console.log(`  ✅ ${i+1}/${texts.length}: "${texts[i]}" (${duration}ms, ${response.embeddings[0].length} dims)`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`  ❌ ${i+1}/${texts.length}: Failed - ${error.message}`);
    }
  }
}

async function testConcurrent() {
  console.log('\n📝 Test 2: Concurrent embeddings (3 at once)');
  
  const texts = [
    'Test concurrent 1',
    'Test concurrent 2',
    'Test concurrent 3',
  ];
  
  try {
    const start = Date.now();
    const promises = texts.map(text => 
      ollama.embed({
        model: 'nomic-embed-text',
        input: text,
      })
    );
    
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - start;
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`  ✅ ${idx+1}/3: Success (${result.value.embeddings[0].length} dims)`);
      } else {
        console.error(`  ❌ ${idx+1}/3: Failed - ${result.reason.message}`);
      }
    });
    
    console.log(`  ⏱️  Total time: ${duration}ms`);
  } catch (error) {
    console.error(`  ❌ Concurrent test failed: ${error.message}`);
  }
}

async function testWithRetry() {
  console.log('\n📝 Test 3: Large document with retry');
  
  const largeText = `
    K3s is a lightweight Kubernetes distribution created by Rancher Labs.
    It is designed for resource-constrained environments and edge computing.
    K3s packages everything needed to run Kubernetes in a single binary.
    It includes the Kubernetes API server, controller manager, scheduler, and more.
    K3s is fully compliant with upstream Kubernetes and passes all CNCF conformance tests.
  `.repeat(10); // Make it longer
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const start = Date.now();
      const response = await ollama.embed({
        model: 'nomic-embed-text',
        input: largeText,
      });
      const duration = Date.now() - start;
      console.log(`  ✅ Attempt ${attempts}: Success (${duration}ms, ${response.embeddings[0].length} dims)`);
      console.log(`     Text length: ${largeText.length} characters`);
      break;
    } catch (error) {
      console.error(`  ❌ Attempt ${attempts}: Failed - ${error.message}`);
      if (attempts < maxAttempts) {
        const delay = Math.pow(2, attempts - 1) * 500;
        console.log(`     Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Run tests
try {
  await testSequential();
  await testConcurrent();
  await testWithRetry();
  
  console.log('\n✅ All tests completed!');
} catch (error) {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
}
