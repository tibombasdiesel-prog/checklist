import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken } from "./auth";
import type { Env, Variables } from "./types";

const SESSION_COOKIE_NAME = "checklist_session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to verify authentication
app.use("*", async (c, next) => {
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

// Create a new fleet checklist
app.post("/api/fleet-checklists", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json<{
      checklistType: string;
      driverName: string;
      inspectionDate: string;
      vehicleId: number;
      company: string;
      kmReading: number;
      interiorClean: boolean;
      leftPhotoKey: string;
      rightPhotoKey: string;
      frontPhotoKey: string;
      rearPhotoKey: string;
      interiorPhotoKey: string;
      leftDamageMarks: Array<{
        id: string;
        x: number;
        y: number;
        description: string;
      }>;
      rightDamageMarks: Array<{
        id: string;
        x: number;
        y: number;
        description: string;
      }>;
      frontDamageMarks: Array<{
        id: string;
        x: number;
        y: number;
        description: string;
      }>;
      rearDamageMarks: Array<{
        id: string;
        x: number;
        y: number;
        description: string;
      }>;
      generalState: {
        cleanliness: { ok: boolean; problems: boolean };
        tires: { ok: boolean; problems: boolean };
        fuel: { ok: boolean; problems: boolean };
        documentation: { ok: boolean; problems: boolean };
      };
      lights: {
        front: { ok: boolean; problems: boolean };
        rear: { ok: boolean; problems: boolean };
      };
      safety: {
        seatbelt: { ok: boolean; problems: boolean };
        extinguisher: { ok: boolean; problems: boolean };
        triangle: { ok: boolean; problems: boolean };
        jack: { ok: boolean; problems: boolean };
      };
      engine: {
        oil: { ok: boolean; problems: boolean };
        brakes: { ok: boolean; problems: boolean };
        battery: { ok: boolean; problems: boolean };
        radiator: { ok: boolean; problems: boolean };
      };
      finalObservations: string;
      driverSignature?: string;
      inspectorSignature?: string;
    }>();

    const {
      checklistType,
      driverName,
      inspectionDate,
      vehicleId,
      company,
      kmReading,
      interiorClean,
      leftPhotoKey,
      rightPhotoKey,
      frontPhotoKey,
      rearPhotoKey,
      interiorPhotoKey,
      leftDamageMarks,
      rightDamageMarks,
      frontDamageMarks,
      rearDamageMarks,
      generalState,
      lights,
      safety,
      engine,
      finalObservations,
      driverSignature,
      inspectorSignature,
    } = body;

    if (!driverName || !vehicleId || !company) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Signatures are now uploaded separately via temp-signature endpoint
    // The frontend sends R2 keys directly
    const driverSigKey = driverSignature || null;
    const inspectorSigKey = inspectorSignature || null;

    // Determine which KM column to use based on checklist type
    const kmInitial = checklistType === 'saida' ? kmReading : null;
    const kmFinal = checklistType === 'entrada' ? kmReading : null;

    // Save main checklist
    const result = await c.env.DB.prepare(
      `INSERT INTO fleet_checklists 
       (user_id, checklist_type, driver_name, inspection_date, vehicle_id, company, 
        km_initial, km_final, interior_clean_approved,
        left_side_photo_key, right_side_photo_key, front_photo_key, rear_photo_key, interior_photo_key,
        general_condition, rear_lights, front_lights, safety_items, motor_items, observations,
        driver_signature_key, inspector_signature_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      checklistType,
      driverName,
      inspectionDate,
      vehicleId,
      company,
      kmInitial,
      kmFinal,
      interiorClean ? 1 : 0,
      leftPhotoKey,
      rightPhotoKey,
      frontPhotoKey,
      rearPhotoKey,
      interiorPhotoKey,
      JSON.stringify(generalState),
      JSON.stringify(lights.rear),
      JSON.stringify(lights.front),
      JSON.stringify(safety),
      JSON.stringify(engine),
      finalObservations,
      driverSigKey,
      inspectorSigKey
    ).run();

    const checklistId = result.meta.last_row_id;

    // Save damage marks for each side
    const allDamageMarks = [
      ...leftDamageMarks.map(m => ({ ...m, side: 'left' })),
      ...rightDamageMarks.map(m => ({ ...m, side: 'right' })),
      ...frontDamageMarks.map(m => ({ ...m, side: 'front' })),
      ...rearDamageMarks.map(m => ({ ...m, side: 'rear' })),
    ];

    for (const mark of allDamageMarks) {
      await c.env.DB.prepare(
        `INSERT INTO fleet_damage_marks 
         (checklist_id, vehicle_side, x_position, y_position, observation)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        checklistId,
        mark.side,
        mark.x,
        mark.y,
        mark.description
      ).run();
    }

    return c.json({ 
      id: checklistId, 
      message: "Fleet checklist created successfully" 
    }, 201);
  } catch (error) {
    console.error("Error creating fleet checklist:", error);
    return c.json({ error: "Failed to create fleet checklist" }, 500);
  }
});

