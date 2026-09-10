import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import * as bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { User, RegisterRequest, LoginRequest, AuthResponse } from "../shared/auth-types";

const ADMIN_PIN = "2233";
const SESSION_COOKIE_NAME = "checklist_session";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Helper to create JWT
async function createToken(userId: number, isAdmin: boolean, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);
  
  const token = await new SignJWT({ userId, isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
  
  return token;
}

// Helper to verify JWT
export async function verifyToken(token: string, secret: string): Promise<{ userId: number; isAdmin: boolean } | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);
    
    const { payload } = await jwtVerify(token, secretKey);
    
    if (typeof payload.userId !== 'number') {
      return null;
    }
    
    return {
      userId: payload.userId as number,
      isAdmin: payload.isAdmin === true || payload.isAdmin === 1,
    };
  } catch {
    return null;
  }
}

// Register endpoint
app.post("/api/auth/register", async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();
    const { name, username, password, role, adminPin } = body;

    // Validation
    if (!name || !username || !password) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Nome, usuário e senha são obrigatórios" 
      }, 400);
    }

    if (username.length < 3) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário deve ter pelo menos 3 caracteres" 
      }, 400);
    }

    if (password.length < 6) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Senha deve ter pelo menos 6 caracteres" 
      }, 400);
    }

    // Check if username already exists
    const existing = await c.env.DB.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).bind(username).first();

    if (existing) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário já existe" 
      }, 400);
    }

    // Determine if admin
    const isAdmin = adminPin === ADMIN_PIN;
    const userRole = isAdmin ? 'admin' : (role || 'colaborador');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await c.env.DB.prepare(
      `INSERT INTO users (name, username, password_hash, is_admin, role) 
       VALUES (?, ?, ?, ?, ?) RETURNING id, name, username, is_admin, role, created_at, updated_at`
    ).bind(name, username, passwordHash, isAdmin ? 1 : 0, userRole).first<User>();

    if (!result) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Erro ao criar usuário" 
      }, 500);
    }

    // Create token
    const token = await createToken(result.id, Boolean(result.is_admin), c.env.JWT_SECRET);

    // Set cookie (secure only in production)
    const isProduction = c.req.url.includes('mocha.app');
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json<AuthResponse>({
      success: true,
      user: result,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return c.json<AuthResponse>({ 
      success: false, 
      error: "Erro no servidor" 
    }, 500);
  }
});

// Login endpoint
app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { username, password } = body;

    if (!username || !password) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário e senha são obrigatórios" 
      }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE username = ?"
    ).bind(username).first<User & { password_hash: string }>();

    if (!user) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário ou senha incorretos" 
      }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário ou senha incorretos" 
      }, 401);
    }

    // Create token
    const token = await createToken(user.id, Boolean(user.is_admin), c.env.JWT_SECRET);

    // Set cookie (secure only in production)
    const isProduction = c.req.url.includes('mocha.app');
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return c.json<AuthResponse>({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return c.json<AuthResponse>({ 
      success: false, 
      error: error?.message || "Erro no servidor" 
    }, 500);
  }
});

// Get current user
app.get("/api/auth/me", async (c) => {
  try {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!token) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Não autenticado" 
      }, 401);
    }

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Token inválido" 
      }, 401);
    }

    const user = await c.env.DB.prepare(
      "SELECT id, name, username, is_admin, role, created_at, updated_at FROM users WHERE id = ?"
    ).bind(payload.userId).first<User>();

    if (!user) {
      return c.json<AuthResponse>({ 
        success: false, 
        error: "Usuário não encontrado" 
      }, 401);
    }

    return c.json<AuthResponse>({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return c.json<AuthResponse>({ 
      success: false, 
      error: "Erro no servidor" 
    }, 500);
  }
});

// Logout endpoint
app.post("/api/auth/logout", async (c) => {
  const isProduction = c.req.url.includes('mocha.app');
  setCookie(c, SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    maxAge: 0,
  });

  return c.json({ success: true });
});

export default app;
