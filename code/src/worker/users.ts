import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken } from "./auth";
import * as bcrypt from "bcryptjs";
import type { Env, Variables } from "./types";
import type { User } from "../shared/auth-types";

const SESSION_COOKIE_NAME = "checklist_session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to verify authentication for user routes only
app.use("/api/users/*", async (c, next) => {
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
});

// Get all users (admin only)
app.get("/api/users", async (c) => {
  try {
    const isAdmin = c.get("isAdmin");

    // Convert to boolean to handle both 0/1 and true/false
    if (!Boolean(isAdmin)) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const users = await c.env.DB.prepare(
      "SELECT id, name, username, is_admin, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    ).all<User>();

    return c.json({ users: users.results });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Delete user (admin only)
app.delete("/api/users/:id", async (c) => {
  try {
    const isAdmin = c.get("isAdmin");
    const currentUserId = c.get("userId");
    const userIdToDelete = parseInt(c.req.param("id"));

    // Convert to boolean to handle both 0/1 and true/false
    if (!Boolean(isAdmin)) {
      return c.json({ error: "Admin access required" }, 403);
    }

    if (currentUserId === userIdToDelete) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE id = ?"
    ).bind(userIdToDelete).first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Delete user
    await c.env.DB.prepare(
      "DELETE FROM users WHERE id = ?"
    ).bind(userIdToDelete).run();

    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Update user role (admin only, collaborators only)
app.patch("/api/users/:id/role", async (c) => {
  try {
    const isAdmin = c.get("isAdmin");
    const currentUserId = c.get("userId");
    const userIdToUpdate = parseInt(c.req.param("id"));

    // Convert to boolean to handle both 0/1 and true/false
    if (!Boolean(isAdmin)) {
      return c.json({ error: "Admin access required" }, 403);
    }

    if (currentUserId === userIdToUpdate) {
      return c.json({ error: "Cannot modify your own admin status" }, 400);
    }

    // Check if user exists and is not admin
    const user = await c.env.DB.prepare(
      "SELECT id, is_admin FROM users WHERE id = ?"
    ).bind(userIdToUpdate).first<User>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (user.is_admin) {
      return c.json({ error: "Cannot modify admin users" }, 400);
    }

    const body = await c.req.json<{ name?: string; username?: string; role?: 'colaborador' | 'recepcao' }>();

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (body.name) {
      updates.push("name = ?");
      params.push(body.name);
    }

    if (body.username) {
      // Check if username is already taken
      const existing = await c.env.DB.prepare(
        "SELECT id FROM users WHERE username = ? AND id != ?"
      ).bind(body.username, userIdToUpdate).first();

      if (existing) {
        return c.json({ error: "Username already taken" }, 400);
      }

      updates.push("username = ?");
      params.push(body.username);
    }

    if (body.role && (body.role === 'colaborador' || body.role === 'recepcao')) {
      updates.push("role = ?");
      params.push(body.role);
    }

    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(userIdToUpdate);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// Promote user to admin (admin only, requires PIN)
app.post("/api/users/:id/promote-admin", async (c) => {
  try {
    const isAdmin = c.get("isAdmin");
    const currentUserId = c.get("userId");
    const userIdToPromote = parseInt(c.req.param("id"));

    // Convert to boolean to handle both 0/1 and true/false
    if (!Boolean(isAdmin)) {
      return c.json({ error: "Admin access required" }, 403);
    }

    if (currentUserId === userIdToPromote) {
      return c.json({ error: "You are already an admin" }, 400);
    }

    const body = await c.req.json<{ pin: string }>();

    // Verify PIN
    if (body.pin !== "2233") {
      return c.json({ error: "PIN incorreto" }, 401);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      "SELECT id, is_admin, name FROM users WHERE id = ?"
    ).bind(userIdToPromote).first<User>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (user.is_admin) {
      return c.json({ error: "User is already an admin" }, 400);
    }

    // Promote to admin
    await c.env.DB.prepare(
      "UPDATE users SET is_admin = 1, role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(userIdToPromote).run();

    return c.json({ message: "User promoted to admin successfully" });
  } catch (error) {
    console.error("Error promoting user:", error);
    return c.json({ error: "Failed to promote user" }, 500);
  }
});

// Change own password
app.post("/api/users/change-password", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json<{ currentPassword: string; newPassword: string }>();

    if (!body.currentPassword || !body.newPassword) {
      return c.json({ error: "Current password and new password are required" }, 400);
    }

    if (body.newPassword.length < 6) {
      return c.json({ error: "New password must be at least 6 characters" }, 400);
    }

    // Get user
    const user = await c.env.DB.prepare(
      "SELECT password_hash FROM users WHERE id = ?"
    ).bind(userId).first<{ password_hash: string }>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify current password
    const validPassword = await bcrypt.compare(body.currentPassword, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(body.newPassword, 10);

    // Update password
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newPasswordHash, userId).run();

    return c.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return c.json({ error: "Failed to change password" }, 500);
  }
});

export default app;
