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

// Clear any stale local quota blocks on startup
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  }
} catch {}

// Deterministic signature to prevent echo loops
export const computeDataSignature = (data: Partial<CloudWorkspacePayload>): string => {
  try {
    const invCount = data.invoices?.length || 0;
    const invGrandTotalSum = Math.round(data.invoices?.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0) || 0);
    const invPaidTotalSum = Math.round(data.invoices?.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0) || 0);
    const invBalanceDueSum = Math.round(data.invoices?.reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0) || 0);
    const invPaymentsCount = data.invoices?.reduce((sum, i) => sum + (i.payments?.length || 0), 0) || 0;
    
    // Explicitly track invoice line items count and items signature (accessories, equipment)
    const invTotalItemsCount = data.invoices?.reduce((sum, i) => sum + (i.items?.length || 0), 0) || 0;
    const invItemsSummaryHash = data.invoices?.reduce((acc, i) => {
      const itemsHash = (i.items || []).map(it => `${it.id}:${(it.description || '').substring(0, 8)}:${it.quantity}:${it.unitPrice}:${it.total}`).join(',');
      return acc + (itemsHash.length % 997);
    }, 0) || 0;

    // Aggregate timestamp hash across all invoices so editing ANY invoice triggers sync
    const invAllUpdatedHash = data.invoices?.reduce((sum, i) => {
      const ts = new Date(i.updatedAt || i.createdAt || 0).getTime();
      return sum + (ts % 1000000);
    }, 0) || 0;

    const custCount = data.customers?.length || 0;
    const custPaidSum = Math.round(data.customers?.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0) || 0);
    const custBalanceSum = Math.round(data.customers?.reduce((sum, c) => sum + (Number(c.balanceDue) || 0), 0) || 0);

    const prodCount = data.products?.length || 0;
    const prodStockSum = Math.round(data.products?.reduce((sum, p) => sum + (Number(p.stockQty) || 0), 0) || 0);

    const expCount = data.expenses?.length || 0;
    const expTotalSum = Math.round(data.expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0);

    const poCount = data.purchaseOrders?.length || 0;
    const poTotalSum = Math.round(data.purchaseOrders?.reduce((sum, po) => sum + (Number(po.grandTotal) || 0), 0) || 0);
    const poReceivedCount = data.purchaseOrders?.filter(po => po.status === 'RECEIVED').length || 0;

    const supCount = data.suppliers?.length || 0;
    const supBalanceSum = Math.round(data.suppliers?.reduce((sum, s) => sum + (Number(s.totalOutstanding) || 0), 0) || 0);

    const movCount = data.stockMovements?.length || 0;
    const movFirstId = data.stockMovements?.[0]?.id || '';

    const settingsName = data.settings?.shopName || '';
    const settingsPhone = data.settings?.phone || '';

    return `inv:${invCount}_${invGrandTotalSum}_${invPaidTotalSum}_${invBalanceDueSum}_${invPaymentsCount}_${invTotalItemsCount}_${invItemsSummaryHash}_${invAllUpdatedHash}|cust:${custCount}_${custPaidSum}_${custBalanceSum}|prod:${prodCount}_${prodStockSum}|exp:${expCount}_${expTotalSum}|po:${poCount}_${poTotalSum}_${poReceivedCount}|sup:${supCount}_${supBalanceSum}|mov:${movCount}_${movFirstId}|set:${settingsName}_${settingsPhone}`;
  } catch {
    return String(Date.now());
  }
};

/**
 * Intelligent Conflict-Free Merge for Invoices:
 * Prevents remote sync from wiping out newer local invoice items, accessories, or payments.
 */
export const mergeInvoicesWithLocal = (localInvs: Invoice[], remoteInvs: Invoice[]): Invoice[] => {
  if (!remoteInvs || remoteInvs.length === 0) return localInvs;
  if (!localInvs || localInvs.length === 0) return remoteInvs;

  const invoiceMap = new Map<string, Invoice>();
  for (const inv of remoteInvs) {
    invoiceMap.set(inv.id, inv);
  }

  for (const localInv of localInvs) {
    const remoteInv = invoiceMap.get(localInv.id);
    if (!remoteInv) {
      // Local invoice not yet in remote, keep local
      invoiceMap.set(localInv.id, localInv);
    } else {
      const localUpdated = new Date(localInv.updatedAt || localInv.createdAt || 0).getTime();
      const remoteUpdated = new Date(remoteInv.updatedAt || remoteInv.createdAt || 0).getTime();
      const localPaymentsCount = localInv.payments?.length || 0;
      const remotePaymentsCount = remoteInv.payments?.length || 0;
      const localItemsCount = localInv.items?.length || 0;
      const remoteItemsCount = remoteInv.items?.length || 0;

      // Never downgrade an invoice if local has more items (e.g. accessories added),
      // more payments recorded, or a newer/equal update timestamp
      if (
        localItemsCount > remoteItemsCount ||
        localPaymentsCount > remotePaymentsCount ||
        localUpdated >= remoteUpdated
      ) {
        invoiceMap.set(localInv.id, localInv);
      }
    }
  }

  return Array.from(invoiceMap.values());
};

export const setLastAppliedHash = (hash: string) => {
  lastAppliedHash = hash;
};

export const getLastAppliedHash = () => lastAppliedHash;

export const getIsRemoteUpdateInProgress = () => isRemoteUpdateInProgress;

export const setIsRemoteUpdateInProgress = (val: boolean) => {
  isRemoteUpdateInProgress = val;
};

export const checkStoredQuotaStatus = (): boolean => {
  return false;
};

export const markQuotaExceeded = () => {
  // Silent advisory only - do not brick real-time sync
  console.warn('Notice: Firestore write rate check.');
};

