import { serve } from "@hono/node-server";
import { createClient } from "@libsql/client";
import { D1DatabaseWrapper } from "./worker/db-wrapper";
import { CloudinaryStorageWrapper } from "./worker/cloudinary-wrapper";
import app from "./worker/index";
import { cors } from "hono/cors";
import dotenv from "dotenv";

dotenv.config();

// CORS — permite requisições do Firebase Hosting e localhost em dev
app.use(
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

// Initialize LibSQL/Turso database client
const databaseUrl =
  process.env.DATABASE_URL ||
  "libsql://checklist-brenobispobd.aws-ap-south-1.turso.io";
const databaseAuthToken =
  process.env.DATABASE_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkwNDE3NjcsImlkIjoiMDFhMDhiMzItMTUwMS03ZjlhLWI3NjYtZThiM2FmMGNkZDNjIiwia2lkIjoidW5KcEFTa2JnRnlaNkpuR293dlJqUm02amlxZXZ0aE5QZDNyZk81NDFTcyIsInJpZCI6ImFiYjQ5M2E1LThhY2UtNGQ3NS04YjlmLTYzMmU2NTFkZmMyOSJ9.vdvDOOT-gR6XyFkV7aEtCtMNzZkgb-Qx-Cr-nUSAg480ruRYKDKUXcb6TQ2lDC28e_24JqmFITb8MFrQKK1QAg";

console.log(`[Database] Conectando a: ${databaseUrl}`);

const rawDbClient = createClient({
  url: databaseUrl,
  authToken: databaseAuthToken,
});
const dbWrapper = new D1DatabaseWrapper(rawDbClient);

// Initialize Cloudinary Storage wrapper
const storageWrapper = new CloudinaryStorageWrapper();

const bindings = {
  DB: dbWrapper as any,
  R2_BUCKET: storageWrapper as any,
  JWT_SECRET: process.env.JWT_SECRET || "2233",
};

// Inject bindings into every request context
app.use("*", async (c, next) => {
  c.env = { ...c.env, ...bindings };
  await next();
});

const port = parseInt(process.env.PORT || "3001", 10);
console.log(`[Backend] Servidor rodando na porta ${port}`);

serve({
  fetch: (req) => app.fetch(req, bindings),
  port,
});
