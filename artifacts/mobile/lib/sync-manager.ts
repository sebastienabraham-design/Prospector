import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  listContacts,
  listActions,
} from "@workspace/api-client-react";
import {
  getDb,
  upsertContactFromServer,
  upsertActionFromServer,
  removeServerDeletedContacts,
  removeServerDeletedActions,
  setSyncMeta,
  getSyncMeta,
} from "./database";
import { processSyncQueue, getPendingSyncCount } from "./sync-queue";

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  hasError: boolean;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncStatus>({
  isConnected: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  hasError: false,
  triggerSync: () => {},
});

export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext);
}

// Module-level sync request for use outside React components (e.g., from hooks)
let _requestSyncFn: (() => void) | null = null;

export function requestSync(): void {
  _requestSyncFn?.();
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingSyncCount());
  }, []);

  const pullSync = useCallback(async () => {
    try {
      // Fetch all contacts from server
      const serverContacts = await listContacts();
      const db = getDb();

      // Only upsert records that don't have pending local mutations
      for (const contact of serverContacts) {
        const pending = db.getFirstSync<{ id: number }>(
          "SELECT id FROM sync_queue WHERE entity_type = 'contact' AND entity_id = ?",
          [contact.id]
        );
        if (!pending) {
          upsertContactFromServer(contact);
        }
      }

      // Remove contacts deleted on server
      const serverContactIds = new Set(serverContacts.map((c) => c.id));
      removeServerDeletedContacts(serverContactIds);

      // Fetch all actions from server
      const serverActions = await listActions();
      for (const action of serverActions) {
        const pending = db.getFirstSync<{ id: number }>(
          "SELECT id FROM sync_queue WHERE entity_type = 'action' AND entity_id = ?",
          [action.id]
        );
        if (!pending) {
          upsertActionFromServer(action);
        }
      }

      const serverActionIds = new Set(serverActions.map((a) => a.id));
      removeServerDeletedActions(serverActionIds);

      const now = new Date().toISOString();
      setSyncMeta("last_synced_at", now);
      setLastSyncedAt(now);
    } catch {
      // Pull failed (likely network) — not critical
    }
  }, []);

  const doSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setHasError(false);

    try {
      // Push local changes to server
      const result = await processSyncQueue();

      // Then pull server changes
      await pullSync();

      if (result.failed > 0) {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [pullSync, refreshPendingCount]);

  const triggerSync = useCallback(() => {
    // Debounce: wait 1s to batch rapid mutations
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        doSync();
      }
    }, 1000);
  }, [isConnected, doSync]);

  // Register module-level sync request
  useEffect(() => {
    _requestSyncFn = triggerSync;
    return () => {
      _requestSyncFn = null;
    };
  }, [triggerSync]);

  // Initialize
  useEffect(() => {
    const stored = getSyncMeta("last_synced_at");
    setLastSyncedAt(stored);
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      const wasDisconnected = !isConnected;
      setIsConnected(connected);

      if (connected && wasDisconnected) {
        // Connectivity restored — sync immediately
        doSync();
      }
    });
    return () => unsubscribe();
  }, [isConnected, doSync]);

  // App foreground listener
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isConnected) {
        doSync();
      }
    });
    return () => subscription.remove();
  }, [isConnected, doSync]);

  // Initial sync on mount (if online and never synced)
  useEffect(() => {
    if (isConnected) {
      doSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SyncStatus = {
    isConnected,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    hasError,
    triggerSync,
  };

  return React.createElement(SyncContext.Provider, { value }, children);
}
