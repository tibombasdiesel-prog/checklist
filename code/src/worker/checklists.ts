import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken } from "./auth";
import { createNotification } from "./notifications";
import type { CreateChecklistRequest, Checklist, ChecklistPhoto } from "../shared/checklist-types";
import type { Env, Variables } from "./types";

const SESSION_COOKIE_NAME = "checklist_session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to verify authentication for checklist routes
app.use("/api/checklists*", async (c, next) => {
  let token = getCookie(c, SESSION_COOKIE_NAME);
  const authHeader = c.req.header("Authorization");
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("userId", payload.userId);
  c.set("isAdmin", payload.isAdmin);
  await next();
});

// Create a new checklist
app.post("/api/checklists", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json<CreateChecklistRequest>();

    const { equipment_category, vehicle_type, brand_model, license_plate, odometer, equipment_identifier, initial_observations } = body;

    if (!vehicle_type || !brand_model) {
      return c.json({ error: "Missing required fields (vehicle_type, brand_model)" }, 400);
    }

    const category = equipment_category || 'vehicle';

    // For vehicles, license_plate and odometer are required
    if (category === 'vehicle') {
      if (!license_plate || odometer === undefined) {
        return c.json({ error: "Missing required fields for vehicles (license_plate, odometer)" }, 400);
      }
      if (typeof odometer !== 'number' || odometer < 0) {
        return c.json({ error: "Odometer must be a positive number" }, 400);
      }
    }

    // For machinery, use empty string for license_plate since column is NOT NULL
    const result = await c.env.DB.prepare(
      `INSERT INTO checklists (user_id, equipment_category, vehicle_type, brand_model, license_plate, odometer, equipment_identifier, initial_observations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId, 
      category, 
      vehicle_type, 
      brand_model, 
      license_plate || '', 
      odometer ?? null, 
      equipment_identifier || null, 
      initial_observations || null
    ).run();

    const checklistId = result.meta.last_row_id;

    return c.json({ id: checklistId, message: "Checklist created successfully" }, 201);
  } catch (error) {
    console.error("Error creating checklist:", error);
    return c.json({ error: "Failed to create checklist" }, 500);
  }
});

// Update vehicle info for a checklist
app.put("/api/checklists/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");
    const checklistId = parseInt(c.req.param("id"));
    const body = await c.req.json<Partial<CreateChecklistRequest>>();

    // Admins can edit any checklist (even completed ones)
    // Regular users can only edit their own incomplete checklists
    let checklist: Checklist | null;
    
    if (isAdmin) {
      checklist = await c.env.DB.prepare(
        "SELECT * FROM checklists WHERE id = ?"
      ).bind(checklistId).first<Checklist>();
    } else {
      checklist = await c.env.DB.prepare(
        "SELECT * FROM checklists WHERE id = ? AND user_id = ?"
      ).bind(checklistId, userId).first<Checklist>();
    }

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    // Only admins can edit completed checklists
    if (checklist.is_completed && !isAdmin) {
      return c.json({ error: "Cannot modify completed checklist" }, 403);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.equipment_category) {
      updates.push("equipment_category = ?");
      values.push(body.equipment_category);
    }
    if (body.vehicle_type) {
      updates.push("vehicle_type = ?");
      values.push(body.vehicle_type);
    }
    if (body.brand_model) {
      updates.push("brand_model = ?");
      values.push(body.brand_model);
    }
    if (body.license_plate !== undefined) {
      updates.push("license_plate = ?");
      values.push(body.license_plate ? body.license_plate.toUpperCase() : null);
    }
    if (body.odometer !== undefined) {
      if (body.odometer !== null && (typeof body.odometer !== 'number' || body.odometer < 0)) {
        return c.json({ error: "Odometer must be a positive number" }, 400);
      }
      updates.push("odometer = ?");
      values.push(body.odometer);
    }
    if (body.equipment_identifier !== undefined) {
      updates.push("equipment_identifier = ?");
      values.push(body.equipment_identifier || null);
    }
    if (body.initial_observations !== undefined) {
      updates.push("initial_observations = ?");
      values.push(body.initial_observations || null);
    }

    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(checklistId);

    await c.env.DB.prepare(
      `UPDATE checklists SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ message: "Checklist updated successfully" });
  } catch (error) {
    console.error("Error updating checklist:", error);
    return c.json({ error: "Failed to update checklist" }, 500);
  }
});

