// Backend endpoint for debug report uploads
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure debug reports directory exists
const debugReportsDir = path.join(process.cwd(), 'debug-reports');
if (!fs.existsSync(debugReportsDir)) {
  fs.mkdirSync(debugReportsDir, { recursive: true });
}

// POST /debug/report - Upload debug report
router.post('/report', async (req, res) => {
  try {
    const report = req.body;
    
    // Validate report structure
    if (!report || !report.id || !report.timestamp || !report.logs) {
      return res.status(400).json({
        error: 'Invalid report format',
        required: ['id', 'timestamp', 'logs']
      });
    }

    // Generate filename
    const timestamp = new Date(report.timestamp).toISOString().replace(/[:.]/g, '-');
    const filename = `debug-report-${timestamp}-${report.id}.json`;
    const filepath = path.join(debugReportsDir, filename);

    // Save report to file
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Log the upload
    console.log(`Debug report uploaded: ${filename}`);
    console.log(`Summary: ${report.summary?.totalLogs || 0} logs, ${report.summary?.errorCount || 0} errors`);

    // Return success response
    res.json({
      success: true,
      filename,
      message: 'Debug report uploaded successfully',
      summary: {
        totalLogs: report.summary?.totalLogs || 0,
        errorCount: report.summary?.errorCount || 0,
        warningCount: report.summary?.warningCount || 0,
        scopes: report.summary?.scopes || [],
      }
    });

  } catch (error) {
    console.error('Error uploading debug report:', error);
    res.status(500).json({
      error: 'Failed to upload debug report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /debug/reports - List uploaded reports
router.get('/reports', (req, res) => {
  try {
    const files = fs.readdirSync(debugReportsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(debugReportsDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json({
      success: true,
      reports: files,
      count: files.length
    });

  } catch (error) {
    console.error('Error listing debug reports:', error);
    res.status(500).json({
      error: 'Failed to list debug reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /debug/reports/:filename - Download specific report
router.get('/reports/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^debug-report-.*\.json$/)) {
      return res.status(400).json({
        error: 'Invalid filename format'
      });
    }

    const filepath = path.join(debugReportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    res.download(filepath, filename);

  } catch (error) {
    console.error('Error downloading debug report:', error);
    res.status(500).json({
      error: 'Failed to download debug report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /debug/reports/:filename - Delete specific report
router.delete('/reports/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^debug-report-.*\.json$/)) {
      return res.status(400).json({
        error: 'Invalid filename format'
      });
    }

    const filepath = path.join(debugReportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    fs.unlinkSync(filepath);
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting debug report:', error);
    res.status(500).json({
      error: 'Failed to delete debug report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /debug/health - Health check for debug service
router.get('/health', (req, res) => {
  try {
    const stats = {
      service: 'debug-reports',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      reportsDirectory: debugReportsDir,
      directoryExists: fs.existsSync(debugReportsDir),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      service: 'debug-reports',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
