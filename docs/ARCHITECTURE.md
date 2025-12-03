# Project Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Client                               │
│              (Claude Desktop, etc.)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (stdio)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 MCP Server (index.ts)                        │
│                                                              │
│  Tools:                                                      │
│  • search_docs           • ask_question                     │
│  • get_doc_section       • summarize_doc                    │
│  • index_documentation   • list_doc_sources                 │
└──────┬────────────────┬────────────────┬────────────────────┘
       │                │                │
       │                │                │
┌──────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────────┐
│ Documentation │ │  AI Service   │ │  Vector Service     │
│   Service     │ │               │ │                     │
└──────┬────────┘ └────┬──────────┘ └──┬──────────────────┘
       │                │                │
       │                │                │
┌──────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────────┐
│ Documentation │ │ Ollama/OpenAI │ │ Vectra Vector DB    │
│   Sources     │ │     LLMs      │ │   + Embeddings      │
│               │ │               │ │                     │
│ • SUSE        │ │ • Llama 3.2   │ │ • Indexed Docs      │
│ • Rancher     │ │ • Mistral     │ │ • Semantic Search   │
│ • K3s         │ │ • GPT-4       │ │ • Fast Retrieval    │
└───────────────┘ └───────────────┘ └─────────────────────┘
```

## Component Breakdown

### 1. MCP Server (`src/index.ts`)

**Responsibility**: Main entry point that implements the Model Context Protocol

**Key Features**:
- Handles tool registration and execution
- Manages request/response flow
- Coordinates between services
- Implements MCP protocol over stdio

**Tools Provided**:
- `search_docs`: Semantic search across documentation
- `ask_question`: AI-powered Q&A with source citations
- `summarize_doc`: Generate summaries in various formats
- `get_doc_section`: Retrieve specific documentation
- `index_documentation`: Index docs for faster search
- `list_doc_sources`: List available documentation sources

### 2. Documentation Service (`src/services/documentation-service.ts`)

**Responsibility**: Fetches, parses, and manages documentation

**Key Features**:
- Fetches documentation from multiple sources
- Converts HTML to Markdown
- Discovers documentation URLs (sitemap parsing)
- Manages documentation source registry
- Coordinates with Vector Service for indexing

**Supported Sources**:
- SUSE Documentation
- Rancher Documentation
- K3s Documentation

**Technologies**:
- axios: HTTP requests
- cheerio: HTML parsing
- turndown: HTML to Markdown conversion

### 3. AI Service (`src/services/ai-service.ts`)

**Responsibility**: Interfaces with AI models for generation and embeddings

**Key Features**:
- Multi-provider support (Ollama, OpenAI, Anthropic)
- Text summarization (brief, detailed, bullet-points)
- Question answering with context
- Embedding generation for vector search
- Provider health checking

**Models Supported**:
- **Local (Ollama)**: Llama 3.2, Mistral, etc.
- **Cloud**: GPT-4, Claude 3
- **Embeddings**: nomic-embed-text, OpenAI embeddings

### 4. Vector Service (`src/services/vector-service.ts`)

**Responsibility**: Manages semantic search and vector storage

**Key Features**:
- Document chunking for optimal retrieval
- Embedding generation and storage
- Semantic similarity search
- Document indexing and management
- Local vector database (Vectra)

**Process**:
1. Documents are split into chunks (~1000 chars)
2. Each chunk is embedded using AI models
3. Embeddings stored in local vector database
4. Search queries are embedded and matched against stored vectors
5. Top-K most similar chunks returned

## Data Flow

### Indexing Flow

```
Documentation URL
      ↓
Fetch & Parse (Documentation Service)
      ↓
Convert to Markdown
      ↓
Split into Chunks (Vector Service)
      ↓
Generate Embeddings (AI Service)
      ↓
Store in Vector DB (Vectra)
```

### Search Flow

```
User Query
      ↓
Generate Query Embedding (AI Service)
      ↓
Vector Similarity Search (Vector Service)
      ↓
