import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