export const isQuotaExceeded = () => false;

export const resetQuotaExceededFlag = () => {
  isQuotaExceededFlag = false;
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {}
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

let lastFirestorePushTime = 0;
let firestorePushTimer: any = null;
let latestPayloadToPush: any = null;

export async function pushFullStateToCloud(data: {
  settings: ShopSettings;
  products: ProductItem[];
  customers: Customer[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
}, immediate: boolean = false): Promise<{ success: boolean; isQuotaExceeded?: boolean; error?: string }> {
  // Always push to high-speed server live relay first for instant local responses
  pushToServerRelay(data).catch(() => {});

  latestPayloadToPush = data;

  const executeWrite = async () => {
    if (!latestPayloadToPush) return { success: true };
    const payloadData = latestPayloadToPush;
    latestPayloadToPush = null;
    lastFirestorePushTime = Date.now();

    try {
      const docRef = doc(db, WORKSPACE_DOC_REF, WORKSPACE_DOC_ID);
      // Sanitize data by converting to clean JSON so undefined fields (e.g. optional item properties)
      // are stripped out, preventing Firestore "Unsupported field value: undefined" errors
      const sanitizedPayload: CloudWorkspacePayload = JSON.parse(
        JSON.stringify({
          version: 2,
          updatedAt: new Date().toISOString(),
          updatedByDevice: `${getDeviceId()} (${getDeviceName()})`,
          settings: payloadData.settings,
          products: payloadData.products,
          customers: payloadData.customers,
          invoices: payloadData.invoices,
          purchaseOrders: payloadData.purchaseOrders,
          expenses: payloadData.expenses,
          suppliers: payloadData.suppliers,
          stockMovements: payloadData.stockMovements,
        })
      );
      await setDoc(docRef, sanitizedPayload, { merge: true });
      return { success: true };
    } catch (error: any) {
      console.warn('Firestore sync note:', error?.message || error);
      return { success: false, error: error?.message || 'Push failed' };
    }
  };

  const now = Date.now();
  const timeSinceLast = now - lastFirestorePushTime;

  // Enforce minimum 2.5s between full Firestore writes to respect Spark plan rate limits
  if (immediate || timeSinceLast >= 2500) {
    if (firestorePushTimer) {
      clearTimeout(firestorePushTimer);
      firestorePushTimer = null;
    }
    return executeWrite();
  } else {
    if (!firestorePushTimer) {
      const delay = Math.max(500, 2500 - timeSinceLast);
      firestorePushTimer = setTimeout(() => {
        firestorePushTimer = null;
        executeWrite();
      }, delay);
    }
    return { success: true };
  }
}

export async function fetchCloudState(): Promise<CloudWorkspacePayload | null> {
  // First query Firestore for authoritative cloud data
  try {
    const docRef = doc(db, WORKSPACE_DOC_REF, WORKSPACE_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as CloudWorkspacePayload;
      if (data && (data.invoices?.length || data.products?.length || data.customers?.length)) {
        // Feed into server memory cache
        pushToServerRelay(data as any).catch(() => {});
        return data;
      }
    }
  } catch (error: any) {
    console.warn('Firestore initial fetch fallback:', error?.message || error);
  }

  // Fallback to server state
  const serverState = await fetchServerState();
  if (serverState && (serverState.invoices?.length || serverState.products?.length)) {
    return serverState;
  }
  return null;
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

  // 4. Firestore Real-time Continuous Listener with Auto-Reconnect (Authoritative Cloud Backbone)
  let firestoreReconnectTimer: any = null;

  const startFirestoreListener = () => {
    if (isClosed) return;
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
                // Also feed server relay
                pushToServerRelay(data as any).catch(() => {});
              } finally {
                setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
              }
              onStatusChange('live_1s');
            }
          }
        },
        (error: any) => {
          if (isClosed) return;
          console.warn('Firestore subscription status (will auto-reconnect in 8s):', error?.message || error);
          if (firestoreUnsubscribe) {
            try { firestoreUnsubscribe(); } catch {}
            firestoreUnsubscribe = null;
          }
          if (firestoreReconnectTimer) clearTimeout(firestoreReconnectTimer);
          firestoreReconnectTimer = setTimeout(() => {
            if (!isClosed) startFirestoreListener();
          }, 8000);
        }
      );
    } catch (e) {
      console.warn('Firestore onSnapshot init error (retry in 8s):', e);
      if (firestoreReconnectTimer) clearTimeout(firestoreReconnectTimer);
      firestoreReconnectTimer = setTimeout(() => {
        if (!isClosed) startFirestoreListener();
      }, 8000);
    }
  };

  startFirestoreListener();

  // 5. Periodic 10-second cloud catchup to ensure mobile and laptop are guaranteed in sync
  let cloudCheckInterval: any = setInterval(async () => {
    if (isClosed || isRemoteUpdateInProgress) return;
    try {
      const cloudState = await fetchCloudState();
      if (cloudState && (cloudState.invoices || cloudState.products)) {
        const sig = computeDataSignature(cloudState);
        if (sig !== lastAppliedHash) {
          lastAppliedHash = sig;
          isRemoteUpdateInProgress = true;
          try {
            onCloudUpdate(cloudState, 'firestore');
          } finally {
            setTimeout(() => { isRemoteUpdateInProgress = false; }, 80);
          }
          onStatusChange('live_1s');
        }
      }
    } catch {}
  }, 10000);

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
    if (cloudCheckInterval) {
      clearInterval(cloudCheckInterval);
      cloudCheckInterval = null;
    }
    if (firestoreReconnectTimer) {
      clearTimeout(firestoreReconnectTimer);
      firestoreReconnectTimer = null;
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