// Upload a photo for a checklist
app.post("/api/checklists/:id/photos", async (c) => {
  try {
    const userId = c.get("userId");
    const checklistId = parseInt(c.req.param("id"));
    
    const formData = await c.req.formData();
    const photoType = formData.get("photo_type") as string;
    const file = formData.get("photo") as File;

    if (!file || !photoType) {
      return c.json({ error: "Missing photo or photo_type" }, 400);
    }

    // Verify checklist belongs to user
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ? AND user_id = ?"
    ).bind(checklistId, userId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    if (checklist.is_completed) {
      return c.json({ error: "Cannot modify completed checklist" }, 403);
    }

    // Generate R2 key
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const r2Key = `checklists/${checklistId}/${photoType}-${timestamp}.${extension}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'image/jpeg',
      },
    });

    // Save to database
    await c.env.DB.prepare(
      `INSERT INTO checklist_photos (checklist_id, photo_type, r2_key)
       VALUES (?, ?, ?)`
    ).bind(checklistId, photoType, r2Key).run();

    return c.json({ message: "Photo uploaded successfully", r2_key: r2Key }, 201);
  } catch (error) {
    console.error("Error uploading photo:", error);
    return c.json({ error: "Failed to upload photo" }, 500);
  }
});

// Upload video for a checklist
app.post("/api/checklists/:id/video", async (c) => {
  try {
    const userId = c.get("userId");
    const checklistId = parseInt(c.req.param("id"));
    
    const formData = await c.req.formData();
    const file = formData.get("video") as File;
    const durationSeconds = formData.get("duration_seconds") as string;

    if (!file) {
      return c.json({ error: "Missing video file" }, 400);
    }

    // Verify checklist belongs to user
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ? AND user_id = ?"
    ).bind(checklistId, userId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    if (checklist.is_completed) {
      return c.json({ error: "Cannot modify completed checklist" }, 403);
    }

    // Generate R2 key
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'webm';
    const r2Key = `checklists/${checklistId}/video-360-${timestamp}.${extension}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'video/webm',
      },
    });

    // Save to database
    await c.env.DB.prepare(
      `INSERT INTO checklist_videos (checklist_id, r2_key, duration_seconds)
       VALUES (?, ?, ?)`
    ).bind(checklistId, r2Key, durationSeconds ? parseInt(durationSeconds) : null).run();

    return c.json({ message: "Video uploaded successfully", r2_key: r2Key }, 201);
  } catch (error) {
    console.error("Error uploading video:", error);
    return c.json({ error: "Failed to upload video" }, 500);
  }
});

