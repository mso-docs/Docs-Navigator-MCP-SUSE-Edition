# Usage Examples

This document provides practical examples of using the SUSE Docs Navigator MCP server.

## Getting Started

After installing and configuring the MCP server with your client (e.g., Claude Desktop), you can interact with it through natural language.

## Example Conversations

### Example 1: Searching Documentation

**User:** "Search the SUSE documentation for information about container security"

**What happens:**
The MCP client calls the `search_docs` tool with:
```json
{
  "query": "container security",
  "source": "suse",
  "limit": 5
}
```

**Response:** Returns relevant documentation sections about container security from SUSE docs.

---

### Example 2: Asking Questions

**User:** "What are the system requirements for installing K3s on SUSE Linux Enterprise?"

**What happens:**
The MCP client calls the `ask_question` tool:
```json
{
  "question": "What are the system requirements for installing K3s on SUSE Linux Enterprise?",
  "context": "installation requirements"
}
```

**Response:** AI-generated answer with citations from relevant documentation sources.

---

### Example 3: Summarizing Documentation

**User:** "Give me a summary of the Rancher architecture documentation"

**What happens:**
First, searches for Rancher architecture docs, then calls `summarize_doc`:
```json
{
  "url": "https://ranchermanager.docs.rancher.com/reference-guides/rancher-manager-architecture",
  "format": "detailed"
}
```

**Response:** AI-generated summary of the architecture documentation.

---

### Example 4: Comparing Technologies

**User:** "What's the difference between K3s and RKE2?"

**What happens:**
Calls `ask_question` with context from both documentation sources:
```json
{
  "question": "What's the difference between K3s and RKE2?",
  "context": "comparison of Kubernetes distributions"
}
```

**Response:** Comprehensive comparison with source citations.

---

### Example 5: Getting Quick Facts

**User:** "How do I enable high availability in Rancher?"

**What happens:**
```json
{
  "question": "How do I enable high availability in Rancher?"
}
```

**Response:** Step-by-step instructions from official documentation.

---

## Advanced Usage

### Indexing Documentation

Before first use, index the documentation for faster searches:

**User:** "Index all SUSE documentation"

This calls:
```json
{
  "source": "suse",
  "forceRefresh": false
}
```

### Checking Available Sources

**User:** "What documentation sources are available?"

Calls `list_doc_sources` and returns all configured documentation sources.

### Multi-Source Search

**User:** "Search across all documentation for kubernetes networking"

```json
{
  "query": "kubernetes networking",
  "source": "all",
  "limit": 10
}
```

---

## Tips for Best Results

1. **Be Specific**: More detailed questions get better answers
   - ❌ "Tell me about SUSE"
   - ✅ "What are the security features in SUSE Linux Enterprise 15 SP5?"

2. **Use Context**: Add context to narrow down results
   - "What are the backup options for Rancher in a production environment?"

3. **Request Summaries**: Ask for summaries of lengthy docs
   - "Summarize the K3s installation guide in bullet points"

4. **Compare**: Ask comparative questions
   - "Compare the storage options between SUSE and Red Hat Enterprise Linux"

5. **Cite Sources**: The AI will cite sources - you can follow up on specific ones
   - "Give me more details about [Source 2]"

---

## Common Workflows

### Troubleshooting Workflow

1. **Search for error message**
   ```
   "Search for '[error message]' in SUSE documentation"
   ```

2. **Ask for solutions**
   ```
   "What are the common solutions for this error?"
   ```

3. **Get specific steps**
   ```
   "Show me the exact commands to fix this"
   ```

### Learning Workflow

1. **Get overview**
   ```
   "Give me an overview of K3s architecture"
   ```

2. **Dive deeper**
   ```
   "Explain the K3s networking model in detail"
   ```

3. **Practical application**
   ```
   "How do I configure custom networking in K3s?"
   ```

### Planning Workflow

1. **Research options**
   ```
   "What are the deployment options for Rancher?"
   ```

2. **Compare approaches**
   ```
   "Compare single-node vs HA deployment for Rancher"
   ```

3. **Get implementation details**
   ```
   "Show me the steps for HA Rancher deployment on SUSE"
   ```

---

## Integration with Development

You can use the docs navigator alongside code development:

1. **Reference while coding**
   ```
   "What's the correct YAML structure for K3s configuration?"
   ```

2. **Verify best practices**
   ```
   "What are the security best practices for SUSE container deployments?"
   ```

3. **Debug issues**
   ```
   "Why might my K3s cluster fail to start on SUSE?"
   ```

---

## Performance Tips

- **Index first**: Run indexing for sources you'll use frequently
- **Cache results**: The vector database caches embeddings for faster subsequent searches
- **Specific queries**: More specific queries return more relevant results
- **Local models**: Using Ollama (local) is faster and more private than cloud APIs

---

Happy documenting! 📚✨
