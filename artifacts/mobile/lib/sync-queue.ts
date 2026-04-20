import { getDb } from "./database";
import {
  createContact,
  updateContact,
  deleteContact,
  createAction,
  updateAction,
  deleteAction,
} from "@workspace/api-client-react";
import type {
  CreateContactInput,
  UpdateContactInput,
  CreateActionInput,
  UpdateActionInput,
} from "@workspace/api-client-react";

interface SyncQueueRow {
  id: number;
  entity_type: string;
  entity_id: number;
  operation: string;
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

interface IdMapRow {
  local_id: number;
  server_id: number;
}

const MAX_ATTEMPTS = 5;

export function enqueueMutation(
  entityType: "contact" | "action",
  entityId: number,
  operation: "create" | "update" | "delete",
  payload?: Record<string, unknown>
): void {
  const db = getDb();
  const now = new Date().toISOString();

  // Check for existing queue entry for this entity
  const existing = db.getFirstSync<SyncQueueRow>(
    "SELECT * FROM sync_queue WHERE entity_type = ? AND entity_id = ?",
    [entityType, entityId]
  );

  if (!existing) {
    db.runSync(
      "INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)",
      [entityType, entityId, operation, payload ? JSON.stringify(payload) : null, now]
    );
    return;
  }

  // Deduplication logic
  if (existing.operation === "create" && operation === "update") {
    // Merge update into existing create payload
    const existingPayload = existing.payload ? JSON.parse(existing.payload) : {};
    const merged = { ...existingPayload, ...payload };
    db.runSync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
      JSON.stringify(merged),
      existing.id,
    ]);
  } else if (existing.operation === "create" && operation === "delete") {
    // Never reached the server — remove from queue entirely
    db.runSync("DELETE FROM sync_queue WHERE id = ?", [existing.id]);
    // Also hard-delete the local record since it was never synced
    if (entityType === "contact") {
      // Purge sync_queue action entries BEFORE deleting actions,
      // otherwise the subquery on `actions` returns empty.
      db.runSync(
        "DELETE FROM sync_queue WHERE entity_type = 'action' AND entity_id IN (SELECT id FROM actions WHERE contact_id = ?)",
        [entityId]
      );
      db.runSync("DELETE FROM actions WHERE contact_id = ?", [entityId]);
      db.runSync("DELETE FROM contacts WHERE id = ?", [entityId]);
    } else {
      db.runSync("DELETE FROM actions WHERE id = ?", [entityId]);
    }
  } else if (existing.operation === "update" && operation === "update") {
    // Merge payloads
    const existingPayload = existing.payload ? JSON.parse(existing.payload) : {};
    const merged = { ...existingPayload, ...payload };
    db.runSync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
      JSON.stringify(merged),
      existing.id,
    ]);
  } else if (existing.operation === "update" && operation === "delete") {
    // Replace update with delete
    db.runSync("UPDATE sync_queue SET operation = 'delete', payload = NULL WHERE id = ?", [
      existing.id,
    ]);
  } else {
    // Fallback: just insert as a new entry
    db.runSync(
      "INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)",
      [entityType, entityId, operation, payload ? JSON.stringify(payload) : null, now]
    );
  }
}

function resolveId(entityType: string, localId: number): number {
  if (localId >= 0) return localId;
  const db = getDb();
  const row = db.getFirstSync<IdMapRow>(
    "SELECT server_id FROM id_map WHERE entity_type = ? AND local_id = ?",
    [entityType, localId]
  );
  return row ? row.server_id : localId;
}

function registerIdMapping(entityType: string, localId: number, serverId: number): void {
  const db = getDb();
  db.runSync(
    "INSERT OR REPLACE INTO id_map (entity_type, local_id, server_id) VALUES (?, ?, ?)",
    [entityType, localId, serverId]
  );

  // Update the local record's ID to the server ID
  if (entityType === "contact") {
    // Update actions that reference this contact's local ID
    db.runSync("UPDATE actions SET contact_id = ? WHERE contact_id = ?", [serverId, localId]);
    // Update sync_queue entries referencing the old local ID
    db.runSync(
      "UPDATE sync_queue SET entity_id = ? WHERE entity_type = 'action' AND entity_id IN (SELECT id FROM actions WHERE contact_id = ?)",
      [serverId, localId]
    );
    // Update the contact itself
    db.runSync("UPDATE contacts SET id = ?, _local_only = 0 WHERE id = ?", [serverId, localId]);
    // Update any remaining sync_queue references
    db.runSync(
      "UPDATE sync_queue SET entity_id = ? WHERE entity_type = 'contact' AND entity_id = ?",
      [serverId, localId]
    );
  } else if (entityType === "action") {
    db.runSync("UPDATE actions SET id = ?, _local_only = 0 WHERE id = ?", [serverId, localId]);
    db.runSync(
      "UPDATE sync_queue SET entity_id = ? WHERE entity_type = 'action' AND entity_id = ?",
      [serverId, localId]
    );
  }
}

