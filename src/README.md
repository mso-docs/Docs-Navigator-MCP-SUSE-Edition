# Source Code Organization

This directory contains the organized source code for the Docs Navigator MCP Server.

## Directory Structure

```
src/
├── cli/                    # Command-line interface tools
│   ├── cache-analytics.js  # Analytics report generator (npm run analytics)
│   ├── clear-locks.js      # Clear expired locks (npm run clear-locks)
│   ├── index-docs.js       # Main indexing CLI (npm run index)
│   ├── index-multi.js      # Batch indexing multiple sources
│   └── query-cache.js      # Advanced cache queries (npm run query-cache)
│
├── services/               # Core service layer
│   ├── ai-service.js       # AI/LLM integration (OpenAI, Ollama)
│   ├── cache-service.js    # SQLite-based cache management
│   ├── documentation-service.js  # Documentation fetching & indexing
│   └── vector-service.js   # Vector database operations (Vectra)
│
├── tests/                  # Test scripts
│   ├── test.js             # Main test runner (npm test)
│   ├── test-batch-sizes.js # Batch size performance testing
│   ├── test-cache.js       # Cache functionality tests
│   ├── test-concurrent-locks.js  # Lock mechanism testing
│   └── test-ollama.js      # Ollama connectivity tests
│
├── utils/                  # Utility scripts
│   ├── debug-locks.js      # Debug lock state (dev utility)
│   ├── fix-cache-sources.js     # Fix legacy cache entries (npm run fix-sources)
│   ├── force-clear-locks.js     # Force delete all locks (dev utility)
│   ├── mark-indexed.js     # Mark documents as indexed (npm run mark-indexed)
│   └── migrate-to-sqlite.js     # JSON to SQLite migration (npm run migrate-sqlite)
│
├── index.js                # MCP server entry point (npm start)
└── web-server.js           # Web UI server (npm run web)
```

## Usage

### CLI Commands

```bash
# Indexing
npm run index [source]      # Index documentation (k3s, rancher, suse, or all)
npm run stats               # Show cache statistics

# Analytics & Queries
npm run analytics           # Generate comprehensive analytics report
npm run query-cache [opts]  # Query cache with filters

# Cache Management
npm run clear-cache         # Clear all caches
npm run validate            # Validate cache integrity
npm run rebuild             # Rebuild specific source
npm run clear-locks         # Clear expired locks

# Utilities
npm run fix-sources         # Fix missing source fields
npm run mark-indexed        # Mark documents as indexed
npm run migrate-sqlite      # Migrate JSON cache to SQLite

# Running
npm start                   # Start MCP server
npm run web                 # Start web interface
npm test                    # Run tests
```

### Service Layer

The service layer (`src/services/`) contains the core business logic:

- **AIService**: Handles embeddings and Q&A with OpenAI and Ollama
- **CacheService**: SQLite-based caching with Map API compatibility
- **DocumentationService**: Fetches, parses, and indexes documentation
- **VectorService**: Manages vector database (Vectra) operations

### CLI Tools

Command-line tools (`src/cli/`) for managing the system:

- **index-docs.js**: Main indexing tool with cache management
- **cache-analytics.js**: Comprehensive analytics and reporting
- **query-cache.js**: Advanced cache filtering and queries
- **clear-locks.js**: Lock cleanup for concurrent indexing

### Tests

Test scripts (`src/tests/`) for validation:

- **test.js**: Main test suite
- **test-cache.js**: Cache functionality tests
- **test-concurrent-locks.js**: Lock mechanism tests
- **test-ollama.js**: Ollama integration tests
- **test-batch-sizes.js**: Performance testing

### Utilities

Maintenance utilities (`src/utils/`):

- **migrate-to-sqlite.js**: One-time migration from JSON to SQLite
- **fix-cache-sources.js**: Fix legacy cache entries
- **mark-indexed.js**: Update indexed status
- **debug-locks.js**: Debug lock state (dev)
- **force-clear-locks.js**: Force lock deletion (dev)

## Development

### Adding New CLI Tools

Create new CLI tools in `src/cli/` and add npm scripts to `package.json`:

```javascript
import { CacheService } from '../services/cache-service.js';
// ... your CLI logic
```

### Adding New Services

Create new services in `src/services/` with clear interfaces:

```javascript
export class MyService {
  constructor() {
    // initialization
  }
  
  async myMethod() {
    // service logic
  }
}
```

### Adding New Tests

Create test files in `src/tests/` and run with `npm test`:

```javascript
import { MyService } from '../services/my-service.js';
// ... your tests
```

### Adding New Utilities

Create utility scripts in `src/utils/` for maintenance tasks:

```javascript
#!/usr/bin/env node
import { CacheService } from '../services/cache-service.js';
// ... utility logic
```

## Import Path Guidelines

When importing from moved files, use relative paths:

- From `src/cli/`: `import { Service } from '../services/service.js'`
- From `src/tests/`: `import { Service } from '../services/service.js'`
- From `src/utils/`: `import { Service } from '../services/service.js'`
- From `src/services/`: `import { Other } from './other.js'`

## Migration Notes

This reorganization was completed on 2025-12-04:

- ✅ All test files moved to `src/tests/`
- ✅ All CLI tools moved to `src/cli/`
- ✅ All utilities moved to `src/utils/`
- ✅ All import paths updated
- ✅ All npm scripts updated
- ✅ All commands tested and working

No breaking changes - all npm scripts work identically.
