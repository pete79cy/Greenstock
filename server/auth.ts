import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db, pool } from "./db";
import { storage } from "./storage";
import { User, loginUserSchema, insertUserSchema, InsertUser } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Constants
const SESSION_SECRET = process.env.SESSION_SECRET || 'plant-inventory-secret-key-very-long';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

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
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
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