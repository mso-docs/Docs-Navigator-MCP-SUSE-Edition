# Docs Navigator MCP - SUSE Edition

An **AI-powered documentation navigator** built as a Model Context Protocol (MCP) server that enables intelligent search, summarization, and exploration of SUSE, Rancher, and K3s documentation using **open-source AI models**.

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and components
- [Installation Guide](docs/INSTALL.md) - Detailed setup instructions
- [Quick Reference](docs/QUICKREF.md) - Command reference
- [Usage Examples](docs/EXAMPLES.md) - Common usage patterns
- [Web GUI Guide](docs/WEB_GUI.md) - Web interface documentation
- [MCP Client Setup](docs/MCP_CLIENT_CONFIG.md) - Configure MCP clients
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines

## 🌟 Features

- 🌐 **Web GUI** - Beautiful localhost web interface for easy access
- 🔍 **Semantic Documentation Search** - Find relevant docs using natural language queries
- 🤖 **Local Open-Source AI** - Powered by Ollama (Llama, Mistral, etc.) - no API keys required
- 📚 **Multi-Source Support** - Navigate SUSE, Rancher, K3s, and related documentation
- 💬 **Conversational Interface** - Ask questions and get answers with source citations
- 📝 **Smart Summarization** - Generate concise or detailed summaries of documentation
- 🔌 **MCP Protocol** - Integrates with Claude Desktop and other MCP-compatible clients
- ⚡ **Vector Search** - Fast semantic retrieval using embeddings
- 🎯 **Flexible AI Providers** - Support for Ollama (local), OpenAI, or Anthropic

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai) (for local AI models)

### Installation

```bash
# Clone the repository
git clone https://github.com/mso-docs/Docs-Navigator-MCP-SUSE-Edition.git
cd Docs-Navigator-MCP-SUSE-Edition

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Install Ollama models
ollama pull llama3.2:latest
ollama pull nomic-embed-text
```

See [docs/INSTALL.md](docs/INSTALL.md) for detailed setup instructions.

## 🛠️ Available Tools

The MCP server provides these tools:

### `search_docs`
Search documentation using semantic search.
```json
{
  "query": "How do I install K3s on SUSE?",
  "source": "all",
  "limit": 5
}
```

### `ask_question`
Ask questions about documentation and get AI-generated answers with sources.
```json
{
  "question": "What are the differences between K3s and RKE2?",
  "context": "deployment on SUSE Linux Enterprise"
}
```

### `summarize_doc`
Generate AI summaries of documentation pages.
```json
{
  "url": "https://docs.k3s.io/installation",
  "format": "bullet-points"
}
```

### `get_doc_section`
Retrieve specific documentation content.
```json
{
  "url": "https://documentation.suse.com/sles/15-SP5/"
}
```

### `index_documentation`
Index documentation for faster searching.
```json
{
  "source": "k3s",
  "forceRefresh": false
}
```

### `list_doc_sources`
View all available documentation sources and their status.

## 📖 Usage Examples

### Web Interface (Easiest!)

Start the web interface and access it from your browser:

```bash
npm run web
```

Then open **http://localhost:3000** in your browser. See [docs/WEB_GUI.md](docs/WEB_GUI.md) for details.

### With Claude Desktop

1. Configure Claude Desktop (see [docs/INSTALL.md](docs/INSTALL.md))
2. Ask Claude to use the tools:

```
"Can you search the SUSE documentation for information about container security?"

"Use the docs navigator to find K3s installation instructions"

"Summarize the Rancher high availability setup documentation"
```

### Direct MCP Usage

```bash
# Start the MCP server
npm start

# The server communicates via stdio using MCP protocol
```

## 🏗️ Architecture

```
src/
├── index.ts                    # Main MCP server
├── services/
│   ├── ai-service.ts          # AI model integration (Ollama/OpenAI)
│   ├── documentation-service.ts # Doc fetching and parsing
│   └── vector-service.ts      # Vector database for semantic search
```

### Key Components

- **MCP Server**: Implements the Model Context Protocol for tool execution
- **AI Service**: Handles LLM interactions for Q&A and summarization
- **Vector Service**: Manages semantic search using embeddings
- **Documentation Service**: Fetches and parses documentation from various sources

## 🔧 Configuration

Edit `.env` to configure:

```env
# AI Provider (ollama, openai, anthropic)
AI_PROVIDER=ollama

# Ollama Settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
EMBEDDING_MODEL=nomic-embed-text

# Documentation Sources
SUSE_DOCS_BASE_URL=https://documentation.suse.com
RANCHER_DOCS_URL=https://ranchermanager.docs.rancher.com
K3S_DOCS_URL=https://docs.k3s.io

# Vector Database
VECTOR_DB_PATH=./data/vectors
```

## 📁 Project Structure

```
Docs-Navigator-MCP-SUSE-Edition/
├── docs/              # Documentation files
│   ├── ARCHITECTURE.md
│   ├── INSTALL.md
│   ├── QUICKREF.md
│   ├── EXAMPLES.md
│   ├── WEB_GUI.md
│   ├── MCP_CLIENT_CONFIG.md
│   └── CONTRIBUTING.md
├── scripts/           # Setup and utility scripts
│   ├── setup.sh
│   └── setup.bat
├── src/               # Source code (JavaScript)
│   ├── index.js       # MCP server entry point
│   ├── web-server.js  # Web GUI server
│   ├── index-docs.js  # Documentation indexing script
│   ├── test.js        # Test script
│   └── services/      # Core services
│       ├── ai-service.js
│       ├── documentation-service.js
│       └── vector-service.js
├── public/            # Web GUI assets
└── data/              # Vector database storage
```

## 🤝 Contributing

Contributions are welcome! This project was created for **Hack Week 25**.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🎯 Use Cases

- **DevOps Engineers**: Quickly find deployment and configuration info
- **System Administrators**: Navigate SUSE Linux documentation efficiently
- **Kubernetes Users**: Get instant answers about K3s and Rancher
- **Technical Writers**: Research and cross-reference documentation
- **Support Teams**: Find solutions faster with semantic search

## 🔗 Resources

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Ollama](https://ollama.ai)
- [SUSE Documentation](https://documentation.suse.com)
- [Rancher Docs](https://ranchermanager.docs.rancher.com)
- [K3s Documentation](https://docs.k3s.io)

---

Built with ❤️ for Hack Week 25