// Upload temporary photo to R2
app.post("/api/fleet-checklists/temp-photo", async (c) => {
  try {
    const formData = await c.req.formData();
    const photo = formData.get("photo");
    const type = formData.get("type");

    if (!photo || !(photo instanceof File)) {
      return c.json({ error: "No photo file provided" }, 400);
    }

    const validTypes = ["left", "right", "front", "rear", "interior"];
    if (!type || !validTypes.includes(type as string)) {
      return c.json({ error: "Invalid photo type" }, 400);
    }

    // Read the file as array buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Determine content type
    const contentType = photo.type || "image/jpeg";

    // Generate unique key for R2
    const timestamp = Date.now();
    const extension = photo.name.split('.').pop() || 'jpg';
    const key = `fleet-photos/${timestamp}-${type}.${extension}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, buffer, {
      httpMetadata: { contentType },
    });

    console.log(`[Fleet Photo] Uploaded ${type} photo to R2: ${key}`);

    return c.json({ key, success: true });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return c.json({ error: "Failed to upload photo" }, 500);
  }
});

// Upload temporary signature to R2
app.post("/api/fleet-checklists/temp-signature", async (c) => {
  try {
    const formData = await c.req.formData();
    const signature = formData.get("signature");
    const type = formData.get("type");

    if (!signature || !(signature instanceof File)) {
      return c.json({ error: "No signature file provided" }, 400);
    }

    if (!type || (type !== "driver" && type !== "inspector")) {
      return c.json({ error: "Invalid signature type" }, 400);
    }

    // Read the file as array buffer
    const arrayBuffer = await signature.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Generate unique key for R2
    const timestamp = Date.now();
    const key = `fleet-signatures/${timestamp}-${type}.png`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, buffer, {
      httpMetadata: { contentType: "image/png" },
    });

    console.log(`[Fleet Signature] Uploaded ${type} signature to R2: ${key}`);

    return c.json({ key, success: true });
  } catch (error) {
    console.error("Error uploading signature:", error);
    return c.json({ error: "Failed to upload signature" }, 500);
  }
});

// Serve R2 assets (photos and signatures)
app.get("/api/r2-assets/:key{.+}", async (c) => {
  try {
    const r2Key = c.req.param("key");
    
    // Get the file from R2
    const object = await c.env.R2_BUCKET.get(r2Key);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    // Determine content type based on file extension
    let contentType = "application/octet-stream";
    if (r2Key.endsWith(".jpg") || r2Key.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    } else if (r2Key.endsWith(".png")) {
      contentType = "image/png";
    } else if (r2Key.endsWith(".webp")) {
      contentType = "image/webp";
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", object.size.toString());
    headers.set("Cache-Control", "public, max-age=31536000");
    headers.set("etag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error fetching R2 asset:", error);
    return c.json({ error: "Failed to fetch file" }, 500);
  }
});

// Upload damage photos
app.post("/api/fleet-checklists/:id/damage-marks/:markId/photos", async (c) => {
  try {
    const userId = c.get("userId");
    const checklistId = parseInt(c.req.param("id"));
    const markId = parseInt(c.req.param("markId"));

    // Verify checklist belongs to user
    const checklist = await c.env.DB.prepare(
      "SELECT * FROM fleet_checklists WHERE id = ? AND user_id = ?"
    ).bind(checklistId, userId).first();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    // Verify damage mark belongs to checklist
    const mark = await c.env.DB.prepare(
      "SELECT * FROM fleet_damage_marks WHERE id = ? AND checklist_id = ?"
    ).bind(markId, checklistId).first();

    if (!mark) {
      return c.json({ error: "Damage mark not found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return c.json({ error: "No photo provided" }, 400);
    }

    // Upload to R2
    const r2Key = `fleet-damage-photos/${checklistId}/${markId}/${Date.now()}-${file.name}`;
    await c.env.R2_BUCKET.put(r2Key, file.stream());

    // Save photo record
    await c.env.DB.prepare(
      `INSERT INTO fleet_damage_photos (damage_mark_id, r2_key)
       VALUES (?, ?)`
    ).bind(markId, r2Key).run();

    return c.json({ message: "Photo uploaded successfully", r2Key }, 201);
  } catch (error) {
    console.error("Error uploading damage photo:", error);
    return c.json({ error: "Failed to upload photo" }, 500);
  }
});

// Get all fleet checklists
app.get("/api/fleet-checklists", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");

    let query = `
      SELECT 
        fc.*,
        v.license_plate,
        v.model
      FROM fleet_checklists fc
      LEFT JOIN vehicles v ON fc.vehicle_id = v.id
    `;
    const params: any[] = [];

    if (!isAdmin) {
      query += " WHERE fc.user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY fc.created_at DESC";

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ checklists: results });
  } catch (error) {
    console.error("Error fetching fleet checklists:", error);
    return c.json({ error: "Failed to fetch fleet checklists" }, 500);
  }
});

// Get fleet statistics - MUST come before /:id route
app.get("/api/fleet-checklists/stats", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");

    // Base query filter
    let baseFilter = "";
    const params: any[] = [];
    
    if (!isAdmin) {
      baseFilter = "WHERE user_id = ?";
      params.push(userId);
    }

    // Total checklists
    const totalResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM fleet_checklists ${baseFilter}`
    ).bind(...params).first();
    const totalChecklists = (totalResult as any)?.count || 0;

    // Checklists by type
    const entradaResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM fleet_checklists ${baseFilter ? baseFilter + " AND" : "WHERE"} checklist_type = 'entrada'`
    ).bind(...params).first();
    const saidaResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM fleet_checklists ${baseFilter ? baseFilter + " AND" : "WHERE"} checklist_type = 'saida'`
    ).bind(...params).first();

    // Total damages
    let damageQuery = "SELECT COUNT(*) as count FROM fleet_damage_marks";
    if (!isAdmin) {
      damageQuery += " WHERE checklist_id IN (SELECT id FROM fleet_checklists WHERE user_id = ?)";
    }
    const damageResult = await c.env.DB.prepare(damageQuery).bind(...params).first();
    const totalDamages = (damageResult as any)?.count || 0;

    // Vehicles with most damages
    let vehicleDamageQuery = `
      SELECT v.license_plate, v.model, COUNT(fdm.id) as damage_count
      FROM fleet_checklists fc
      LEFT JOIN vehicles v ON fc.vehicle_id = v.id
      LEFT JOIN fleet_damage_marks fdm ON fc.id = fdm.checklist_id
      ${baseFilter}
      GROUP BY v.id, v.license_plate, v.model
      HAVING damage_count > 0
      ORDER BY damage_count DESC
      LIMIT 5
    `;
    const { results: vehiclesWithDamages } = await c.env.DB.prepare(vehicleDamageQuery).bind(...params).all();

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let activityQuery = `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM fleet_checklists
      ${baseFilter ? baseFilter + " AND" : "WHERE"} created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const activityParams = [...params, sevenDaysAgo.toISOString()];
    const { results: recentActivity } = await c.env.DB.prepare(activityQuery).bind(...activityParams).all();

    // Problems by category
    let checklistsQuery = `SELECT * FROM fleet_checklists ${baseFilter}`;
    const { results: allChecklists } = await c.env.DB.prepare(checklistsQuery).bind(...params).all();

    let problemsByCategory = {
      generalState: 0,
      lights: 0,
      safety: 0,
      motor: 0,
    };

    allChecklists.forEach((checklist: any) => {
      try {
        const generalState = JSON.parse(checklist.general_condition || '{}');
        const frontLights = JSON.parse(checklist.front_lights || '{}');
        const rearLights = JSON.parse(checklist.rear_lights || '{}');
        const safety = JSON.parse(checklist.safety_items || '{}');
        const motor = JSON.parse(checklist.motor_items || '{}');

        // Count problems in each category
        if (generalState.cleanliness?.problems || generalState.tires?.problems || 
            generalState.fuel?.problems || generalState.documentation?.problems) {
          problemsByCategory.generalState++;
        }

        if (frontLights.problems || rearLights.problems) {
          problemsByCategory.lights++;
        }

        if (safety.seatbelt?.problems || safety.extinguisher?.problems || 
            safety.triangle?.problems || safety.jack?.problems) {
          problemsByCategory.safety++;
        }

        if (motor.oil?.problems || motor.brakes?.problems || 
            motor.battery?.problems || motor.radiator?.problems) {
          problemsByCategory.motor++;
        }
      } catch (error) {
        console.error('Error parsing checklist data:', error);
      }
    });

    return c.json({
      totalChecklists,
      totalDamages,
      checklistsByType: {
        entrada: (entradaResult as any)?.count || 0,
        saida: (saidaResult as any)?.count || 0,
      },
      vehiclesWithMostDamages: vehiclesWithDamages.map((v: any) => ({
        licensePlate: v.license_plate,
        model: v.model,
        vehicle: `${v.license_plate} - ${v.model}`,
        damageCount: v.damage_count,
      })),
      recentActivity: recentActivity.map((a: any) => ({
        date: a.date,
        count: a.count,
      })),
      problemsByCategory,
    });
  } catch (error) {
    console.error("Error fetching fleet stats:", error);
    return c.json({ error: "Failed to fetch fleet stats" }, 500);
  }
});

// Get KM statistics per vehicle
app.get("/api/fleet-checklists/km-stats", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");

    // Get KM traveled per vehicle
    let kmQuery = `
      SELECT 
        v.id,
        v.license_plate,
        v.model,
        SUM(
          CASE 
            WHEN fc.km_final IS NOT NULL AND fc.km_initial IS NOT NULL 
            THEN ABS(fc.km_final - fc.km_initial)
            ELSE 0
          END
        ) as total_km,
        COUNT(fc.id) as trip_count
      FROM vehicles v
      LEFT JOIN fleet_checklists fc ON v.id = fc.vehicle_id ${isAdmin ? "" : "AND fc.user_id = ?"}
      GROUP BY v.id, v.license_plate, v.model
      HAVING total_km > 0
      ORDER BY total_km DESC
    `;
    
    const kmParams = isAdmin ? [] : [userId];
    const { results: kmStats } = await c.env.DB.prepare(kmQuery).bind(...kmParams).all();

    return c.json({
      vehicles: kmStats.map((v: any) => ({
        id: v.id,
        licensePlate: v.license_plate,
        model: v.model,
        vehicle: `${v.license_plate} - ${v.model}`,
        totalKm: v.total_km || 0,
        tripCount: v.trip_count || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching KM stats:", error);
    return c.json({ error: "Failed to fetch KM stats" }, 500);
  }
});

// Get a specific fleet checklist with damage marks
app.get("/api/fleet-checklists/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");
    const checklistId = parseInt(c.req.param("id"));

    let query = `
      SELECT 
        fc.*,
        v.license_plate,
        v.model
      FROM fleet_checklists fc
      LEFT JOIN vehicles v ON fc.vehicle_id = v.id
      WHERE fc.id = ?
    `;
    const params: any[] = [checklistId];

    if (!isAdmin) {
      query += " AND fc.user_id = ?";
      params.push(userId);
    }

    const checklist = await c.env.DB.prepare(query).bind(...params).first();

    if (!checklist) {
      return c.json({ error: "Checklist not found" }, 404);
    }

    // Get damage marks
    const { results: marks } = await c.env.DB.prepare(
      "SELECT * FROM fleet_damage_marks WHERE checklist_id = ?"
    ).bind(checklistId).all();

    // Get photos for each mark
    const marksWithPhotos = await Promise.all(
      marks.map(async (mark: any) => {
        const { results: photos } = await c.env.DB.prepare(
          "SELECT * FROM fleet_damage_photos WHERE damage_mark_id = ?"
        ).bind(mark.id).all();
        return { ...mark, photos };
      })
    );

    return c.json({
      checklist: {
        ...checklist,
        damageMarks: marksWithPhotos,
      },
    });
  } catch (error) {
    console.error("Error fetching fleet checklist:", error);
    return c.json({ error: "Failed to fetch fleet checklist" }, 500);
  }
});

// Delete a fleet checklist
app.delete("/api/fleet-checklists/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const isAdmin = c.get("isAdmin");
    const checklistId = parseInt(c.req.param("id"));

    // Verify ownership
    let query = "SELECT * FROM fleet_checklists WHERE id = ?";
    const params: any[] = [checklistId];

    if (!isAdmin) {
      query += " AND user_id = ?";
      params.push(userId);
    }

    const checklist = await c.env.DB.prepare(query).bind(...params).first();

    if (!checklist) {
      return c.json({ error: "Checklist not found or unauthorized" }, 404);
    }

    // Get all damage marks to delete their photos from R2
    const { results: marks } = await c.env.DB.prepare(
      "SELECT id FROM fleet_damage_marks WHERE checklist_id = ?"
    ).bind(checklistId).all();

    // Delete photos from R2 and database
    for (const mark of marks) {
      const { results: photos } = await c.env.DB.prepare(
        "SELECT r2_key FROM fleet_damage_photos WHERE damage_mark_id = ?"
      ).bind((mark as any).id).all();

      for (const photo of photos) {
        try {
          await c.env.R2_BUCKET.delete((photo as any).r2_key);
        } catch (err) {
          console.error('Error deleting R2 object:', err);
        }
      }

      await c.env.DB.prepare(
        "DELETE FROM fleet_damage_photos WHERE damage_mark_id = ?"
      ).bind((mark as any).id).run();
    }

    // Delete damage marks
    await c.env.DB.prepare(
      "DELETE FROM fleet_damage_marks WHERE checklist_id = ?"
    ).bind(checklistId).run();

    // Delete checklist
    await c.env.DB.prepare(
      "DELETE FROM fleet_checklists WHERE id = ?"
    ).bind(checklistId).run();

    return c.json({ message: "Checklist deleted successfully" });
  } catch (error) {
    console.error("Error deleting fleet checklist:", error);
    return c.json({ error: "Failed to delete fleet checklist" }, 500);
  }
});

export default app;
