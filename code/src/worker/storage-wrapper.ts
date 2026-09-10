import type { Bucket } from "@google-cloud/storage";

export class R2BucketWrapper {
  private bucket: Bucket;

  constructor(bucket: Bucket) {
    this.bucket = bucket;
  }

  async put(key: string, body: any, options?: any) {
    const file = this.bucket.file(key);
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
      // Stream or other types
      buffer = Buffer.from(await new Response(body).arrayBuffer());
    }

    const contentType = options?.customMetadata?.contentType || options?.httpMetadata?.contentType;
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: options?.customMetadata || {}
      }
    });

    return {
      key,
      size: buffer.length,
      etag: key // use key as a mock etag
    };
  }

  async get(key: string, options?: any) {
    const file = this.bucket.file(key);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }

    let buffer: Buffer;
    if (options?.range) {
      const start = options.range.offset;
      const end = start + options.range.length - 1;
      [buffer] = await file.download({ start, end });
    } else {
      [buffer] = await file.download();
    }

    const [metadata] = await file.getMetadata();

    return {
      body: new Response(buffer).body,
      size: Number(metadata.size),
      httpEtag: key,
      etag: key,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      text: async () => buffer.toString('utf-8')
    };
  }

  async delete(key: string) {
    const file = this.bucket.file(key);
    try {
      await file.delete();
    } catch (e: any) {
      // Ignore 404 not found errors
      if (e.code !== 404) {
        throw e;
      }
    }
  }

  async head(key: string) {
    const file = this.bucket.file(key);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    const [metadata] = await file.getMetadata();
    return {
      key,
      size: Number(metadata.size),
      etag: key,
      httpMetadata: {
        contentType: metadata.contentType
      },
      customMetadata: metadata.metadata
    };
  }
}
