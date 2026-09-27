import { db, doc, getDoc, setDoc, onSnapshot } from '../lib/firebase';
import firebaseConfigData from '../../firebase-applet-config.json';
import { 
  ShopSettings, 
  ProductItem, 
  Customer, 
  Invoice, 
  PurchaseOrder, 
  Expense, 
  Supplier, 
  StockMovement 
} from '../types/solar';

export interface CloudWorkspacePayload {
  version: number;
  revision?: number;
  updatedAt: string;
  updatedByDevice: string;
  settings?: ShopSettings;
  products?: ProductItem[];
  customers?: Customer[];
  invoices?: Invoice[];
  purchaseOrders?: PurchaseOrder[];
  expenses?: Expense[];
  suppliers?: Supplier[];
  stockMovements?: StockMovement[];
}

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error' | 'local_only' | 'quota_exceeded' | 'live_1s';

export interface ConnectedDevice {
  deviceId: string;
  deviceType: 'Laptop' | 'Mobile' | 'Tablet';
  deviceName: string;
  lastSeen: number;
  isCurrentDevice?: boolean;
}

export const FIREBASE_CONSOLE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfigData.projectId}/firestore/databases/${firebaseConfigData.firestoreDatabaseId || '(default)'}/data?openUpgradeDialog=true`;

// Generate or retrieve persistent local device ID and friendly name
export const getDeviceType = (): 'Laptop' | 'Mobile' | 'Tablet' => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Android|iPhone|iPod|Mobile/i.test(ua) || window.innerWidth < 768) return 'Mobile';
  return 'Laptop';
};

export const getDeviceId = (): string => {
  let id = localStorage.getItem('solarcraft_device_id');
  if (!id) {
    const type = getDeviceType();
    id = `${type}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    localStorage.setItem('solarcraft_device_id', id);
  }
  return id;
};

export const getDeviceName = (): string => {
  let name = localStorage.getItem('solarcraft_device_name');
  if (!name) {
    const type = getDeviceType();
    name = type === 'Laptop' ? 'Office Laptop' : 'My Mobile Phone';
    localStorage.setItem('solarcraft_device_name', name);
  }
  return name;
};

export const setDeviceName = (name: string) => {
  localStorage.setItem('solarcraft_device_name', name.trim());
};

const WORKSPACE_DOC_REF = 'solarcraft_cloud_workspace';
const WORKSPACE_DOC_ID = 'primary';
const QUOTA_STORAGE_KEY = 'solarcraft_quota_exceeded_utc_date';

// State flags
let isRemoteUpdateInProgress = false;
let isQuotaExceededFlag = false;
let lastAppliedHash = '';
let activeLocalRevision = 1;

// Deterministic signature to prevent echo loops
export const computeDataSignature = (data: Partial<CloudWorkspacePayload>): string => {
  try {
    const invCount = data.invoices?.length || 0;
    const invLastId = data.invoices?.[0]?.id || '';
    const invGrandTotalSum = data.invoices?.reduce((sum, i) => sum + (i.grandTotal || 0), 0) || 0;
    const prodCount = data.products?.length || 0;
    const custCount = data.customers?.length || 0;
    const expCount = data.expenses?.length || 0;
    const poCount = data.purchaseOrders?.length || 0;
    const movCount = data.stockMovements?.length || 0;
    const settingsName = data.settings?.shopName || '';
    return `${invCount}_${invLastId}_${invGrandTotalSum}_${prodCount}_${custCount}_${expCount}_${poCount}_${movCount}_${settingsName}`;
  } catch {
    return String(Date.now());
  }
};

export const setLastAppliedHash = (hash: string) => {
  lastAppliedHash = hash;
};

export const getLastAppliedHash = () => lastAppliedHash;

export const getIsRemoteUpdateInProgress = () => isRemoteUpdateInProgress;

export const setIsRemoteUpdateInProgress = (val: boolean) => {
  isRemoteUpdateInProgress = val;
};

const getCurrentUtcDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const checkStoredQuotaStatus = (): boolean => {
  try {
    const storedDate = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (storedDate && storedDate === getCurrentUtcDate()) {
      isQuotaExceededFlag = true;
      return true;
    } else if (storedDate && storedDate !== getCurrentUtcDate()) {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      isQuotaExceededFlag = false;
      return false;
    }
  } catch {
    // Ignore localStorage errors
  }
  return isQuotaExceededFlag;
};

export const markQuotaExceeded = () => {
  isQuotaExceededFlag = true;
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, getCurrentUtcDate());
  } catch {
    // Ignore localStorage errors
  }
};

export const isQuotaExceeded = () => isQuotaExceededFlag;

export const resetQuotaExceededFlag = () => {
  isQuotaExceededFlag = false;
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
};

const checkIsQuotaError = (error: any): boolean => {
  if (!error) return false;
  const str = String(error?.message || error?.code || error || '').toLowerCase();
  return (
    str.includes('resource-exhausted') ||
    str.includes('quota limit exceeded') ||
    str.includes('quota exceeded') ||
    str.includes('free daily write units') ||
    str.includes('free daily read units') ||
    str.includes('free tier database')
  );
};

