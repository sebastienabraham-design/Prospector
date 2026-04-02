import * as SQLite from "expo-sqlite";
import type {
  Contact,
  Action,
  ContactStatus,
  ActionActionType,
} from "@workspace/api-client-react";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("prospector.db");
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDb();

  database.execSync("PRAGMA journal_mode = WAL;");
  database.execSync("PRAGMA foreign_keys = ON;");

  database.execSync(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      property_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      _local_only INTEGER NOT NULL DEFAULT 0,
      _deleted INTEGER NOT NULL DEFAULT 0
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY,
      contact_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      action_type TEXT NOT NULL DEFAULT 'call',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      _local_only INTEGER NOT NULL DEFAULT 0,
      _deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS id_map (
      entity_type TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      PRIMARY KEY (entity_type, local_id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Initialize local ID counter if not exists
  const counter = database.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'next_local_id'"
  );
  if (!counter) {
    database.runSync(
      "INSERT INTO sync_meta (key, value) VALUES ('next_local_id', '-1')"
    );
  }
}

export function getNextLocalId(): number {
  const database = getDb();
  const row = database.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'next_local_id'"
  );
  const nextId = parseInt(row?.value ?? "-1", 10);
  database.runSync(
    "UPDATE sync_meta SET value = ? WHERE key = 'next_local_id'",
    [String(nextId - 1)]
  );
  return nextId;
}

// ─── Row Mapping Helpers ───

interface ContactRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  notes: string | null;
  property_type: string | null;
  created_at: string;
  updated_at: string;
  _local_only: number;
  _deleted: number;
}

