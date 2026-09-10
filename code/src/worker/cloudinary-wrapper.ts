import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CloudinaryStorageWrapper {
  private localBackupDir: string;
  private isConfigured: boolean = false;

  constructor() {
    this.localBackupDir = path.resolve(__dirname, "../../local-storage");
    if (!fs.existsSync(this.localBackupDir)) {
      fs.mkdirSync(this.localBackupDir, { recursive: true });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhwusdhpg";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      console.log(`[Cloudinary] Configurado com cloud_name: ${cloudName}`);
    } else {
      console.warn("[Cloudinary] Credenciais incompletas no .env. Armazenamento local ativado.");
    }
  }

  private async convertToBuffer(body: any): Promise<Buffer> {
    if (Buffer.isBuffer(body)) {
      return body;
    } else if (body instanceof ArrayBuffer) {
      return Buffer.from(body);
    } else if (body instanceof Uint8Array) {
      return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === "string") {
      return Buffer.from(body, "utf-8");
    } else if (body && typeof body.arrayBuffer === "function") {
      return Buffer.from(await body.arrayBuffer());
    } else {
      return Buffer.from(await new Response(body).arrayBuffer());
    }
  }

  async put(key: string, body: any, _options?: any) {
    const buffer = await this.convertToBuffer(body);

    // Salvar backup local sempre
    const localFilePath = path.join(this.localBackupDir, key);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    fs.writeFileSync(localFilePath, buffer);

    let secureUrl: string | undefined;

    if (this.isConfigured) {
      try {
        const isVideo = key.includes("video") || key.endsWith(".webm") || key.endsWith(".mp4");
        const ext = path.extname(key);
        const baseKey = ext ? key.slice(0, -ext.length) : key;

        const uploadOptions: UploadApiOptions = {
          public_id: baseKey,
          resource_type: isVideo ? "video" : "image",
          overwrite: true,
        };

        const result = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult);
          });
          stream.end(buffer);
        });

        secureUrl = result.secure_url;
        console.log(`[Cloudinary] Upload concluído com sucesso: ${key} -> ${secureUrl}`);
      } catch (err: any) {
        console.warn(`[Cloudinary] Falha no upload para o Cloudinary (${err.message}). Mantido em backup local.`);
      }
    }

    return {
      key,
      size: buffer.length,
      etag: key,
      url: secureUrl,
    };
  }

  async get(key: string, options?: any) {
    // 1. Tentar ler do backup local primeiro
    const localFilePath = path.join(this.localBackupDir, key);
    if (fs.existsSync(localFilePath)) {
      let buffer = fs.readFileSync(localFilePath);
      if (options?.range) {
        const start = options.range.offset;
        const end = start + options.range.length - 1;
        buffer = buffer.subarray(start, end + 1);
      }

      return {
        body: new Response(buffer).body,
        size: fs.statSync(localFilePath).size,
        httpEtag: key,
        etag: key,
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        text: async () => buffer.toString("utf-8"),
      };
    }

    // 2. Se configurado no Cloudinary, tentar buscar a URL do asset
    if (this.isConfigured) {
      try {
        const isVideo = key.includes("video") || key.endsWith(".webm") || key.endsWith(".mp4");
        const ext = path.extname(key);
        const baseKey = ext ? key.slice(0, -ext.length) : key;
        const url = cloudinary.url(baseKey, { resource_type: isVideo ? "video" : "image", secure: true });

        const res = await fetch(url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          return {
            body: new Response(buffer).body,
            size: buffer.length,
            httpEtag: key,
            etag: key,
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            text: async () => buffer.toString("utf-8"),
          };
        }
      } catch (err) {
        // Arquivo não encontrado no Cloudinary
      }
    }

    return null;
  }

  async delete(key: string) {
    const localFilePath = path.join(this.localBackupDir, key);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    if (this.isConfigured) {
      try {
        const isVideo = key.includes("video") || key.endsWith(".webm") || key.endsWith(".mp4");
        const ext = path.extname(key);
        const baseKey = ext ? key.slice(0, -ext.length) : key;
        await cloudinary.uploader.destroy(baseKey, { resource_type: isVideo ? "video" : "image" });
        console.log(`[Cloudinary] Removido com sucesso: ${key}`);
      } catch (err: any) {
        console.warn(`[Cloudinary] Erro ao deletar: ${err.message}`);
      }
    }
  }

  async head(key: string) {
    const localFilePath = path.join(this.localBackupDir, key);
    if (fs.existsSync(localFilePath)) {
      const stat = fs.statSync(localFilePath);
      return {
        key,
        size: stat.size,
        etag: key,
        httpMetadata: {
          contentType: key.endsWith(".png") ? "image/png" : (key.endsWith(".webm") ? "video/webm" : "image/jpeg"),
        },
      };
    }
    return null;
  }
}
