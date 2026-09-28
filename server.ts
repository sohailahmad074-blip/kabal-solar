import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, 'workspace-data.json');

// Support large payloads for full ERP database state
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory workspace cache with disk fallback
interface DeviceInfo {
  deviceId: string;
  deviceType: 'Laptop' | 'Mobile' | 'Tablet';
  deviceName: string;
  lastSeen: number;
}

interface WorkspaceState {
  version: number;
  revision: number;
  updatedAt: string;
  updatedByDevice: string;
  settings?: any;
  products?: any[];
  customers?: any[];
  invoices?: any[];
  purchaseOrders?: any[];
  expenses?: any[];
  suppliers?: any[];
  stockMovements?: any[];
}

let activeWorkspace: WorkspaceState = {
  version: 2,
  revision: 1,
  updatedAt: new Date().toISOString(),
  updatedByDevice: 'Server-Init',
};

// Load initial state from disk if available
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      activeWorkspace = parsed;
    }
  }
} catch (e) {
  console.warn('Could not read existing workspace-data.json:', e);
}

// Track connected devices
const connectedDevices = new Map<string, DeviceInfo>();

// Active Server-Sent Events (SSE) clients
const sseClients = new Set<Response>();

// Broadcast state update to all active SSE subscribers (e.g. mobile phones, laptop tabs)
function broadcastToClients(data: any, eventType: string = 'sync_update') {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean up stale devices every 10 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, dev] of connectedDevices.entries()) {
    if (now - dev.lastSeen > 25000) {
      connectedDevices.delete(id);
    }
  }
}, 10000);

// Keep-alive ping for SSE connections every 15 seconds
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// API Routes

// 1. Get current workspace state & online devices
app.get('/api/sync/state', (_req: Request, res: Response) => {
  res.json({
    workspace: activeWorkspace,
    devices: Array.from(connectedDevices.values()),
    serverTime: new Date().toISOString(),
  });
});

// 2. Ultra-Fast Push: Called immediately by Laptop or Mobile on changes
app.post('/api/sync/push', (req: Request, res: Response) => {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Missing body' });
  }

  const incomingRevision = (activeWorkspace.revision || 0) + 1;
  const updatedAt = new Date().toISOString();
  const updatedByDevice = body.updatedByDevice || 'Unknown-Device';

  activeWorkspace = {
    ...activeWorkspace,
    ...body,
    revision: incomingRevision,
    updatedAt,
    updatedByDevice,
  };

  // Async save to disk for durability
  try {
    fs.writeFile(DATA_FILE, JSON.stringify(activeWorkspace), () => {});
  } catch (err) {
    console.warn('Could not persist to workspace-data.json:', err);
  }

  // Instantly broadcast to all connected devices (sub-second mobile sync)
  broadcastToClients({
    workspace: activeWorkspace,
    revision: incomingRevision,
    updatedAt,
    updatedByDevice,
  }, 'sync_update');

  return res.json({
    success: true,
    revision: incomingRevision,
    updatedAt,
  });
});

