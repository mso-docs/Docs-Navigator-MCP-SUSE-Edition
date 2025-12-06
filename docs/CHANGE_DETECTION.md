# Change Detection and Auto-Update System

## Overview

The Change Detection system monitors documentation sources for updates and can automatically trigger re-indexing when changes are detected. This ensures your documentation search stays up-to-date without manual intervention.

## Features

- 🔍 **Smart Change Detection**: Uses ETags, Last-Modified headers, and content hashing
- ⚡ **Efficient Checking**: HEAD requests first, only fetches content when needed
- 🔄 **Auto-Update**: Watch mode for continuous monitoring
- 📊 **Statistics**: Track when pages were last checked and identify stale content
- 🎯 **Selective Checking**: Check specific sources, limit pages, or filter by age
- 💾 **History Tracking**: Saves check results for audit trail
- 🌐 **Web API**: Check for changes via REST API

## Quick Start

### Check All Sources for Changes

```bash
npm run check-changes
```

### Check Specific Source

```bash
npm run check-changes k3s
```

### Check Multiple Sources

```bash
npm run check-changes k3s rancher rke2
```

### Check Only Recent Pages

```bash
# Check only first 10 pages from each source
npm run check-changes -- --limit 10

# Check pages not checked in last 7 days
npm run check-changes -- --days 7
```

### Watch Mode (Continuous Monitoring)

```bash
# Check every 24 hours (default)
npm run check-changes -- --watch

# Check every 6 hours
npm run check-changes -- --watch --interval 6

# Watch specific sources
npm run check-changes k3s rancher -- --watch --interval 12
```

### View Statistics

```bash
npm run check-changes -- --stats
```

## How It Works

### Change Detection Methods

The system uses multiple strategies to detect changes efficiently:

1. **ETag Comparison** (Fastest)
   - Compares ETag headers from server
   - No content download needed
   - Works if server provides ETags

2. **Last-Modified Comparison** (Fast)
   - Compares Last-Modified timestamps
   - No content download needed
   - Works if server provides Last-Modified headers

3. **Content Hash** (Most Reliable)
   - Downloads and compares SHA-256 hashes
   - Catches all changes including silent updates
   - Used when headers are unavailable

### Process Flow

```
1. Load cached page metadata from SQLite
2. For each page:
   a. Make HEAD request to get headers
   b. Compare ETag (if available)
   c. Compare Last-Modified (if available)
   d. If headers don't provide answer, GET content and hash
3. Mark page as changed/unchanged
4. Update last_checked timestamp
5. Report results
```

## CLI Usage

### Basic Commands

```bash
# Check all sources
npm run check-changes

# Check specific source(s)
npm run check-changes <source> [source...]

# Available sources
npm run check-changes suse rancher k3s rke2 longhorn harvester neuvector kubewarden
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--limit <n>` | Check only first N pages | `--limit 50` |
| `--days <n>` | Check pages older than N days | `--days 7` |
| `--parallel <n>` | Parallel checks (default: 5) | `--parallel 10` |
| `--stats` | Show statistics only | `--stats` |
| `--watch` | Run continuously | `--watch` |
| `--interval <hrs>` | Watch interval in hours | `--interval 12` |

### Examples

```bash
# Check first 20 pages from K3s not checked in 7 days
npm run check-changes k3s -- --limit 20 --days 7

# Watch all sources, checking every 6 hours
npm run check-changes -- --watch --interval 6

# Check Rancher with 10 parallel connections
npm run check-changes rancher -- --parallel 10

# Show detailed statistics
npm run check-changes -- --stats
```

## Web API

### Check Source for Changes

**POST** `/api/check-changes`

```json
{
  "source": "k3s",
  "limit": 10,
  "olderThanDays": 7
}
```

**Response:**
```json
{
  "result": {
    "source": "k3s",
    "totalChecked": 10,
    "changed": [
      {
        "url": "https://docs.k3s.io/installation",
        "status": "changed",
        "changed": true,
        "reason": "Content modified"
      }
    ],
    "unchanged": [...],
    "errors": []
  }
}
```

### Get Statistics

**GET** `/api/change-stats`

**Response:**
```json
{
  "stats": {
    "totalPages": 234,
    "recentlyChecked": 45,
    "neverChecked": 12,
    "staleness": {
      "<1 day": 45,
      "1-7 days": 89,
      "1-4 weeks": 67,
      ">3 months": 21
    },
    "bySource": {
      "k3s": {
        "total": 30,
        "recentlyChecked": 10,
        "neverChecked": 2
      }
    }
  }
}
```

## Programmatic Usage

### Using the Service Directly

```javascript
import { ChangeDetectionService } from './services/change-detection-service.js';

const changeDetection = new ChangeDetectionService();
await changeDetection.initialize();

// Check a single URL
const result = await changeDetection.checkUrlForChanges('https://docs.k3s.io/installation');
console.log(result.changed); // true/false

// Check entire source
const sourceResult = await changeDetection.checkSourceForChanges('k3s', {
  limit: 20,
  olderThanDays: 7,
  parallel: 5,
  onProgress: (current, total, result) => {
    console.log(`${current}/${total}: ${result.url}`);
  }
});

// Check all sources
const allResults = await changeDetection.checkAllSources(['k3s', 'rancher']);

// Get changed URLs for re-indexing
const changedUrls = changeDetection.getChangedUrls(allResults);
```

