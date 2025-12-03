# Example MCP Client Configurations

## Claude Desktop

### macOS
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Edit: `%APPDATA%\Claude\claude_desktop_config.json`

### Linux
Edit: `~/.config/Claude/claude_desktop_config.json`

### Configuration

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
        "OLLAMA_MODEL": "llama3.2:latest",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "SUSE_DOCS_BASE_URL": "https://documentation.suse.com",
        "RANCHER_DOCS_URL": "https://ranchermanager.docs.rancher.com",
        "K3S_DOCS_URL": "https://docs.k3s.io",
        "VECTOR_DB_PATH": "/absolute/path/to/data/vectors"
      }
    }
  }
}
```

## Using with OpenAI

If you prefer to use OpenAI instead of local models:

```json
{
  "mcpServers": {
    "docs-navigator-suse": {
      "command": "node",
      "args": [
        "/absolute/path/to/Docs-Navigator-MCP-SUSE-Edition/dist/index.js"
      ],
      "env": {
        "AI_PROVIDER": "openai",
        "OPENAI_API_KEY": "your-api-key-here",
        "OPENAI_MODEL": "gpt-4-turbo-preview"
      }
    }
  }
}
```

## Alternative: npx Execution

You can also use npx for easier path management:

```json
{
  "mcpServers": {
    "docs-navigator-suse": {
      "command": "npx",
      "args": [
        "-y",
        "/absolute/path/to/Docs-Navigator-MCP-SUSE-Edition"
      ]
    }
  }
}
```

## Testing the Configuration

1. Save the configuration file
2. Restart your MCP client
3. Try a command like: "List the available documentation sources"
4. The server should respond through your MCP client

## Troubleshooting

### Server Not Starting

Check the logs (location varies by client):
- Ensure the path to `index.js` is absolute
- Verify Node.js is in your PATH
- Check that the build succeeded (`npm run build`)

### Connection Errors

- Verify Ollama is running: `ollama list`
- Test the server manually: `node dist/index.js`
- Check environment variables are set correctly

### No Tools Available

- Rebuild the project: `npm run build`
- Restart your MCP client completely
- Check the server is listed in your client's settings
