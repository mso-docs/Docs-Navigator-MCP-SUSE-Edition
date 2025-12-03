# Web GUI Guide

The SUSE Docs Navigator now includes a beautiful web interface that you can access from your browser!

## 🌐 Starting the Web Interface

```bash
# Make sure you've built the project
npm run build

# Start the web server
npm run web
```

The web interface will be available at: **http://localhost:3000**

## ✨ Features

### 1. **Search Documentation** 🔍
- Semantic search across SUSE, Rancher, and K3s documentation
- Filter by specific source or search across all
- View relevant excerpts with links to full documentation

### 2. **Ask Questions** 💬
- Natural language Q&A powered by AI
- Get answers with source citations
- Add optional context for more specific answers

### 3. **Summarize Documentation** 📝
- Paste any documentation URL
- Choose summary format: Brief, Detailed, or Bullet Points
- AI-generated summaries for quick understanding

### 4. **View Sources** 📚
- See all configured documentation sources
- Check their status and document counts

## 🎨 Interface Overview

The web interface features:
- **Clean, modern design** with gradient theme
- **Status indicator** showing AI service availability
- **Tabbed interface** for easy navigation
- **Responsive layout** works on desktop and mobile
- **Real-time results** with loading indicators

## 🚀 Usage Examples

### Searching Documentation

1. Click the **Search** tab
2. Enter your query (e.g., "container security best practices")
3. Select a source or choose "All Sources"
4. Click **Search**
5. View results with relevant excerpts and links

### Asking Questions

1. Click the **Ask Question** tab
2. Type your question (e.g., "How do I enable HA in Rancher?")
3. Optionally add context
4. Click **Get Answer**
5. Read the AI-generated answer with source citations

### Summarizing Docs

1. Click the **Summarize** tab
2. Paste a documentation URL
3. Choose your preferred summary format
4. Click **Summarize**
5. Get a concise AI-generated summary

## ⚙️ Configuration

The web server uses the same `.env` configuration as the MCP server:

```env
# Port (optional, defaults to 3000)
PORT=3000

# AI Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
```

## 🔧 Advanced Options

### Custom Port

Run on a different port:

```bash
PORT=8080 npm run web
```

### Development Mode

Watch for changes and auto-rebuild:

```bash
npm run dev:web
```

## 🎯 Keyboard Shortcuts

- Press `Enter` in search/question fields to submit
- Use `Tab` to navigate between fields

## 📱 Mobile Access

Access from other devices on your network:

1. Find your computer's IP address
2. Open browser on mobile device
3. Navigate to `http://YOUR_IP:3000`

## 🐛 Troubleshooting

### Server Won't Start

**Problem:** Port already in use
```bash
# Solution: Use a different port
PORT=8080 npm run web
```

**Problem:** AI Service Unavailable
```bash
# Check Ollama is running
ollama list

# Verify .env configuration
cat .env
```

### No Search Results

**Solution:** Index documentation first

Use the MCP client or modify the web interface to add indexing functionality. The indexing endpoint exists at `/api/index` but isn't exposed in the UI for safety.

### Connection Failed

1. Ensure the server is running: `npm run web`
2. Check you're accessing the correct URL
3. Verify no firewall blocking the port

## 🔐 Security Notes

**Important:** This web interface is designed for **local use only**. 

- Don't expose it to the public internet without authentication
- Use it on localhost or trusted local networks
- The server has no built-in authentication

## 🎨 Customization

### Changing the Theme

Edit `public/index.html` and modify the CSS variables:

```css
/* Change gradient colors */
background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR2 100%);
```

### Adding New Features

The API endpoints are in `src/web-server.ts`:
- `/api/health` - Health check
- `/api/sources` - List sources
- `/api/search` - Search docs
- `/api/ask` - Ask questions
- `/api/summarize` - Summarize URLs
- `/api/fetch` - Get doc content
- `/api/index` - Index documentation

## 📊 API Reference

### POST /api/search
```json
{
  "query": "string",
  "source": "all|suse|rancher|k3s",
  "limit": 5
}
```

### POST /api/ask
```json
{
  "question": "string",
  "context": "string (optional)"
}
```

### POST /api/summarize
```json
{
  "url": "string",
  "format": "brief|detailed|bullet-points"
}
```

## 🚀 Running Both Interfaces

You can run both the MCP server and web interface:

**Terminal 1:**
```bash
npm start  # MCP server
```

**Terminal 2:**
```bash
npm run web  # Web interface
```

This allows you to use both Claude Desktop integration AND the web interface simultaneously!

## 💡 Tips

1. **Index First**: Before searching, ensure documentation is indexed
2. **Be Specific**: More specific queries get better results
3. **Use Context**: Add context to questions for more relevant answers
4. **Check Status**: Green dot = AI ready, Red dot = Check configuration
5. **Mobile Friendly**: Works great on tablets and phones too!

---

Enjoy exploring SUSE documentation with style! 🎉