interface ActionRow {
  id: number;
  contact_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: number;
  action_type: string;
  created_at: string;
  updated_at: string;
  _local_only: number;
  _deleted: number;
}

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status as ContactStatus,
    notes: row.notes,
    propertyType: row.property_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToAction(row: ActionRow): Action {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    completed: row.completed === 1,
    actionType: row.action_type as ActionActionType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD helpers for SQLite ───

export function getAllContacts(): Contact[] {
  const database = getDb();
  const rows = database.getAllSync<ContactRow>(
    "SELECT * FROM contacts WHERE _deleted = 0 ORDER BY created_at DESC"
  );
  return rows.map(rowToContact);
}

export function getContactById(id: number): Contact | null {
  const database = getDb();
  // Check id_map in case this is a resolved local ID
  const mapped = database.getFirstSync<{ server_id: number }>(
    "SELECT server_id FROM id_map WHERE entity_type = 'contact' AND local_id = ?",
    [id]
  );
  const resolvedId = mapped ? mapped.server_id : id;

  const row = database.getFirstSync<ContactRow>(
    "SELECT * FROM contacts WHERE id = ? AND _deleted = 0",
    [resolvedId]
  );
  return row ? rowToContact(row) : null;
}

export function insertContact(data: {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  notes?: string | null;
  propertyType?: string | null;
  localOnly: boolean;
}): Contact {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync(
    `INSERT INTO contacts (id, name, phone, email, address, latitude, longitude, status, notes, property_type, created_at, updated_at, _local_only, _deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      data.id,
      data.name,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null,
      data.latitude,
      data.longitude,
      data.status,
      data.notes ?? null,
      data.propertyType ?? null,
      now,
      now,
      data.localOnly ? 1 : 0,
    ]
  );
  return getContactById(data.id)!;
}

export function updateContactInDb(
  id: number,
  data: Record<string, unknown>
): Contact | null {
  const database = getDb();
  const now = new Date().toISOString();

  const fieldMap: Record<string, string> = {
    name: "name",
    phone: "phone",
    email: "email",
    address: "address",
    latitude: "latitude",
    longitude: "longitude",
    status: "status",
    notes: "notes",
    propertyType: "property_type",
  };

  const setClauses: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in data) {
      setClauses.push(`${dbCol} = ?`);
      values.push(data[jsKey] ?? null);
    }
  }

  values.push(id);
  database.runSync(
    `UPDATE contacts SET ${setClauses.join(", ")} WHERE id = ?`,
    values as (string | number | null)[]
  );
  return getContactById(id);
}

export function softDeleteContact(id: number): void {
  const database = getDb();
  database.runSync("UPDATE contacts SET _deleted = 1 WHERE id = ?", [id]);
  database.runSync(
    "UPDATE actions SET _deleted = 1 WHERE contact_id = ?",
    [id]
  );
}

export function getAllActions(contactId?: number): Action[] {
  const database = getDb();
  if (contactId !== undefined) {
    const rows = database.getAllSync<ActionRow>(
      "SELECT * FROM actions WHERE contact_id = ? AND _deleted = 0 ORDER BY due_date ASC",
      [contactId]
    );
    return rows.map(rowToAction);
  }
  const rows = database.getAllSync<ActionRow>(
    "SELECT * FROM actions WHERE _deleted = 0 ORDER BY due_date ASC"
  );
  return rows.map(rowToAction);
}

export function insertAction(data: {
  id: number;
  contactId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  actionType: string;
  localOnly: boolean;
}): Action {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync(
    `INSERT INTO actions (id, contact_id, title, description, due_date, completed, action_type, created_at, updated_at, _local_only, _deleted)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0)`,
    [
      data.id,
      data.contactId,
      data.title,
      data.description ?? null,
      data.dueDate ?? null,
      data.actionType,
      now,
      now,
      data.localOnly ? 1 : 0,
    ]
  );
  const row = database.getFirstSync<ActionRow>(
    "SELECT * FROM actions WHERE id = ?",
    [data.id]
  );
  return rowToAction(row!);
}

export function updateActionInDb(
  id: number,
  data: Record<string, unknown>
): Action | null {
  const database = getDb();
  const now = new Date().toISOString();

  const fieldMap: Record<string, string> = {
    title: "title",
    description: "description",
    dueDate: "due_date",
    completed: "completed",
    actionType: "action_type",
  };

  const setClauses: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in data) {
      let val = data[jsKey] ?? null;
      if (jsKey === "completed") val = val ? 1 : 0;
      setClauses.push(`${dbCol} = ?`);
      values.push(val);
    }
  }

  values.push(id);
  database.runSync(
    `UPDATE actions SET ${setClauses.join(", ")} WHERE id = ?`,
    values as (string | number | null)[]
  );
  const row = database.getFirstSync<ActionRow>(
    "SELECT * FROM actions WHERE id = ?",
    [id]
  );
  return row ? rowToAction(row) : null;
}

export function softDeleteAction(id: number): void {
  const database = getDb();
  database.runSync("UPDATE actions SET _deleted = 1 WHERE id = ?", [id]);
}

// ─── Sync helpers ───

export function upsertContactFromServer(contact: Contact): void {
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO contacts (id, name, phone, email, address, latitude, longitude, status, notes, property_type, created_at, updated_at, _local_only, _deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      contact.id,
      contact.name,
      contact.phone ?? null,
      contact.email ?? null,
      contact.address ?? null,
      contact.latitude,
      contact.longitude,
      contact.status,
      contact.notes ?? null,
      contact.propertyType ?? null,
      contact.createdAt,
      contact.updatedAt,
    ]
  );
}

export function upsertActionFromServer(action: Action): void {
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO actions (id, contact_id, title, description, due_date, completed, action_type, created_at, updated_at, _local_only, _deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      action.id,
      action.contactId,
      action.title,
      action.description ?? null,
      action.dueDate ?? null,
      action.completed ? 1 : 0,
      action.actionType,
      action.createdAt,
      action.updatedAt,
    ]
  );
}

export function removeServerDeletedContacts(serverIds: Set<number>): void {
  const database = getDb();
  const localRows = database.getAllSync<{ id: number }>(
    "SELECT id FROM contacts WHERE _local_only = 0 AND _deleted = 0"
  );
  for (const row of localRows) {
    if (!serverIds.has(row.id)) {
      // Check no pending sync for this contact
      const pending = database.getFirstSync<{ id: number }>(
        "SELECT id FROM sync_queue WHERE entity_type = 'contact' AND entity_id = ?",
        [row.id]
      );
      if (!pending) {
        database.runSync("DELETE FROM contacts WHERE id = ?", [row.id]);
      }
    }
  }
}

export function removeServerDeletedActions(serverIds: Set<number>): void {
  const database = getDb();
  const localRows = database.getAllSync<{ id: number }>(
    "SELECT id FROM actions WHERE _local_only = 0 AND _deleted = 0"
  );
  for (const row of localRows) {
    if (!serverIds.has(row.id)) {
      const pending = database.getFirstSync<{ id: number }>(
        "SELECT id FROM sync_queue WHERE entity_type = 'action' AND entity_id = ?",
        [row.id]
      );
      if (!pending) {
        database.runSync("DELETE FROM actions WHERE id = ?", [row.id]);
      }
    }
  }
}

export function getSyncMeta(key: string): string | null {
  const database = getDb();
  const row = database.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export function setSyncMeta(key: string, value: string): void {
  const database = getDb();
  database.runSync(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export function getPendingCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue"
  );
  return row?.count ?? 0;
}
