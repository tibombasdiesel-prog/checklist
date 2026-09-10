import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken } from './auth';
import type { Env, Variables } from './types';

const SESSION_COOKIE_NAME = "checklist_session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Admin-only middleware
const adminOnly = async (c: any, next: any) => {
  let token = getCookie(c, SESSION_COOKIE_NAME);
  const authHeader = c.req.header("Authorization");
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload || !payload.isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  c.set("userId", payload.userId);
  c.set("isAdmin", payload.isAdmin);
  await next();
};

// Get all vehicles
app.get('/', async (c) => {
  const db = c.env.DB;
  
  const vehicles = await db.prepare(`
    SELECT * FROM vehicles
    WHERE is_active = 1
    ORDER BY model ASC, license_plate ASC
  `).all();
  
  return c.json(vehicles.results || []);
});

// Get vehicle by ID
app.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const vehicle = await db.prepare(`
    SELECT * FROM vehicles WHERE id = ?
  `).bind(id).first();
  
  if (!vehicle) {
    return c.json({ error: 'Vehicle not found' }, 404);
  }
  
  return c.json(vehicle);
});

// Create vehicle (admin only)
app.post('/', adminOnly, async (c) => {
  const db = c.env.DB;
  const { license_plate, model } = await c.req.json();
  
  if (!license_plate || !model) {
    return c.json({ error: 'License plate and model are required' }, 400);
  }
  
  const result = await db.prepare(`
    INSERT INTO vehicles (license_plate, model)
    VALUES (?, ?)
  `).bind(license_plate, model).run();
  
  return c.json({ id: result.meta.last_row_id, success: true });
});

// Update vehicle (admin only)
app.patch('/:id', adminOnly, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { license_plate, model } = await c.req.json();
  
  await db.prepare(`
    UPDATE vehicles
    SET license_plate = ?, model = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(license_plate, model, id).run();
  
  return c.json({ success: true });
});

// Delete vehicle (admin only) - soft delete
app.delete('/:id', adminOnly, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  await db.prepare(`
    UPDATE vehicles
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
  
  return c.json({ success: true });
});

export default app;