async function processEntry(entry: SyncQueueRow): Promise<boolean> {
  const db = getDb();

  try {
    if (entry.entity_type === "contact") {
      if (entry.operation === "create") {
        const payload = JSON.parse(entry.payload!) as CreateContactInput;
        const result = await createContact(payload);
        registerIdMapping("contact", entry.entity_id, result.id);
      } else if (entry.operation === "update") {
        const serverId = resolveId("contact", entry.entity_id);
        if (serverId < 0) return false; // Parent not synced yet
        const payload = JSON.parse(entry.payload!) as UpdateContactInput;
        await updateContact(serverId, payload);
      } else if (entry.operation === "delete") {
        const serverId = resolveId("contact", entry.entity_id);
        if (serverId < 0) {
          // Was never synced, just remove from queue
          db.runSync("DELETE FROM sync_queue WHERE id = ?", [entry.id]);
          return true;
        }
        await deleteContact(serverId);
        // Hard delete local data
        db.runSync("DELETE FROM contacts WHERE id = ?", [serverId]);
      }
    } else if (entry.entity_type === "action") {
      if (entry.operation === "create") {
        const payload = JSON.parse(entry.payload!) as CreateActionInput & { contactId: number };
        // Resolve the contactId in case it's a local ID
        const resolvedContactId = resolveId("contact", payload.contactId);
        if (resolvedContactId < 0) return false; // Parent contact not synced yet
        const result = await createAction({ ...payload, contactId: resolvedContactId });
        registerIdMapping("action", entry.entity_id, result.id);
      } else if (entry.operation === "update") {
        const serverId = resolveId("action", entry.entity_id);
        if (serverId < 0) return false;
        const payload = JSON.parse(entry.payload!) as UpdateActionInput;
        await updateAction(serverId, payload);
      } else if (entry.operation === "delete") {
        const serverId = resolveId("action", entry.entity_id);
        if (serverId < 0) {
          db.runSync("DELETE FROM sync_queue WHERE id = ?", [entry.id]);
          return true;
        }
        await deleteAction(serverId);
        db.runSync("DELETE FROM actions WHERE id = ?", [serverId]);
      }
    }

    // Success — remove from queue
    db.runSync("DELETE FROM sync_queue WHERE id = ?", [entry.id]);
    return true;
  } catch (error: unknown) {
    const isNetworkError =
      error instanceof TypeError ||
      (error && typeof error === "object" && "message" in error &&
        typeof (error as { message: string }).message === "string" &&
        (error as { message: string }).message.toLowerCase().includes("network"));

    if (isNetworkError) {
      // Network error — stop processing, will retry later
      return false;
    }

    // Server error — increment attempts
    const errorMsg = error instanceof Error ? error.message : String(error);
    db.runSync(
      "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
      [errorMsg, entry.id]
    );
    return true; // Continue to next entry
  }
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const db = getDb();
  let processed = 0;
  let failed = 0;

  // Process in dependency order:
  // 1. Contact creates (oldest first)
  // 2. Action creates (oldest first, so contactId can be resolved)
  // 3. All updates (contacts then actions)
  // 4. All deletes (actions first, then contacts — reverse dependency)
  const phases = [
    { entityType: "contact", operation: "create" },
    { entityType: "action", operation: "create" },
    { entityType: "contact", operation: "update" },
    { entityType: "action", operation: "update" },
    { entityType: "action", operation: "delete" },
    { entityType: "contact", operation: "delete" },
  ];

  for (const phase of phases) {
    const entries = db.getAllSync<SyncQueueRow>(
      "SELECT * FROM sync_queue WHERE entity_type = ? AND operation = ? AND attempts < ? ORDER BY id ASC",
      [phase.entityType, phase.operation, MAX_ATTEMPTS]
    );

    for (const entry of entries) {
      const success = await processEntry(entry);
      if (!success) {
        // Network error — stop all processing
        if (entry.attempts === 0) {
          failed++;
          return { processed, failed };
        }
      }
      processed++;
    }
  }

  return { processed, failed };
}

export function getPendingSyncCount(): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue"
  );
  return row?.count ?? 0;
}

export function getFailedSyncCount(): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE attempts >= ${MAX_ATTEMPTS}`
  );
  return row?.count ?? 0;
}
