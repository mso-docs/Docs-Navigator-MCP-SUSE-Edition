#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { AIService } from './services/ai-service.js';
import { DocumentationService } from './services/documentation-service.js';
import { VectorService } from './services/vector-service.js';

dotenv.config();

class DocsNavigatorServer {
  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'docs-navigator-suse',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.aiService = new AIService();
    this.docService = new DocumentationService();
    this.vectorService = new VectorService();

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_docs':
            return await this.handleSearchDocs(args);
          case 'get_doc_section':
            return await this.handleGetDocSection(args);
          case 'summarize_doc':
            return await this.handleSummarizeDoc(args);
          case 'ask_question':
            return await this.handleAskQuestion(args);
          case 'index_documentation':
            return await this.handleIndexDocumentation(args);
          case 'list_doc_sources':
            return await this.handleListDocSources();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  getTools() {
    return [
      {
        name: 'search_docs',
        description:
          'Search SUSE, Rancher, K3s, and related documentation using semantic search. Returns relevant documentation sections.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant documentation',
            },
            source: {
              type: 'string',
              description: 'Optional: Filter by documentation source (suse, rancher, k3s, all)',
              enum: ['suse', 'rancher', 'k3s', 'all'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_doc_section',
        description: 'Retrieve a specific section of documentation by URL or identifier.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL or identifier of the documentation section',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'summarize_doc',
        description:
          'Generate an AI-powered summary of a documentation page or section using open-source models.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the documentation to summarize',
            },
            format: {
              type: 'string',
              description: 'Summary format: brief, detailed, or bullet-points',
              enum: ['brief', 'detailed', 'bullet-points'],
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'ask_question',
        description:
          'Ask a question about SUSE documentation. The AI will search relevant docs and provide an answer with sources.',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to answer about SUSE/Rancher/K3s documentation',
            },
            context: {
              type: 'string',
              description: 'Optional: Additional context or specific area to focus on',
            },
          },
          required: ['question'],
        },
      },
      {
        name: 'index_documentation',
        description:
          'Index documentation from specified sources for faster searching. This should be run initially or to update the index.',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Documentation source to index',
              enum: ['suse', 'rancher', 'k3s', 'all'],
            },
            forceRefresh: {
              type: 'boolean',
              description: 'Force re-indexing even if cache exists',
            },
          },
          required: ['source'],
        },
      },
      {
        name: 'list_doc_sources',
        description: 'List all available documentation sources and their status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async handleSearchDocs(args) {
    const query = args.query;
    const source = args.source || 'all';
    const limit = args.limit || 5;

    const results = await this.vectorService.search(query, source, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleGetDocSection(args) {
    const url = args.url;
    const { markdown } = await this.docService.fetchDocumentation(url);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  async handleSummarizeDoc(args) {
    const url = args.url;
    const format = args.format || 'brief';

    const { markdown } = await this.docService.fetchDocumentation(url);
    const summary = await this.aiService.summarize(markdown, format);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  }

  async handleAskQuestion(args) {
    const question = args.question;
    const context = args.context;

    // Search for relevant documentation
    const searchResults = await this.vectorService.search(question, 'all', 5);

    // Generate answer using AI with context
    const answer = await this.aiService.answerQuestion(question, searchResults, context);

    return {
      content: [
        {
          type: 'text',
          text: answer,
        },
      ],
    };
  }

  async handleIndexDocumentation(args) {
    const source = args.source;
    const forceRefresh = args.forceRefresh || false;

    const status = await this.docService.indexDocumentation(source, forceRefresh);

    return {
      content: [
        {
          type: 'text',
          text: `Documentation indexing ${status.success ? 'completed' : 'failed'}.\n` +
                `Indexed ${status.documentsIndexed} documents from ${source}.\n` +
                (status.error ? `Error: ${status.error}` : ''),
        },
      ],
    };
  }

  async handleListDocSources() {
    const sources = await this.docService.listSources();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sources, null, 2),
        },
      ],
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SUSE Docs Navigator MCP Server running on stdio');
  }
}

// Start the server
const server = new DocsNavigatorServer();
server.run().catch(console.error);
