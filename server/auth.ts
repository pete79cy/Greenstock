import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db, pool } from "./db";
import { storage } from "./storage";
import { User, loginUserSchema, insertUserSchema, InsertUser } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { loginLimiter } from "./rate-limit";

// Constants
const SESSION_SECRET = process.env.SESSION_SECRET || 'plant-inventory-secret-key-very-long';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── SSO forward-auth (Authentik) ────────────────────────────────────────────
// When enabled, the trusted reverse proxy (nginx) has already authenticated the
// visitor against Authentik and injects the identity headers below plus a shared
// secret. We turn that into a real Passport session automatically, so each user
// signs in ONCE at Authentik and never sees a second password prompt here.
const SSO_FORWARD_AUTH_ENABLED = process.env.SSO_FORWARD_AUTH_ENABLED === "1";
const SSO_PROXY_SECRET = process.env.SSO_PROXY_SECRET || "";

function secretMatches(provided: string): boolean {
  if (!SSO_PROXY_SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(SSO_PROXY_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Derive a unique username from a preferred base (Authentik username / email
// local-part), appending a numeric suffix only on collision.
async function uniqueUsername(base: string): Promise<string> {
  const cleaned = (base || "user").trim().replace(/\s+/g, "_").slice(0, 40) || "user";
  if (!(await storage.getUserByUsername(cleaned))) return cleaned;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${cleaned}_${i}`;
    if (!(await storage.getUserByUsername(candidate))) return candidate;
  }
  return `${cleaned}_${crypto.randomBytes(3).toString("hex")}`;
}

// Setup passport local strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return done(null, false, { message: "Incorrect password" });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Serialize and deserialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Function to configure express-session
export function configureSession(app: any) {
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: 'sessions',
        createTableIfMissing: true,
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      name: 'plant-session',
      cookie: { 
        maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,  // Prevent XSS attacks
        sameSite: 'lax'
      }
    })
  );
  
  app.use(passport.initialize());
  app.use(passport.session());
}

// SSO auto-login middleware. Register AFTER configureSession (so req.logIn and
// req.isAuthenticated exist) and BEFORE the protected routes. No-op unless
// SSO_FORWARD_AUTH_ENABLED=1; on any error it falls through so the local
// password login keeps working as a fallback.
export function ssoForwardAuth(app: any) {
  if (!SSO_FORWARD_AUTH_ENABLED) return;
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.isAuthenticated && req.isAuthenticated()) return next();

      // Only trust identity headers when the shared secret (set ONLY by nginx,
      // which overwrites any client-supplied copy) matches. Defence-in-depth
      // even though the app should be reachable only via the proxy.
      if (!secretMatches(req.get("x-sso-proxy-secret") || "")) return next();

      const email = (req.get("x-authentik-email") || "").trim().toLowerCase();
      const username = (req.get("x-authentik-username") || "").trim();
      if (!email && !username) return next();

      let user: User | undefined;
      if (email) user = await storage.getUserByEmail(email);
      if (!user && username) user = await storage.getUserByUsername(username);

      if (!user) {
        // First time this Authentik identity reaches HR → provision a regular
        // user. They passed the Authentik gate, so this is a trusted identity.
        const base = username || (email ? email.split("@")[0] : "user");
        const randomPassword = await hashPassword(crypto.randomBytes(24).toString("hex"));
        user = await storage.createUser({
          username: await uniqueUsername(base),
          password: randomPassword,
          email: email || null,
        } as InsertUser);
      }

      req.logIn(user, (err) => (err ? next(err) : next()));
    } catch {
      next();
    }
  });
}

// Hash password utility
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

// Register authentication routes
export function registerAuthRoutes(app: any) {
  // Register new user - Closed to new registrations
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    // Registration has been closed per admin requirement
    return res.status(403).json({ 
      message: "Registration is currently closed. Please contact the administrator for access." 
    });
  });
  
  // Login
  app.post("/api/auth/login", loginLimiter, (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate login data
      const validatedData = loginUserSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: fromZodError(validatedData.error).message
        });
      }
      
      passport.authenticate("local", (err: Error, user: User, info: any) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          
          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          
          return res.status(200).json({ 
            message: "Login successful",
            user: userWithoutPassword
          });
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Get current user
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    
    res.status(200).json(userWithoutPassword);
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({ message: "Logout successful" });
    });
  });
}