Retrieve Top Results
      ↓
Return to MCP Client
```

### Question Answering Flow

```
User Question
      ↓
Generate Query Embedding (AI Service)
      ↓
Search Documentation (Vector Service)
      ↓
Retrieve Relevant Chunks
      ↓
Build Context with Sources
      ↓
Generate Answer (AI Service)
      ↓
Return Answer + Citations
```

## Technology Stack

### Core
- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment
- **MCP SDK**: Model Context Protocol implementation

### AI & ML
- **Ollama**: Local LLM inference
- **OpenAI SDK**: Cloud LLM support
- **Vectra**: Local vector database

### Documentation Processing
- **Axios**: HTTP client
- **Cheerio**: HTML parsing
- **Turndown**: HTML to Markdown conversion

### Development
- **TypeScript Compiler**: Build system
- **dotenv**: Environment configuration

## File Structure

```
Docs-Navigator-MCP-SUSE-Edition/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── test.ts                     # Component test script
│   └── services/
│       ├── ai-service.ts           # AI model integration
│       ├── documentation-service.ts # Doc fetching
│       └── vector-service.ts       # Vector search
├── dist/                           # Compiled JavaScript
├── data/
│   └── vectors/                    # Vector database storage
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── .env                            # Environment variables
├── .env.example                    # Environment template
├── README.md                       # Main documentation
├── INSTALL.md                      # Installation guide
├── EXAMPLES.md                     # Usage examples
├── CONTRIBUTING.md                 # Contribution guide
├── MCP_CLIENT_CONFIG.md           # Client configuration
└── ARCHITECTURE.md                # This file
```

## Configuration

### Environment Variables

```env
# AI Provider Selection
AI_PROVIDER=ollama|openai|anthropic

# Ollama Configuration (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text

# OpenAI Configuration (Cloud)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Documentation Sources
SUSE_DOCS_BASE_URL=https://documentation.suse.com
RANCHER_DOCS_URL=https://ranchermanager.docs.rancher.com
K3S_DOCS_URL=https://docs.k3s.io

# Storage
VECTOR_DB_PATH=./data/vectors
```

## Scalability & Performance

### Current Design
- **Local vector database**: Fast, private, no external dependencies
- **Chunked documents**: Optimal retrieval granularity
- **Cached embeddings**: No re-computation needed
- **Streaming support**: Can be added for large responses

### Future Enhancements
- Multiple vector database backends (Pinecone, Weaviate)
- Distributed indexing for large documentation sets
- Query result caching
- Incremental indexing (only update changed docs)
- Multi-language support

## Security Considerations

### Current Implementation
- Local-first by default (Ollama)
- No data sent to cloud unless configured
- Environment variables for sensitive data
- Read-only documentation access

### Best Practices
- Use `.env` for secrets (never commit)
- Prefer local models for sensitive docs
- Validate URLs before fetching
- Sanitize HTML during parsing

## Testing

### Manual Testing
```bash
npm run test
```

### Component Tests
- AI Service availability check
- Documentation source listing
- Vector database operations
- Embedding generation

### Integration Testing
Use an MCP client to test:
- Tool registration
- Request/response handling
- Error handling
- Multi-step workflows

## Debugging

### Enable Verbose Logging
```typescript
// Add to index.ts
console.error('[DEBUG]', message);
```

### Check Ollama Status
```bash
ollama list
curl http://localhost:11434/api/tags
```

### Inspect Vector Database
```bash
ls -la ./data/vectors
```

### MCP Protocol Debugging
MCP uses stdio - check client logs for protocol messages

## Deployment

### Local Development
```bash
npm run dev      # Watch mode
npm run build    # Production build
npm start        # Run server
```

### MCP Client Integration
Configure in client's JSON config file (see MCP_CLIENT_CONFIG.md)

### Production Considerations
- Use process managers (PM2, systemd)
- Configure log rotation
- Monitor resource usage
- Set up health checks

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Vectra Vector DB](https://github.com/Stevenic/vectra)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