// 3. Server-Sent Events (SSE) Stream: Live 1-second continuous sync connection
app.get('/api/sync/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state immediately upon connecting
  res.write(`event: initial_state\ndata: ${JSON.stringify(activeWorkspace)}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 4. Polling endpoint for fast 1-second heartbeat / fallback
app.get('/api/sync/poll', (req: Request, res: Response) => {
  const sinceRevision = parseInt(req.query.sinceRevision as string, 10) || 0;
  const currentRevision = activeWorkspace.revision || 0;

  res.json({
    hasUpdate: currentRevision > sinceRevision,
    revision: currentRevision,
    workspace: currentRevision > sinceRevision ? activeWorkspace : null,
    devices: Array.from(connectedDevices.values()),
    serverTime: new Date().toISOString(),
  });
});

// 5. Device Heartbeat & Presence
app.post('/api/sync/heartbeat', (req: Request, res: Response) => {
  const { deviceId, deviceType, deviceName } = req.body;
  if (deviceId) {
    connectedDevices.set(deviceId, {
      deviceId,
      deviceType: deviceType || 'Laptop',
      deviceName: deviceName || deviceId,
      lastSeen: Date.now(),
    });
  }

  res.json({
    success: true,
    devices: Array.from(connectedDevices.values()),
    currentRevision: activeWorkspace.revision || 0,
  });
});

// 6. Test Ping between paired devices
app.post('/api/sync/ping', (req: Request, res: Response) => {
  const { fromDevice, toDevice, message } = req.body;
  broadcastToClients({
    fromDevice,
    toDevice,
    message: message || 'Live Sync Ping',
    timestamp: new Date().toISOString(),
  }, 'ping_notification');

  res.json({ success: true, timestamp: new Date().toISOString() });
});

// 7. GitHub Deployment & Status Endpoints
app.get('/api/github/status', async (_req: Request, res: Response) => {
  try {
    const isGit = fs.existsSync(path.join(__dirname, '.git'));
    if (!isGit) {
      return res.json({ initialized: false });
    }

    let branch = 'main';
    try {
      const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: __dirname });
      branch = stdout.trim() || 'main';
    } catch {
      // ignore
    }

    let latestCommit: { hash: string; author: string; email: string; message: string; date: string } | null = null;
    try {
      const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%H|%an|%ae|%s|%cd'], { cwd: __dirname });
      const parts = stdout.trim().split('|');
      if (parts.length >= 5) {
        latestCommit = {
          hash: parts[0],
          author: parts[1],
          email: parts[2],
          message: parts[3],
          date: parts[4],
        };
      }
    } catch {
      // ignore
    }

    let remoteOrigin: string | null = null;
    try {
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: __dirname });
      // Sanitize any token from remote url before exposing
      remoteOrigin = stdout.trim().replace(/\/\/[^@]+@/, '//***@');
    } catch {
      // No remote origin yet
    }

    let hasUncommittedChanges = false;
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: __dirname });
      hasUncommittedChanges = stdout.trim().length > 0;
    } catch {
      // ignore
    }

    res.json({
      initialized: true,
      branch,
      latestCommit,
      remoteOrigin,
      hasUncommittedChanges,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to inspect git status' });
  }
});

app.post('/api/github/publish', async (req: Request, res: Response) => {
  try {
    const { repoOwner, repoName, personalAccessToken, commitMessage } = req.body;

    if (!repoOwner || !repoName) {
      return res.status(400).json({ error: 'GitHub Username/Organization and Repository Name are required.' });
    }

    const cleanOwner = String(repoOwner).trim().replace(/[^a-zA-Z0-9-]/g, '');
    const cleanRepo = String(repoName).trim().replace(/[^a-zA-Z0-9_.-]/g, '');

    if (!cleanOwner || !cleanRepo) {
      return res.status(400).json({ error: 'Invalid repository name or username format.' });
    }

    const token = personalAccessToken ? String(personalAccessToken).trim() : '';

    // Stage changes and commit if needed
    try {
      await execFileAsync('git', ['add', '-A'], { cwd: __dirname });
      const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: __dirname });
      if (statusOut.trim().length > 0) {
        const msg = (commitMessage && String(commitMessage).trim()) || `feat: update SolarCraft ERP (${new Date().toLocaleDateString()})`;
        await execFileAsync('git', ['commit', '-m', msg], { cwd: __dirname });
      }
    } catch (commitErr: any) {
      console.warn('Git commit note:', commitErr.message);
    }

    // Set remote origin URL
    const authenticatedUrl = token
      ? `https://${encodeURIComponent(cleanOwner)}:${encodeURIComponent(token)}@github.com/${cleanOwner}/${cleanRepo}.git`
      : `https://github.com/${cleanOwner}/${cleanRepo}.git`;

    try {
      await execFileAsync('git', ['remote', 'remove', 'origin'], { cwd: __dirname });
    } catch {
      // origin might not exist yet
    }

    await execFileAsync('git', ['remote', 'add', 'origin', authenticatedUrl], { cwd: __dirname });

    // Push to GitHub
    try {
      const { stdout, stderr } = await execFileAsync('git', ['push', '-u', 'origin', 'main', '--force'], { cwd: __dirname });
      
      const repoUrl = `https://github.com/${cleanOwner}/${cleanRepo}`;
      const pagesUrl = `https://${cleanOwner.toLowerCase()}.github.io/${cleanRepo}/`;

      // Get latest commit hash
      const { stdout: logOut } = await execFileAsync('git', ['log', '-1', '--format=%H'], { cwd: __dirname });

      res.json({
        success: true,
        repoUrl,
        pagesUrl,
        branch: 'main',
        commitHash: logOut.trim(),
        message: 'Successfully deployed and pushed to GitHub!',
        output: (stdout + ' ' + stderr).replace(new RegExp(token, 'g'), '***'),
      });
    } catch (pushErr: any) {
      const safeError = String(pushErr.stderr || pushErr.message || '').replace(new RegExp(token, 'g'), '***');
      return res.status(400).json({
        success: false,
        error: 'Git Push Failed. Please ensure the repository exists on GitHub and your token has "repo" permissions.',
        details: safeError,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An error occurred during GitHub deployment' });
  }
});

app.get('/api/github/download-source', async (_req: Request, res: Response) => {
  try {
    const archivePath = path.join(__dirname, 'solarcraft-erp-source.tar.gz');
    await execFileAsync('git', ['archive', '--format=tar.gz', '-o', archivePath, 'HEAD'], { cwd: __dirname });

    res.download(archivePath, 'solarcraft-erp-latest.tar.gz', (err) => {
      try {
        if (fs.existsSync(archivePath)) {
          fs.unlinkSync(archivePath);
        }
      } catch {
        // ignore cleanup error
      }
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate source download archive' });
  }
});

// Mount Vite or Static Files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SolarCraft ERP Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
