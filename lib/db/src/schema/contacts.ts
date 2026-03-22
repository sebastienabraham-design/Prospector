import { pgTable, serial, text, doublePrecision, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "closed",
]);

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  status: contactStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  propertyType: text("property_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("contact_status_idx").on(table.status),
  index("contact_created_at_idx").on(table.createdAt),
]);

export const insertContactSchema = createInsertSchema(contactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
