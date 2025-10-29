# Log Rotation System

## Overview

The application implements automatic log rotation to prevent disk space issues. Logs are automatically rotated when they reach a certain size, and old rotated logs are cleaned up.

## Configuration

### Log File Limits

- **Max Log Size**: 10MB per log file
- **Max Rotated Files**: 5 files per log type
- **Max Total Size**: 50MB total per log type
- **Rotation Check**: Every hour (automatic) + on startup + on shutdown

### Log Files Managed

1. **server.log** - Backend server logs
2. **vite.log** - Frontend/Vite development server logs

## How It Works

### Automatic Rotation

1. **On Startup**: Logs are checked and rotated if they exceed 10MB
2. **Periodic Check**: Every hour, logs are checked and rotated if needed
3. **On Shutdown**: Logs are rotated before servers stop
4. **Size-Based**: When a log file reaches 10MB, it's automatically rotated

### Rotated File Naming

Rotated logs are named with timestamps:
```
server.log.20251029_143022
vite.log.20251029_150000
```

### Cleanup

- Old rotated logs beyond the 5-file limit are automatically deleted
- If total log size exceeds 50MB, oldest rotated files are removed first

## Implementation

### Backend (Node.js)

The `api/lib/logRotator.js` module provides:
- `rotateLog(logName)` - Rotates a specific log file
- `initializeServerLogRotation()` - Sets up rotation for server.log
- `initializeViteLogRotation()` - Sets up rotation for vite.log
- `createRotatingStream(logName)` - Creates a write stream with rotation

### Shell Script

The `start-dev.sh` script includes:
- Log rotation on startup
- Automatic cleanup of old rotated logs
- Background rotation monitor (checks every hour)
- Log rotation on shutdown

## Manual Rotation

### Using Node.js Module

```javascript
import { rotateLog } from './api/lib/logRotator.js';

// Rotate server.log
rotateLog('server.log');

// Rotate vite.log
rotateLog('vite.log');
```

### Using Shell Script

```bash
# Run setup script
./scripts/log-rotation-setup.sh

# Manually check and rotate (from start-dev.sh functions)
rotate_log "server.log"
rotate_log "vite.log"
```

## Monitoring

### Check Log Sizes

```bash
ls -lh *.log
ls -lh logs/*.log
```

### View Rotated Logs

```bash
ls -lh *.log.*
ls -lh logs/*.log.*
```

### Total Log Size

```bash
du -sh logs/
du -sh *.log *.log.* 2>/dev/null | awk '{sum+=$1} END {print sum}'
```

## Troubleshooting

### Logs Not Rotating

1. Check file permissions: `ls -la *.log`
2. Verify log directory exists: `ls -la logs/`
3. Check disk space: `df -h`
4. Review rotation logs in console output

### Disk Space Still Growing

1. Check if rotation is working: Look for rotated file creation
2. Verify cleanup function is removing old logs
3. Manually remove old rotated logs: `rm -f *.log.*`
4. Adjust MAX_LOG_SIZE or MAX_LOG_FILES in `api/lib/logRotator.js`

### Missing Log Directory

The system auto-creates the `logs/` directory on first use. If it's missing:

```bash
mkdir -p logs
```

## Best Practices

1. **Monitor Log Sizes**: Regularly check log file sizes
2. **Archive Important Logs**: Before cleanup, archive critical logs elsewhere
3. **Adjust Limits**: Modify MAX_LOG_SIZE and MAX_LOG_FILES based on your needs
4. **Centralized Logging**: Consider using the logger.js system instead of console.log

## Integration with Logger.js

The current `api/lib/logger.js` system outputs to console. To add file logging with rotation:

```javascript
import { createRotatingStream } from './logRotator.js';

// In logger.js, add file output:
const fileStream = createRotatingStream('server.log');

// Redirect logger output to file stream
// (implementation depends on logger architecture)
```

## Configuration File

You can create a `.logrotation.json` configuration file:

```json
{
  "maxLogSize": 10485760,
  "maxLogFiles": 5,
  "maxTotalSize": 52428800,
  "rotationInterval": 3600000,
  "sizeCheckInterval": 300000
}
```

Then import and use in `logRotator.js`.

---

**Last Updated**: October 29, 2025