// Upload signature for a checklist
app.post("/api/checklists/:id/signature", async (c) => {
  try {
    const userId = c.get("userId");
    const checklistId = parseInt(c.req.param("id"));
    
    const formData = await c.req.formData();
    const signatureType = formData.get("signature_type") as string; // 'client' or 'collaborator'
    const file = formData.get("signature") as File;

    if (!file || !signatureType) {
      return c.json({ error: "Missing signature or signature_type" }, 400);
    }

    // Verify checklist belongs to user
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ? AND user_id = ?"
    ).bind(checklistId, userId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    if (checklist.is_completed) {
      return c.json({ error: "Cannot modify completed checklist" }, 403);
    }

    // Generate R2 key
    const timestamp = Date.now();
    const r2Key = `checklists/${checklistId}/signature-${signatureType}-${timestamp}.png`;

    // Upload to R2
    await c.env.R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    // Update checklist with signature key
    const field = signatureType === 'client' ? 'client_signature_key' : 'collaborator_signature_key';
    await c.env.DB.prepare(
      `UPDATE checklists SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(r2Key, checklistId).run();

    return c.json({ message: "Signature uploaded successfully", r2_key: r2Key }, 201);
  } catch (error) {
    console.error("Error uploading signature:", error);
    return c.json({ error: "Failed to upload signature" }, 500);
  }
});

// Complete a checklist
app.post("/api/checklists/:id/complete", async (c) => {
  try {
    const userId = c.get("userId");
    const checklistId = parseInt(c.req.param("id"));

    console.log(`[Checklist] Tentando completar checklist ${checklistId} por usuário ${userId}`);

    // Verify checklist belongs to user
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ? AND user_id = ?"
    ).bind(checklistId, userId).first<Checklist>();

    if (!checklist) {
      console.log(`[Checklist] ❌ Checklist ${checklistId} não encontrado para usuário ${userId}`);
      return c.json({ error: "Checklist not found" }, 404);
    }

    console.log(`[Checklist] Checklist encontrado:`, {
      id: checklist.id,
      is_completed: checklist.is_completed,
      client_signature: !!checklist.client_signature_key,
      collaborator_signature: !!checklist.collaborator_signature_key,
      vehicle_type: checklist.vehicle_type
    });

    if (checklist.is_completed) {
      console.log(`[Checklist] ❌ Checklist ${checklistId} já está completo`);
      return c.json({ error: "Checklist already completed" }, 400);
    }

    // Verify all required data is present
    if (!checklist.client_signature_key || !checklist.collaborator_signature_key) {
      console.log(`[Checklist] ❌ Faltam assinaturas - Cliente: ${!!checklist.client_signature_key}, Colaborador: ${!!checklist.collaborator_signature_key}`);
      return c.json({ error: "Both signatures are required" }, 400);
    }

    // Verify required photos are present
    const photos = await c.env.DB.prepare(
      "SELECT photo_type FROM checklist_photos WHERE checklist_id = ?"
    ).bind(checklistId).all<ChecklistPhoto>();

    const requiredPhotos = checklist.vehicle_type === 'light' 
      ? ['front', 'back', 'left', 'right', 'roof']
      : ['front', 'back', 'left', 'right'];

    const photoTypes = new Set(photos.results.map(p => p.photo_type));
    const missingPhotos = requiredPhotos.filter(type => !photoTypes.has(type as any));

    console.log(`[Checklist] Fotos - Necessárias: ${requiredPhotos.join(', ')}, Presentes: ${Array.from(photoTypes).join(', ')}`);

    if (missingPhotos.length > 0) {
      console.log(`[Checklist] ❌ Faltam fotos: ${missingPhotos.join(', ')}`);
      return c.json({ error: `Missing photos: ${missingPhotos.join(', ')}` }, 400);
    }

    // Mark as completed
    await c.env.DB.prepare(
      "UPDATE checklists SET is_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(checklistId).run();

    console.log(`[Checklist] Checklist ${checklistId} marcado como completo`);

    // Get user info for notification
    const user = await c.env.DB.prepare(
      "SELECT name FROM users WHERE id = ?"
    ).bind(userId).first<{ name: string }>();

    console.log(`[Checklist] Usuário criador:`, user);

    // Notify reception users
    // Notify reception users
    const receptionUsers = await c.env.DB.prepare(
      "SELECT id FROM users WHERE role = 'recepcao'"
    ).all<{ id: number }>();

    const notificationMessage = `Novo checklist completo: ${checklist.brand_model} ${checklist.license_plate || checklist.equipment_identifier || ''} - aguardando abertura de O.S.`;
    
    for (const receptionUser of receptionUsers.results) {
      await createNotification(
        c.env.DB,
        receptionUser.id,
        checklistId,
        'checklist_completed',
        notificationMessage
      );
    }

    return c.json({ message: "Checklist completed successfully" });
  } catch (error) {
    console.error("Error completing checklist:", error);
    return c.json({ error: "Failed to complete checklist" }, 500);
  }
});

// Get user's checklists (all collaborators can see all checklists)
app.get("/api/checklists", async (c) => {
  try {
    const query = `
      SELECT 
        c.*, 
        u.name as user_name,
        COUNT(DISTINCT cp.id) as photo_count,
        COUNT(DISTINCT cv.id) as video_count
      FROM checklists c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN checklist_photos cp ON c.id = cp.checklist_id
      LEFT JOIN checklist_videos cv ON c.id = cv.checklist_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const result = await c.env.DB.prepare(query).all();

    return c.json({ checklists: result.results });
  } catch (error) {
    console.error("Error fetching checklists:", error);
    return c.json({ error: "Failed to fetch checklists" }, 500);
  }
});

// Get a single checklist with photos (all collaborators can view)
app.get("/api/checklists/:id", async (c) => {
  try {
    const checklistId = parseInt(c.req.param("id"));

    const checklist = await c.env.DB.prepare(
      `SELECT c.*, u.name as user_name 
       FROM checklists c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`
    ).bind(checklistId).first();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    // Get photos
    const photos = await c.env.DB.prepare(
      "SELECT * FROM checklist_photos WHERE checklist_id = ?"
    ).bind(checklistId).all();

    // Get videos
    const videos = await c.env.DB.prepare(
      "SELECT * FROM checklist_videos WHERE checklist_id = ?"
    ).bind(checklistId).all();

    return c.json({ 
      checklist: {
        ...checklist,
        photos: photos.results,
        videos: videos.results
      }
    });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return c.json({ error: "Failed to fetch checklist" }, 500);
  }
});

// Delete a checklist (admin only)
app.delete("/api/checklists/:id", async (c) => {
  try {
    const userId = c.get("userId");
    let isAdmin = c.get("isAdmin");
    const checklistId = parseInt(c.req.param("id"));

    if (!isAdmin && userId) {
      const user = await c.env.DB.prepare(
        "SELECT is_admin, role FROM users WHERE id = ?"
      ).bind(userId).first<{ is_admin: number | boolean; role: string }>();
      if (user && (user.is_admin === 1 || user.is_admin === true || user.role === "admin")) {
        isAdmin = true;
      }
    }

    // Only admins can delete checklists
    if (!isAdmin) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    // Verify checklist exists
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ?"
    ).bind(checklistId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    // Get all photos and videos to delete from R2
    const photos = await c.env.DB.prepare(
      "SELECT r2_key FROM checklist_photos WHERE checklist_id = ?"
    ).bind(checklistId).all();

    const videos = await c.env.DB.prepare(
      "SELECT r2_key FROM checklist_videos WHERE checklist_id = ?"
    ).bind(checklistId).all();

    // Delete all files from R2
    const r2Keys = [
      ...photos.results.map((p: any) => p.r2_key),
      ...videos.results.map((v: any) => v.r2_key),
    ];

    if (checklist.client_signature_key) {
      r2Keys.push(checklist.client_signature_key);
    }

    if (checklist.collaborator_signature_key) {
      r2Keys.push(checklist.collaborator_signature_key);
    }

    // Delete files from storage
    await Promise.all(
      r2Keys.filter(Boolean).map(key => c.env.R2_BUCKET.delete(key).catch(() => {}))
    );

    // Delete from database (including notifications to prevent FK errors)
    await c.env.DB.prepare("DELETE FROM notifications WHERE checklist_id = ?").bind(checklistId).run().catch(() => {});
    await c.env.DB.prepare("DELETE FROM checklist_photos WHERE checklist_id = ?").bind(checklistId).run();
    await c.env.DB.prepare("DELETE FROM checklist_videos WHERE checklist_id = ?").bind(checklistId).run();
    await c.env.DB.prepare("DELETE FROM checklists WHERE id = ?").bind(checklistId).run();

    return c.json({ message: "Checklist deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting checklist:", error);
    return c.json({ error: error?.message || "Failed to delete checklist" }, 500);
  }
});

// Get a photo or signature from R2 (all collaborators can view)
// Supports Range requests for video streaming
app.get("/api/files/:checklistId/:filename", async (c) => {
  try {
    const checklistId = parseInt(c.req.param("checklistId"));
    const filename = c.req.param("filename");

    // Verify checklist exists
    const checklist = await c.env.DB.prepare(
      "SELECT id FROM checklists WHERE id = ?"
    ).bind(checklistId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    const r2Key = `checklists/${checklistId}/${filename}`;
    
    // Check for Range header (required for video streaming)
    const rangeHeader = c.req.header("Range");
    
    // Determine content type from filename
    const isVideo = filename.includes('video') || filename.endsWith('.webm') || filename.endsWith('.mp4');
    const contentType = isVideo 
      ? (filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm')
      : filename.endsWith('.png') 
        ? 'image/png' 
        : 'image/jpeg';

    if (rangeHeader && isVideo) {
      // Handle Range request for video streaming
      // First, get object metadata to know the size
      const headObject = await c.env.R2_BUCKET.head(r2Key);
      
      if (!headObject) {
        return c.json({ error: "File not found" }, 404);
      }

      const fileSize = headObject.size;
      const range = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(range[0], 10);
      const end = range[1] ? parseInt(range[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // Get the specific range from R2
      const object = await c.env.R2_BUCKET.get(r2Key, {
        range: { offset: start, length: chunkSize }
      });

      if (!object) {
        return c.json({ error: "File not found" }, 404);
      }

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Length", chunkSize.toString());
      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=31536000");

      return new Response(object.body, {
        status: 206,
        headers
      });
    }

    // Non-range request (images or full video)
    const object = await c.env.R2_BUCKET.get(r2Key);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", object.size.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=31536000");
    headers.set("etag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error fetching file:", error);
    return c.json({ error: "Failed to fetch file" }, 500);
  }
});

// Toggle O.S. ready status (reception and admin)
app.patch("/api/checklists/:id/os-ready", async (c) => {
  try {
    const checklistId = parseInt(c.req.param("id"));
    
    // Get user info
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");
    const user = await c.env.DB.prepare(
      "SELECT role FROM users WHERE id = ?"
    ).bind(userId).first<{ role: string }>();

    // Only reception users and admins can toggle O.S. status
    if (user?.role !== 'recepcao' && !isAdmin) {
      return c.json({ error: "Only reception users or admins can mark O.S. as ready" }, 403);
    }

    // Verify checklist exists
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ?"
    ).bind(checklistId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    if (!checklist.is_completed) {
      return c.json({ error: "Cannot mark O.S. as ready for incomplete checklist" }, 400);
    }

    // Toggle O.S. ready status
    const newStatus = checklist.os_ready ? 0 : 1;
    await c.env.DB.prepare(
      "UPDATE checklists SET os_ready = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newStatus, checklistId).run();

    return c.json({ 
      message: newStatus ? "O.S. marked as ready" : "O.S. marked as not ready",
      os_ready: newStatus === 1
    });
  } catch (error) {
    console.error("Error toggling O.S. status:", error);
    return c.json({ error: "Failed to toggle O.S. status" }, 500);
  }
});

// Mark OS as opened (reception and admin)
app.post("/api/checklists/:id/mark-os-opened", async (c) => {
  try {
    const checklistId = parseInt(c.req.param("id"));
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");
    
    const body = await c.req.json<{ os_number?: string }>();

    // Get user info
    const user = await c.env.DB.prepare(
      "SELECT role, name FROM users WHERE id = ?"
    ).bind(userId).first<{ role: string; name: string }>();

    // Only reception users and admins can mark OS as opened
    if (user?.role !== 'recepcao' && !isAdmin) {
      return c.json({ error: "Only reception users or admins can mark OS as opened" }, 403);
    }

    // Verify checklist exists and is completed
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM checklists WHERE id = ?"
    ).bind(checklistId).first<Checklist>();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    if (!checklist.is_completed) {
      return c.json({ error: "Cannot mark OS as opened for incomplete checklist" }, 400);
    }

    // Update checklist with OS opened info
    await c.env.DB.prepare(
      `UPDATE checklists 
       SET os_opened_at = CURRENT_TIMESTAMP, 
           os_opened_by_user_id = ?,
           os_number = ?,
           os_ready = 1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    ).bind(userId, body.os_number || null, checklistId).run();

    console.log(`[OS] OS aberta para checklist ${checklistId} por usuário ${userId}`);

    // Notify the checklist creator
    const notificationMessage = `O.S. aberta para seu checklist: ${checklist.brand_model} ${checklist.license_plate || checklist.equipment_identifier || ''}`;
    await createNotification(
      c.env.DB,
      checklist.user_id,
      checklistId,
      'os_opened',
      notificationMessage
    );

    return c.json({ 
      message: "OS marked as opened successfully",
      os_opened_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error marking OS as opened:", error);
    return c.json({ error: "Failed to mark OS as opened" }, 500);
  }
});

export default app;
