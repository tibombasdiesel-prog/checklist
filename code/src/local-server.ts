import { serve } from "@hono/node-server";
import { createClient } from "@libsql/client";
import { D1DatabaseWrapper } from "./worker/db-wrapper";
import app from "./worker/index";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the code or root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Mock storage using local file system for development
class LocalStorageMock {
  private baseDir = path.resolve(__dirname, "../local-storage");

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async put(key: string, body: any, options?: any) {
    const filePath = path.join(this.baseDir, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    let buffer: Buffer;

    if (body instanceof ArrayBuffer) {
      buffer = Buffer.from(body);
    } else if (body instanceof Uint8Array) {
      buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === 'string') {
      buffer = Buffer.from(body, 'utf-8');
    } else if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (body && typeof body.arrayBuffer === 'function') {
      buffer = Buffer.from(await body.arrayBuffer());
    } else {
      buffer = Buffer.from(await new Response(body).arrayBuffer());
    }

    fs.writeFileSync(filePath, buffer);
    console.log(`[Storage Mock] Saved ${key} (${buffer.length} bytes)`);

    return {
      key,
      size: buffer.length,
      etag: key
    };
  }

  async get(key: string, options?: any) {
    const filePath = path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    let buffer = fs.readFileSync(filePath);
    console.log(`[Storage Mock] Reading ${key}`);

    if (options?.range) {
      const start = options.range.offset;
      const end = start + options.range.length - 1;
      buffer = buffer.subarray(start, end + 1);
    }

    return {
      body: new Response(buffer).body,
      size: fs.statSync(filePath).size,
      httpEtag: key,
      etag: key,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      text: async () => buffer.toString('utf-8')
    };
  }

  async delete(key: string) {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Storage Mock] Deleted ${key}`);
    }
  }

  async head(key: string) {
    const filePath = path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = fs.statSync(filePath);
    return {
      key,
      size: stat.size,
      etag: key,
      httpMetadata: {
        contentType: key.endsWith('.png') ? 'image/png' : 'image/jpeg'
      }
    };
  }
}

import { CloudinaryStorageWrapper } from "./worker/cloudinary-wrapper";

// Database client: Turso or local SQLite
const databaseUrl = process.env.DATABASE_URL || `file:${path.resolve(__dirname, "../checklist.db")}`;
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || "";

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

// Middleware to inject bindings into Hono context
app.use("*", async (c, next) => {
  c.env = {
    ...c.env,
    ...bindings,
  };
  await next();
});

const port = 3001;
console.log(`[Backend] Local server running at http://localhost:${port}`);
serve({
  fetch: (req) => app.fetch(req, bindings),
  port,
});