### Auto-Detection with Callback

```javascript
await changeDetection.startAutoDetection({
  intervalHours: 6,
  sources: ['k3s', 'rancher', 'rke2'],
  onChangesDetected: async (results) => {
    console.log('Changes detected!');
    
    // Auto re-index changed sources
    for (const [source, data] of Object.entries(results.sources)) {
      if (data.changed.length > 0) {
        console.log(`Re-indexing ${source}...`);
        // Trigger indexing here
      }
    }
  },
  checkOptions: {
    limit: null,
    parallel: 5
  }
});

// Stop auto-detection
changeDetection.stopAutoDetection();
```

## Configuration

### Environment Variables

```bash
# Control parallel requests
CHANGE_DETECTION_PARALLEL=5

# Request timeout (ms)
CHANGE_DETECTION_TIMEOUT=15000

# History directory
CHANGE_DETECTION_HISTORY_DIR=./data/change-detection
```

### Scheduling with Cron

For production environments, schedule checks with cron:

```bash
# Check for changes every 6 hours
0 */6 * * * cd /path/to/docs-navigator && npm run check-changes >> logs/change-detection.log 2>&1

# Check specific sources daily at 2am
0 2 * * * cd /path/to/docs-navigator && npm run check-changes k3s rancher >> logs/change-detection.log 2>&1
```

### Docker/Kubernetes

Create a CronJob to run change detection:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: docs-change-detection
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: check-changes
            image: docs-navigator:latest
            command: ["npm", "run", "check-changes"]
            env:
            - name: CHANGE_DETECTION_PARALLEL
              value: "10"
          restartPolicy: OnFailure
```

## Best Practices

### Recommended Check Frequency

- **High-traffic docs**: Every 6-12 hours
- **Stable docs**: Daily or weekly
- **Development docs**: Every 1-4 hours

### Performance Optimization

1. **Use limits for testing**: Start with `--limit 10` to test
2. **Adjust parallel connections**: Increase `--parallel` for faster checks (be respectful to servers)
3. **Filter by age**: Use `--days` to focus on pages that haven't been checked recently
4. **Batch by source**: Check critical sources more frequently

### Integration with Indexing

After detecting changes, re-index affected sources:

```bash
# Check for changes
npm run check-changes k3s

# If changes detected, re-index
npm run index k3s -- --force
```

Or automate it:

```bash
#!/bin/bash
# check-and-reindex.sh

SOURCES="k3s rancher rke2"

for SOURCE in $SOURCES; do
  echo "Checking $SOURCE..."
  RESULT=$(npm run check-changes $SOURCE --silent)
  
  if echo "$RESULT" | grep -q "Changed:"; then
    echo "Changes detected in $SOURCE, re-indexing..."
    npm run index $SOURCE -- --force
  fi
done
```

## Troubleshooting

### "Error: Cache not initialized"

Initialize the cache service first:
```javascript
await changeDetection.initialize();
```

### Too Many Requests (429)

Reduce parallel connections:
```bash
npm run check-changes -- --parallel 2
```

### Timeout Errors

Increase timeout in the service or check fewer pages:
```bash
npm run check-changes -- --limit 20
```

### Memory Issues with Large Sources

Check in batches:
```bash
# Check 50 pages at a time
npm run check-changes k3s -- --limit 50
```

## History and Audit Trail

Check results are automatically saved to `./data/change-detection/`:

```
data/change-detection/
├── check-2025-12-05T10-30-00.json
├── check-2025-12-05T16-30-00.json
└── check-2025-12-06T10-30-00.json
```

Each file contains:
- Timestamp
- Sources checked
- Changed/unchanged/error counts
- Full list of changed URLs

## Monitoring and Alerts

### Set Up Alerts

Monitor check results and alert on changes:

```javascript
// alert-on-changes.js
import { ChangeDetectionService } from './services/change-detection-service.js';

const changeDetection = new ChangeDetectionService();

await changeDetection.startAutoDetection({
  intervalHours: 6,
  sources: ['k3s', 'rancher'],
  onChangesDetected: async (results) => {
    // Send alert (email, Slack, etc.)
    await sendSlackAlert({
      text: `Documentation changes detected!`,
      fields: Object.entries(results.sources).map(([source, data]) => ({
        title: source,
        value: `${data.changed.length} pages changed`
      }))
    });
  }
});
```

## Future Enhancements

Potential improvements:

- [ ] Webhook notifications on changes detected
- [ ] Automatic re-indexing of changed pages
- [ ] Change detection dashboard in Web UI
- [ ] Git-style diff view of content changes
- [ ] Configurable alerting rules
- [ ] Integration with monitoring tools (Prometheus, Grafana)
- [ ] Change prediction based on historical patterns

## Support

For issues or questions:
- Check the troubleshooting section above
- Review saved history files in `data/change-detection/`
- Run with `--stats` to see current state
- Open an issue on GitHub
