import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";
import { CreateContactBody, UpdateContactBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatContact(contact: typeof contactsTable.$inferSelect) {
  return {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const contacts = await db.select().from(contactsTable).orderBy(contactsTable.createdAt).limit(limit).offset(offset);
    res.json(contacts.map(formatContact));
  } catch (err) {
    req.log.error({ err }, "Failed to list contacts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateContactBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [contact] = await db.insert(contactsTable).values({
      ...parsed.data,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      propertyType: parsed.data.propertyType ?? null,
    }).returning();
    res.status(201).json(formatContact(contact));
  } catch (err) {
    req.log.error({ err }, "Failed to create contact");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, id));
    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json(formatContact(contact));
  } catch (err) {
    req.log.error({ err }, "Failed to get contact");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const parsed = UpdateContactBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [contact] = await db.update(contactsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json(formatContact(contact));
  } catch (err) {
    req.log.error({ err }, "Failed to update contact");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete contact");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
