import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, actionsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const actionTypeValues = ["call", "visit", "email", "meeting", "other"] as const;

const createActionSchema = z.object({
  contactId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullish(),
  dueDate: z.string().nullish(),
  actionType: z.enum(actionTypeValues).default("call"),
});

const updateActionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  dueDate: z.string().nullish(),
  completed: z.boolean().optional(),
  actionType: z.enum(actionTypeValues).optional(),
});

function formatAction(action: typeof actionsTable.$inferSelect) {
  return {
    ...action,
    dueDate: action.dueDate ? action.dueDate.toISOString() : null,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
    let query = db.select().from(actionsTable).$dynamic();
    if (contactId && !isNaN(contactId)) {
      query = query.where(eq(actionsTable.contactId, contactId));
    }
    const actions = await query.orderBy(actionsTable.dueDate);
    res.json(actions.map(formatAction));
  } catch (err) {
    req.log.error({ err }, "Failed to list actions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = createActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [action] = await db.insert(actionsTable).values({
      contactId: parsed.data.contactId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      actionType: parsed.data.actionType,
    }).returning();
    res.status(201).json(formatAction(action));
  } catch (err) {
    req.log.error({ err }, "Failed to create action");
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
    const parsed = updateActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.dueDate !== undefined) {
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    }
    const [action] = await db.update(actionsTable)
      .set(data)
      .where(eq(actionsTable.id, id))
      .returning();
    if (!action) {
      res.status(404).json({ error: "Action not found" });
      return;
    }
    res.json(formatAction(action));
  } catch (err) {
    req.log.error({ err }, "Failed to update action");
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
    await db.delete(actionsTable).where(eq(actionsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete action");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
