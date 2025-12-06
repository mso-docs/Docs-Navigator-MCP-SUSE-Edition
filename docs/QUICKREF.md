# Quick Reference Guide

## Installation Commands

```bash
# Clone and setup
git clone https://github.com/mso-docs/Docs-Navigator-MCP-SUSE-Edition.git
cd Docs-Navigator-MCP-SUSE-Edition
npm install
cp .env.example .env
npm run build

# Ollama setup
ollama pull llama3.2:latest
ollama pull nomic-embed-text
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start the MCP server |
| `npm run web` | Start the web interface on localhost:3000 |
| `npm test` | Run component tests |
| `npm run index <source>` | Index documentation for a source |
| `npm run stats` | Show indexing statistics |
| `npm run check-changes` | Check documentation for updates |
| `npm run analytics` | Show cache analytics |
| `npm run query-cache` | Query cached documents |
| `npm run clear-locks` | Clear indexing locks |
| `npm run migrate-sqlite` | Migrate from JSON to SQLite cache |

## MCP Tools Reference

### search_docs
Search documentation with semantic search
```json
{
  "query": "string (required)",
  "source": "suse|rancher|k3s|all (optional, default: all)",
  "limit": "number (optional, default: 5)"
}
```

### ask_question
Ask questions about documentation
```json
{
  "question": "string (required)",
  "context": "string (optional)"
}
```

### summarize_doc
Generate AI summaries
```json
{
  "url": "string (required)",
  "format": "brief|detailed|bullet-points (optional, default: brief)"
}
```

### get_doc_section
Retrieve specific documentation
```json
{
  "url": "string (required)"
}
```

### index_documentation
Index documentation for search
```json
{
  "source": "suse|rancher|k3s|all (required)",
  "forceRefresh": "boolean (optional, default: false)"
}
```

### list_doc_sources
List available documentation sources (no parameters)

## Environment Variables

### Required
```env
AI_PROVIDER=ollama          # or openai, anthropic
```

### Ollama (Local AI)
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text
```

### OpenAI (Cloud)
```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4-turbo-preview
```

### Anthropic (Cloud)
```env
ANTHROPIC_API_KEY=your_key
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Documentation Sources
```env
SUSE_DOCS_BASE_URL=https://documentation.suse.com
RANCHER_DOCS_URL=https://ranchermanager.docs.rancher.com
K3S_DOCS_URL=https://docs.k3s.io
```

### Storage
```env
VECTOR_DB_PATH=./data/vectors
```

## Ollama Models

### Language Models (Choose one)
- `llama3.2:latest` - Fast, efficient (default)
- `mistral:latest` - Good balance
- `llama3.1:8b` - Larger, more capable
- `codellama:latest` - Code-focused

Pull with: `ollama pull <model-name>`

### Embedding Model (Required)
- `nomic-embed-text` - For semantic search

## Directory Structure

```
Docs-Navigator-MCP-SUSE-Edition/
├── src/
│   ├── index.ts                    # Main server
│   ├── test.ts                     # Tests
│   └── services/
│       ├── ai-service.ts           # AI integration
│       ├── documentation-service.ts # Doc fetching
│       └── vector-service.ts       # Vector search
├── dist/                           # Compiled code
├── data/vectors/                   # Vector database
├── .env                            # Your config
└── [documentation files]
```

## Common Commands

### Development
```bash
npm start                   # Run the MCP server
npm run web                 # Start web interface
```

### Indexing & Caching
```bash
npm run index k3s           # Index K3s documentation
npm run index all           # Index all sources
npm run stats               # Show indexing statistics
npm run analytics           # Detailed cache analytics
npm run query-cache         # Query cached documents
npm run clear-cache         # Clear cache
npm run clear-locks         # Clear indexing locks
```

### Change Detection
```bash
npm run check-changes                    # Check all sources
npm run check-changes k3s                # Check specific source
npm run check-changes -- --stats         # Show statistics
npm run check-changes -- --limit 10      # Check first 10 pages
npm run check-changes -- --days 7        # Check pages >7 days old
npm run check-changes -- --watch         # Watch mode (continuous)
```

### Testing
```bash
npm test                    # Run component tests
```

### Ollama
```bash
ollama list                 # List installed models
ollama pull <model>         # Download a model
ollama ps                   # Show running models
ollama rm <model>           # Remove a model
```

## Troubleshooting Quick Fixes

### "Cannot find module" errors
```bash
npm install
npm run build
```

### Ollama connection failed
```bash
# Check Ollama is running
ollama list

# Verify base URL in .env
OLLAMA_BASE_URL=http://localhost:11434
```

### MCP server not showing up
1. Check absolute paths in client config
2. Rebuild: `npm run build`
3. Restart MCP client completely

### Vector search returns no results
```bash
# Re-index documentation
# Use the index_documentation tool with forceRefresh: true
```

### TypeScript compilation errors
```bash
npm install --save-dev @types/node
npm run build
```

## File Locations

### Config Files
- `.env` - Your configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config

### Documentation
- `README.md` - Overview
- `INSTALL.md` - Installation guide
- `EXAMPLES.md` - Usage examples
- `ARCHITECTURE.md` - Technical details
- `CONTRIBUTING.md` - Contribution guide
- `MCP_CLIENT_CONFIG.md` - Client setup

### Claude Desktop Config
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Example Workflows

### First-Time Setup
1. `npm install`
2. `cp .env.example .env`
3. Edit `.env`
4. `ollama pull llama3.2:latest`
5. `ollama pull nomic-embed-text`
6. `npm run build`
7. Configure MCP client
8. Restart client

### Adding to Claude Desktop
1. Build project: `npm run build`
2. Get absolute path: `pwd` (or `cd` on Windows)
3. Edit Claude config file
4. Add server configuration
5. Restart Claude Desktop
6. Test with: "List documentation sources"

### Daily Development
1. `npm run dev` (keeps rebuilding)
2. Make changes to TypeScript files
3. Test with MCP client
4. Commit changes

## Support & Resources

- **Issues**: https://github.com/mso-docs/Docs-Navigator-MCP-SUSE-Edition/issues
- **MCP Docs**: https://modelcontextprotocol.io
- **Ollama**: https://ollama.ai

## Version Information

Check versions:
```bash
node -v                     # Node.js version
npm -v                      # npm version
ollama --version           # Ollama version
```

Minimum requirements:
- Node.js: 18+
- npm: 8+
- Ollama: Latest (for local AI)
