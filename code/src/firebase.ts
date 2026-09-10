import { onRequest } from "firebase-functions/v2/https";
import { handle } from "@hono/node-server";
import { initializeApp } from "firebase-admin/app";
import { createClient } from "@libsql/client";
import { D1DatabaseWrapper } from "./worker/db-wrapper";
import { CloudinaryStorageWrapper } from "./worker/cloudinary-wrapper";
import app from "./worker/index";

// Initialize Firebase Admin
try {
  initializeApp();
} catch (e) {
  // Já inicializado
}

// Initialize LibSQL/Turso database client
const databaseUrl = process.env.DATABASE_URL || "libsql://checklist-brenobispobd.aws-ap-south-1.turso.io";
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || "";
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

// Middleware to inject c.env bindings
app.use("*", async (c, next) => {
  c.env = {
    ...c.env,
    ...bindings,
  };
  await next();
});

// Export Firebase Cloud Function v2
export const api = onRequest({
  cors: true,
  maxInstances: 10,
  memory: "256MiB",
}, (req, res) => {
  return handle(app)(req, res);
});
