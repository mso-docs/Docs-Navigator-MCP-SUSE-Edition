# Documentation Sources

This document describes all available documentation sources that can be indexed and searched.

## Available Sources

### SUSE Ecosystem

#### 1. SUSE Documentation (`suse`)
- **URL**: https://documentation.suse.com
- **Description**: Official SUSE Linux Enterprise documentation including installation, administration, and deployment guides
- **Coverage**: SUSE Linux Enterprise Server (SLES), SUSE Manager, openSUSE, and related products
- **Index command**: `npm run index suse`

### Rancher Ecosystem

#### 2. Rancher Documentation (`rancher`)
- **URL**: https://ranchermanager.docs.rancher.com
- **Description**: Rancher Manager documentation for Kubernetes cluster management
- **Coverage**: Installation, deployment, cluster management, authentication, monitoring
- **Index command**: `npm run index rancher`

#### 3. K3s Documentation (`k3s`)
- **URL**: https://docs.k3s.io
- **Description**: Lightweight Kubernetes distribution documentation
- **Coverage**: Installation, configuration, networking, storage, security
- **Index command**: `npm run index k3s`

#### 4. RKE2 Documentation (`rke2`)
- **URL**: https://docs.rke2.io
- **Description**: Rancher Kubernetes Engine 2 (RKE2) documentation
- **Coverage**: Enterprise Kubernetes distribution, security-focused, FIPS 140-2 compliant
- **Index command**: `npm run index rke2`

#### 5. Longhorn Documentation (`longhorn`)
- **URL**: https://longhorn.io/docs
- **Description**: Cloud-native distributed block storage for Kubernetes
- **Coverage**: Installation, volumes, snapshots, backups, disaster recovery
- **Index command**: `npm run index longhorn`

#### 6. Harvester Documentation (`harvester`)
- **URL**: https://docs.harvesterhci.io
- **Description**: Open-source hyper-converged infrastructure (HCI) solution
- **Coverage**: VM management, storage, networking, Kubernetes integration
- **Index command**: `npm run index harvester`

### Security & Policy

#### 7. NeuVector Documentation (`neuvector`)
- **URL**: https://open-docs.neuvector.com
- **Description**: Full lifecycle container security platform
- **Coverage**: Runtime security, vulnerability scanning, compliance, network protection
- **Index command**: `npm run index neuvector`

#### 8. Kubewarden Documentation (`kubewarden`)
- **URL**: https://docs.kubewarden.io
- **Description**: Policy engine for Kubernetes using WebAssembly
- **Coverage**: Policy writing, deployment, testing, integration with admission controllers
- **Index command**: `npm run index kubewarden`

## Usage

### Index Individual Sources

```bash
# Index a specific source
npm run index suse
npm run index rancher
npm run index k3s
npm run index rke2
npm run index longhorn
npm run index harvester
npm run index neuvector
npm run index kubewarden
```

### Index Multiple Sources

```bash
# Index specific sources
node src/cli/index-multi.js k3s rancher rke2

# Index all sources at once
npm run index all
```

### View Indexed Sources

```bash
# Show cache statistics by source
npm run stats

# View detailed analytics
npm run analytics

# Query specific source
npm run query-cache -- --source rke2
```

## Source Selection Guide

### For SUSE Linux Users
- **Primary**: `suse`
- **Related**: `rancher`, `k3s`, `rke2`

### For Kubernetes Users
- **Core**: `k3s`, `rke2`, `rancher`
- **Storage**: `longhorn`
- **Security**: `neuvector`, `kubewarden`
- **Virtualization**: `harvester`

### For Enterprise Kubernetes
- **Primary**: `rke2`, `rancher`
- **Security**: `neuvector`, `kubewarden`
- **Storage**: `longhorn`

### For Edge/IoT Deployments
- **Primary**: `k3s`
- **Management**: `rancher`
- **Storage**: `longhorn`

### For HCI/Virtualization
- **Primary**: `harvester`
- **Related**: `longhorn`, `rancher`

## Indexing Performance

### Estimated Indexing Times

With OpenAI embeddings (recommended):
- SUSE: ~5 minutes (50 pages)
- Rancher: ~3 minutes (30 pages)
- K3s: ~3 minutes (30 pages)
- RKE2: ~3-4 minutes (30-40 pages)
- Longhorn: ~2-3 minutes (20-30 pages)
- Harvester: ~3-4 minutes (30-40 pages)
- NeuVector: ~4-5 minutes (40-50 pages)
- Kubewarden: ~2-3 minutes (20-30 pages)

**Total for all sources**: ~25-35 minutes

With Ollama embeddings (local, slower):
- Add ~30 minutes per source
- **Total for all sources**: ~4-5 hours

### Recommendations

1. **Start Small**: Index 2-3 relevant sources first
2. **Use OpenAI**: Much faster for initial indexing (see README for setup)
3. **Incremental**: Index one source at a time initially
4. **All Sources**: Run overnight if using Ollama embeddings

## Cache Management

### View Cache Status

```bash
# Overall statistics
npm run stats

# Detailed analytics by source
npm run analytics

# Query specific source status
npm run query-cache -- --source longhorn --status indexed
```

### Clear and Rebuild

```bash
# Clear all caches
npm run clear-cache

# Rebuild specific source
npm run rebuild rke2

# Force refresh (ignore cache)
npm run index harvester --force
```

## Environment Configuration

Add these to your `.env` file to customize source URLs:

```env
# Core sources (already configured)
SUSE_DOCS_BASE_URL=https://documentation.suse.com
RANCHER_DOCS_URL=https://ranchermanager.docs.rancher.com
K3S_DOCS_URL=https://docs.k3s.io

# New sources
RKE2_DOCS_URL=https://docs.rke2.io
LONGHORN_DOCS_URL=https://longhorn.io/docs
HARVESTER_DOCS_URL=https://docs.harvesterhci.io
NEUVECTOR_DOCS_URL=https://open-docs.neuvector.com
KUBEWARDEN_DOCS_URL=https://docs.kubewarden.io
```

## Troubleshooting

### Source Not Found

```bash
# List available sources
node -e "import('./src/services/documentation-service.js').then(m => { const ds = new m.DocumentationService(); ds.listSources().then(console.log); })"
```

### Indexing Fails

```bash
# Check if source is accessible
curl -I https://docs.rke2.io

# Clear locks and retry
npm run clear-locks
npm run index rke2
```

### Slow Indexing

```bash
# Use OpenAI embeddings (edit .env)
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key_here

# Reduce concurrency (edit .env)
FETCH_BATCH_SIZE=1
EMBEDDING_CONCURRENCY=1
```

## Adding Custom Sources

To add your own documentation source:

1. Edit `src/services/documentation-service.js`
2. Add to `initializeSources()`:

```javascript
{
  id: 'myproject',
  name: 'My Project Documentation',
  baseUrl: 'https://docs.myproject.com',
  status: 'active',
}
```

3. Add environment variable to `.env`:

```env
MYPROJECT_DOCS_URL=https://docs.myproject.com
```

4. Index the new source:

```bash
npm run index myproject
```

## Support

For issues or questions about specific documentation sources:
- Check the official documentation website
- Review indexing logs for errors
- Run `npm run stats` to verify indexing status
- See [TROUBLESHOOTING](../README.md#-troubleshooting) section in main README
