import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import actionsRouter from "./actions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/contacts", contactsRouter);
router.use("/actions", actionsRouter);

export default router;
