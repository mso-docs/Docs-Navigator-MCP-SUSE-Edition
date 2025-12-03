# Installation Guide

Follow these steps to set up the SUSE Docs Navigator MCP Server.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** (for local open-source AI models) - Download from [ollama.ai](https://ollama.ai)
3. **Git**

## Step 1: Install Dependencies

```bash
cd Docs-Navigator-MCP-SUSE-Edition
npm install
```

## Step 2: Set Up Ollama (Recommended for Local AI)

Install Ollama and pull the required models:

```bash
# Install Ollama from https://ollama.ai

# Pull the language model (choose one)
ollama pull llama3.2:latest
# or
ollama pull mistral:latest

# Pull the embedding model
ollama pull nomic-embed-text
```

## Step 3: Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your preferences:

```env
# For local open-source models (recommended)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text

# Or use OpenAI/Anthropic (optional)
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_key_here
```

## Step 4: Build the Project

```bash
npm run build
```

## Step 5: Configure MCP Client

Add this server to your MCP client configuration (e.g., Claude Desktop):

### For Claude Desktop

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server configuration:

```json
{
  "mcpServers": {
    "docs-navigator-suse": {
      "command": "node",
      "args": [
        "/absolute/path/to/Docs-Navigator-MCP-SUSE-Edition/dist/index.js"
      ],
      "env": {
        "AI_PROVIDER": "ollama",
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "llama3.2:latest"
      }
    }
  }
}
```

## Step 6: Start Using

Restart your MCP client and start using the documentation navigator!

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama list`
- Check the base URL matches your Ollama installation

### Model Not Found
- Pull the required models: `ollama pull llama3.2:latest`
- Verify models are available: `ollama list`

### TypeScript Errors
- Run `npm install` to ensure all dependencies are installed
- Run `npm run build` to compile TypeScript

## Next Steps

After installation, you can:
1. Index documentation: Use the `index_documentation` tool
2. Search docs: Use the `search_docs` tool
3. Ask questions: Use the `ask_question` tool

See the main README for usage examples.
