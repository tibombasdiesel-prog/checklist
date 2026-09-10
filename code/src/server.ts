import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createClient } from "@libsql/client";
import { D1DatabaseWrapper } from "./worker/db-wrapper";
import { CloudinaryStorageWrapper } from "./worker/cloudinary-wrapper";
import workerApp from "./worker/index";
import { cors } from "hono/cors";
import dotenv from "dotenv";

dotenv.config();

const defaultUrl = "https://checklist-brenobispobd.aws-ap-south-1.turso.io";
const defaultToken =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkwNDE3NjcsImlkIjoiMDFhMDhiMzItMTUwMS03ZjlhLWI3NjYtZThiM2FmMGNkZDNjIiwia2lkIjoidW5KcEFTa2JnRnlaNkpuR293dlJqUm02amlxZXZ0aE5QZDNyZk81NDFTcyIsInJpZCI6ImFiYjQ5M2E1LThhY2UtNGQ3NS04YjlmLTYzMmU2NTFkZmMyOSJ9.vdvDOOT-gR6XyFkV7aEtCtMNzZkgb-Qx-Cr-nUSAg480ruRYKDKUXcb6TQ2lDC28e_24JqmFITb8MFrQKK1QAg";

const databaseUrl = defaultUrl;
const databaseAuthToken = defaultToken;

console.log(`[Database] Conectando a: ${databaseUrl}`);

const rawDbClient = createClient({
  url: databaseUrl,
  authToken: databaseAuthToken,
});
const dbWrapper = new D1DatabaseWrapper(rawDbClient);

const storageWrapper = new CloudinaryStorageWrapper();

const bindings = {
  DB: dbWrapper as any,
  R2_BUCKET: storageWrapper as any,
  JWT_SECRET: process.env.JWT_SECRET || "2233",
};

const mainApp = new Hono();

// CORS — permite requisições do Firebase Hosting e localhost em dev
mainApp.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        /^https:\/\/.*\.web\.app$/,
        /^https:\/\/.*\.firebaseapp\.com$/,
        /^http:\/\/localhost(:\d+)?$/,
        /^https:\/\/.*\.onrender\.com$/,
      ];
      if (!origin || allowed.some((r) => r.test(origin))) return origin ?? "*";
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Inject bindings BEFORE routing
mainApp.use("*", async (c, next) => {
  c.env = { ...c.env, ...bindings };
  await next();
});

// Mount worker app routes
mainApp.route("/", workerApp);

const port = parseInt(process.env.PORT || "3001", 10);
console.log(`[Backend] Servidor rodando na porta ${port}`);

serve({
  fetch: (req) => mainApp.fetch(req, bindings),
  port,
});
