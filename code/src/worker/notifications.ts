import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken } from "./auth";
import type { Env, Variables } from "./types";

const SESSION_COOKIE_NAME = "checklist_session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  
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
};

app.use("/api/notifications/*", authMiddleware);

// Helper function to create notification
export async function createNotification(
  db: D1Database,
  userId: number,
  checklistId: number,
  notificationType: 'checklist_completed' | 'os_opened',
  message: string
): Promise<void> {
  await db.prepare(
    `INSERT INTO notifications (user_id, checklist_id, notification_type, message)
     VALUES (?, ?, ?, ?)`
  ).bind(userId, checklistId, notificationType, message).run();
}

// Get user's notifications
app.get("/api/notifications", async (c) => {
  try {
    const userId = c.get("userId");

    const notifications = await c.env.DB.prepare(
      `SELECT n.*, c.brand_model, c.license_plate, c.equipment_identifier
       FROM notifications n
       LEFT JOIN checklists c ON n.checklist_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`
    ).bind(userId).all();

    return c.json({ notifications: notifications.results });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
});

// Get unread count
app.get("/api/notifications/unread-count", async (c) => {
  try {
    const userId = c.get("userId");

    const result = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0"
    ).bind(userId).first<{ count: number }>();

    return c.json({ count: result?.count || 0 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return c.json({ error: "Failed to fetch unread count" }, 500);
  }
});

// Mark notification as read
app.patch("/api/notifications/:id/read", async (c) => {
  try {
    const userId = c.get("userId");
    const notificationId = parseInt(c.req.param("id"));

    await c.env.DB.prepare(
      "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    ).bind(notificationId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return c.json({ error: "Failed to mark notification as read" }, 500);
  }
});

// Mark all as read
app.post("/api/notifications/read-all", async (c) => {
  try {
    const userId = c.get("userId");

    await c.env.DB.prepare(
      "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0"
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return c.json({ error: "Failed to mark all as read" }, 500);
  }
});

export default app;
