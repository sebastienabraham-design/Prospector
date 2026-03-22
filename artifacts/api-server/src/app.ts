import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigin = process.env.REPLIT_DEV_DOMAIN 
  ? (process.env.REPLIT_DEV_DOMAIN.startsWith('http') ? process.env.REPLIT_DEV_DOMAIN : `https://${process.env.REPLIT_DEV_DOMAIN}`)
  : "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