// ============================================================================
// 1. HIGH-SPEED SERVER LIVE RELAY ENGINE (Zero-quota sub-second Laptop <-> Mobile sync)
// ============================================================================

export async function pushToServerRelay(data: {
  settings: ShopSettings;
  products: ProductItem[];
  customers: Customer[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
}): Promise<{ success: boolean; revision?: number }> {
  try {
    const payload: CloudWorkspacePayload = {
      version: 2,
      revision: ++activeLocalRevision,
      updatedAt: new Date().toISOString(),
      updatedByDevice: `${getDeviceId()} (${getDeviceName()})`,
      settings: data.settings,
      products: data.products,
      customers: data.customers,
      invoices: data.invoices,
      purchaseOrders: data.purchaseOrders,
      expenses: data.expenses,
      suppliers: data.suppliers,
      stockMovements: data.stockMovements,
    };

    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return { success: true, revision: json.revision };
    }
    return { success: false };
  } catch (err) {
    // Server might be in dev build or offline; silent fallback
    return { success: false };
  }
}

export async function fetchServerState(): Promise<CloudWorkspacePayload | null> {
  try {
    const res = await fetch('/api/sync/state');
    if (res.ok) {
      const data = await res.json();
      return data.workspace as CloudWorkspacePayload;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function sendDeviceHeartbeat(): Promise<ConnectedDevice[]> {
  try {
    const res = await fetch('/api/sync/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        deviceType: getDeviceType(),
        deviceName: getDeviceName(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const currentId = getDeviceId();
      return (data.devices || []).map((d: any) => ({
        ...d,
        isCurrentDevice: d.deviceId === currentId,
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

export async function sendPingNotification(message?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromDevice: `${getDeviceId()} (${getDeviceName()})`,
        message: message || '⚡ Real-time sync ping test',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// 2. FIRESTORE CLOUD DATABASE ENGINE (Persistent Multi-Device Backup)
// ============================================================================

export async function pushFullStateToCloud(data: {
  settings: ShopSettings;
  products: ProductItem[];
  customers: Customer[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
}): Promise<{ success: boolean; isQuotaExceeded?: boolean; error?: string }> {
  if (isRemoteUpdateInProgress) return { success: false };

  // Always push to high-speed server live relay first
  pushToServerRelay(data).catch(() => {});

  if (isQuotaExceeded()) {
    return { success: false, isQuotaExceeded: true, error: 'Daily free Firestore write quota reached' };
  }

  try {
    const docRef = doc(db, WORKSPACE_DOC_REF, WORKSPACE_DOC_ID);
    const payload: CloudWorkspacePayload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      updatedByDevice: `${getDeviceId()} (${getDeviceName()})`,
      settings: data.settings,
      products: data.products,
      customers: data.customers,
      invoices: data.invoices,
      purchaseOrders: data.purchaseOrders,
      expenses: data.expenses,
      suppliers: data.suppliers,
      stockMovements: data.stockMovements,
    };
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (error: any) {
    if (checkIsQuotaError(error)) {
      markQuotaExceeded();
      console.warn('Firestore daily write quota reached for today. Server Live Stream continues seamlessly.');
      return { success: false, isQuotaExceeded: true, error: error?.message || 'Quota limit exceeded' };
    }
    console.warn('Firestore push note:', error?.message || error);
    return { success: false, error: error?.message || 'Push failed' };
  }
}

export async function fetchCloudState(): Promise<CloudWorkspacePayload | null> {
  // First try server state for freshest data
  const serverState = await fetchServerState();
  if (serverState && serverState.invoices && serverState.invoices.length > 0) {
    return serverState;
  }

  if (isQuotaExceeded()) {
    return null;
  }
  try {
    const docRef = doc(db, WORKSPACE_DOC_REF, WORKSPACE_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as CloudWorkspacePayload;
    }
    return null;
  } catch (error: any) {
    if (checkIsQuotaError(error)) {
      markQuotaExceeded();
    }
    return null;
  }
}

// ============================================================================
// 3. CONTINUOUS REAL-TIME DUAL-SYNC SUBSCRIPTION (Laptop <-> Mobile Every Second)
// ============================================================================

export function subscribeToCloudWorkspace(
  onCloudUpdate: (data: CloudWorkspacePayload, source: 'server' | 'firestore' | 'broadcast') => void,
  onStatusChange: (status: SyncStatus, errorMsg?: string) => void,
  onPingReceived?: (fromDevice: string, message: string) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let pollInterval: any = null;
  let heartbeatInterval: any = null;
  let lastReceivedRevision = 0;
  let firestoreUnsubscribe: (() => void) | null = null;

  // Local BroadcastChannel for instant same-browser multi-window sync
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('solarcraft_live_channel');
      broadcastChannel.onmessage = (event) => {
        if (isClosed || !event.data) return;
        const { type, payload, senderId } = event.data;
        if (senderId === getDeviceId()) return;
        if (type === 'STATE_UPDATE' && payload) {
          const sig = computeDataSignature(payload);
          if (sig !== lastAppliedHash) {
            lastAppliedHash = sig;
            isRemoteUpdateInProgress = true;
            try {
              onCloudUpdate(payload, 'broadcast');
            } finally {
              setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
            }
          }
        }
      };
    }
  } catch {
    // ignore
  }

  // 1. Connect to Server-Sent Events (SSE) for instant sub-second push
  const connectSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/sync/stream');

      eventSource.addEventListener('initial_state', (e) => {
        if (isClosed) return;
        try {
          const data = JSON.parse(e.data) as CloudWorkspacePayload;
          if (data && (data.invoices || data.products)) {
            const sig = computeDataSignature(data);
            if (sig !== lastAppliedHash) {
              lastAppliedHash = sig;
              if (data.revision) lastReceivedRevision = data.revision;
              isRemoteUpdateInProgress = true;
              try {
                onCloudUpdate(data, 'server');
              } finally {
                setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
              }
            }
          }
          onStatusChange('live_1s');
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('sync_update', (e) => {
        if (isClosed) return;
        try {
          const res = JSON.parse(e.data);
          const data = (res.workspace || res) as CloudWorkspacePayload;
          if (data) {
            const sig = computeDataSignature(data);
            if (sig !== lastAppliedHash) {
              lastAppliedHash = sig;
              if (res.revision) lastReceivedRevision = res.revision;
              isRemoteUpdateInProgress = true;
              try {
                onCloudUpdate(data, 'server');
              } finally {
                setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
              }
              onStatusChange('live_1s');
            }
          }
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('ping_notification', (e) => {
        if (isClosed) return;
        try {
          const pingData = JSON.parse(e.data);
          if (pingData.fromDevice !== `${getDeviceId()} (${getDeviceName()})`) {
            onPingReceived?.(pingData.fromDevice, pingData.message);
          }
        } catch {
          // ignore
        }
      });

      eventSource.onopen = () => {
        if (isClosed) return;
        onStatusChange('live_1s');
      };

      eventSource.onerror = () => {
        // SSE reconnects automatically, fallback to 1s poll is active
      };
    } catch {
      // ignore
    }
  };

  connectSSE();

  // 2. High-Frequency 1-Second Pulse Check (guarantees continuous mobile sync even if SSE sleeps)
  pollInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      const res = await fetch(`/api/sync/poll?sinceRevision=${lastReceivedRevision}`);
      if (res.ok) {
        const json = await res.json();
        if (json.hasUpdate && json.workspace) {
          const sig = computeDataSignature(json.workspace);
          if (sig !== lastAppliedHash) {
            lastAppliedHash = sig;
            lastReceivedRevision = json.revision || (lastReceivedRevision + 1);
            isRemoteUpdateInProgress = true;
            try {
              onCloudUpdate(json.workspace, 'server');
            } finally {
              setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
            }
            onStatusChange('live_1s');
          }
        }
      }
    } catch {
      // silent
    }
  }, 1000);

  // 3. Heartbeat presence registration every 5 seconds
  sendDeviceHeartbeat().catch(() => {});
  heartbeatInterval = setInterval(() => {
    if (!isClosed) {
      sendDeviceHeartbeat().catch(() => {});
    }
  }, 5000);

  // 4. Firestore Real-time Listener (Secondary Cloud Backup)
  if (!checkStoredQuotaStatus() && !isQuotaExceeded()) {
    try {
      const docRef = doc(db, WORKSPACE_DOC_REF, WORKSPACE_DOC_ID);
      firestoreUnsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (isClosed) return;
          if (snapshot.exists()) {
            const data = snapshot.data() as CloudWorkspacePayload;
            const sig = computeDataSignature(data);
            if (sig !== lastAppliedHash) {
              lastAppliedHash = sig;
              isRemoteUpdateInProgress = true;
              try {
                onCloudUpdate(data, 'firestore');
              } finally {
                setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
              }
            }
          }
        },
        (error: any) => {
          if (isClosed) return;
          if (checkIsQuotaError(error)) {
            markQuotaExceeded();
            // Free quota exceeded on Firestore: Server Live Sync remains 100% active and running every second!
            if (firestoreUnsubscribe) {
              try { firestoreUnsubscribe(); } catch {}
              firestoreUnsubscribe = null;
            }
          }
        }
      );
    } catch {
      // ignore
    }
  }

  // Cleanup
  return () => {
    isClosed = true;
    if (eventSource) {
      try { eventSource.close(); } catch {}
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (broadcastChannel) {
      try { broadcastChannel.close(); } catch {}
      broadcastChannel = null;
    }
    if (firestoreUnsubscribe) {
      try { firestoreUnsubscribe(); } catch {}
      firestoreUnsubscribe = null;
    }
  };
}

// Broadcast to local tabs on same machine
export function broadcastLocalState(payload: Partial<CloudWorkspacePayload>) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('solarcraft_live_channel');
      ch.postMessage({
        type: 'STATE_UPDATE',
        senderId: getDeviceId(),
        payload,
      });
      setTimeout(() => ch.close(), 100);
    }
  } catch {
    // ignore
  }
}
