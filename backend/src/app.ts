import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: any = express();

app.use(
  (pinoHttp as any)({
    logger,
    autoLogging: {
      ignore: (req: any) => req.url === "/" || req.method === "HEAD",
    },
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/", (_req: any, res: any) => res.send("OK"));
app.get("/healthz", (_req: any, res: any) => res.json({ status: "ok" }));
app.use("/api", router);
app.use("/", router); // Fallback for Vercel if /api is stripped from req.url

export default app;
