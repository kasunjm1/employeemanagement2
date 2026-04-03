import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./src/lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: process.env.VERCEL });
});

// Database Initialization
export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing. Please set it in Vercel project settings.");
  }
  try {
    console.log('Initializing database tables...');
    // Create e_accounts first as it's a dependency for others
    await query(`
      CREATE TABLE IF NOT EXISTS e_accounts (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Create other tables in parallel
    await Promise.all([
      query(`
        CREATE TABLE IF NOT EXISTS e_users (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'standard', -- 'super_admin', 'admin', 'standard'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_roles (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          deleted_at TIMESTAMP,
          UNIQUE(account_id, name)
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_sections (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          deleted_at TIMESTAMP,
          UNIQUE(account_id, name)
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_employees (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          nickname TEXT,
          role_id INTEGER REFERENCES e_roles(id),
          join_date DATE NOT NULL,
          employee_id TEXT NOT NULL,
          status TEXT DEFAULT 'On-Duty',
          mobile TEXT,
          whatsapp TEXT,
          nic TEXT,
          tax_residency TEXT,
          section_id INTEGER REFERENCES e_sections(id),
          salary_type TEXT,
          avatar_url TEXT,
          deleted_at TIMESTAMP,
          UNIQUE(account_id, employee_id)
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_employee_details (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          employee_id TEXT NOT NULL,
          title TEXT,
          content TEXT,
          image_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_attendance (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          employee_id TEXT NOT NULL,
          date DATE NOT NULL,
          check_in TIME,
          check_out TIME,
          status TEXT,
          section_id INTEGER REFERENCES e_sections(id),
          deleted_at TIMESTAMP
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_leaves (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          employee_id TEXT NOT NULL,
          type TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days INTEGER NOT NULL,
          status TEXT DEFAULT 'Pending',
          applied_on DATE DEFAULT CURRENT_DATE,
          deleted_at TIMESTAMP
        )
      `),
      query(`
        CREATE TABLE IF NOT EXISTS e_alerts (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        )
      `)
    ]);

    // Migration: Add role_id and section_id to e_employees and e_attendance if they don't exist
    try {
      await query(`ALTER TABLE e_employees ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES e_roles(id)`);
      await query(`ALTER TABLE e_employees ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES e_sections(id)`);
      await query(`ALTER TABLE e_attendance ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES e_sections(id)`);
      console.log('Migration check complete: role_id and section_id columns verified.');
    } catch (migrationErr) {
      console.error('Migration error:', migrationErr);
    }

    // Seed initial account and super admin
    const accountCheck = await query("SELECT COUNT(*) FROM e_accounts");
    if (parseInt(accountCheck.rows[0].count) === 0) {
      const accountResult = await query("INSERT INTO e_accounts (name) VALUES ('Nexus Global') RETURNING id");
      const accountId = accountResult.rows[0].id;

      // Super Admin (No account_id needed for global access, but let's assign to first account for now)
      await query(`
        INSERT INTO e_users (email, password, name, role, account_id)
        VALUES 
        ('admin@nexus.com', 'admin123', 'System Administrator', 'super_admin', $1),
        ('kasun.jm@gmail.com', 'admin@123', 'Kasun Super Admin', 'super_admin', $1)
      `, [accountId]);

      // Seed initial roles and sections for the first account
      await query(`
        INSERT INTO e_roles (account_id, name) VALUES ($1, 'Senior Lead'), ($1, 'Logistics Coordinator'), ($1, 'HR Specialist'), ($1, 'Production Manager'), ($1, 'Quality Control')
      `, [accountId]);
      await query(`
        INSERT INTO e_sections (account_id, name) VALUES ($1, 'Operations & Logistics'), ($1, 'Logistics'), ($1, 'Human Resources'), ($1, 'Production Wing A'), ($1, 'Admin HQ')
      `, [accountId]);

      // Seed initial employees for the first account
      await query(`
        INSERT INTO e_employees (account_id, name, nickname, role, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section, salary_type, avatar_url)
        VALUES 
        ($1, 'Samantha Richards', 'Sam', 'Senior Lead', '2021-10-12', 'EMP-2021-084', '+1 (555) 012-3456', '+1 (555) 012-3456', '198812345678', 'Domestic (Standard)', 'Operations & Logistics', 'Monthly', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXWVldVYDyIXMhQzxdkIjCbDlN7tCrCAB0ictQww9juBGGfOYZIGlbtmGB5yrdapzk5duIGGh2-AjVIxqHdVpCYkO7YaubRFRt_Ke0msJGwuJElCpoSv0fjWuU0HGsjuJs_kraZEkNsomynMmUv76hRo_QWMDQyd5ho1eeBE1dE6ewVQ1EWXZL5VPBBtbkHP-1LjfL2cRrv02avPn9iWruhfPUys4lgrR6GbGVMs73rhPKbJpHEH0XjJC8KSaeE7qjoqY7dKd7cCk'),
        ($1, 'David Miller', 'Dave', 'Logistics Coordinator', '2022-03-15', 'EMP-2022-012', '+1 (555) 987-6543', '+1 (555) 987-6543', '199012345678', 'Domestic (Standard)', 'Logistics', 'Monthly', 'https://picsum.photos/seed/david/200/200'),
        ($1, 'Elena Rodriguez', 'Elena', 'HR Specialist', '2023-01-10', 'EMP-2023-045', '+1 (555) 456-7890', '+1 (555) 456-7890', '199212345678', 'Domestic (Standard)', 'Human Resources', 'Monthly', 'https://picsum.photos/seed/elena/200/200')
      `, [accountId]);

      await query(`
        INSERT INTO e_attendance (account_id, employee_id, date, check_in, check_out, status, section)
        VALUES 
        ($1, 'EMP-2021-084', '2023-08-24', '08:14:00', '17:32:00', 'Present', 'Operations & Logistics'),
        ($1, 'EMP-2021-084', '2023-08-23', '08:02:00', '17:45:00', 'Present', 'Operations & Logistics')
      `, [accountId]);

      await query(`
        INSERT INTO e_leaves (account_id, employee_id, type, start_date, end_date, days, status, applied_on)
        VALUES 
        ($1, 'EMP-2021-084', 'Annual Vacation', '2023-10-12', '2023-10-18', 5, 'Approved', '2023-09-28'),
        ($1, 'EMP-2021-084', 'Medical Leave', '2023-11-05', '2023-11-05', 1, 'Pending', '2023-11-04')
      `, [accountId]);

      await query(`
        INSERT INTO e_alerts (account_id, title, description, type)
        VALUES 
        ($1, 'Unexplained Absence: Team Beta', '4 members have not checked in by 09:30 AM', 'warning'),
        ($1, 'Pending Approval: Sarah Jenkins', 'Request for 5 days Medical Leave', 'approval'),
        ($1, 'Work Anniversary: Robert Chen', 'Celebrating 5 years with Master Admin today', 'celebration')
      `, [accountId]);
    }
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err; // Rethrow so the caller knows it failed
  }
}

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    const accountId = req.headers['x-account-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !accountId) {
      return res.status(401).json({ error: "Unauthorized: Missing credentials" });
    }
    
    const parsedUserId = parseInt(userId as string);
    const parsedAccountId = parseInt(accountId as string);

    if (isNaN(parsedUserId) || isNaN(parsedAccountId)) {
      return res.status(401).json({ error: "Unauthorized: Invalid credentials format" });
    }

    req.user = { id: parsedUserId, account_id: parsedAccountId, role: userRole };
    next();
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await query("SELECT * FROM e_users WHERE email = $1 AND password = $2 AND deleted_at IS NULL", [email, password]);
      if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
      
      const user = result.rows[0];
      // Check if account is deleted
      const accountResult = await query("SELECT * FROM e_accounts WHERE id = $1 AND deleted_at IS NULL", [user.account_id]);
      if (accountResult.rows.length === 0) return res.status(401).json({ error: "Account deactivated" });

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        account_id: user.account_id
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/stats", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const totalWorkforce = await query("SELECT COUNT(*) FROM e_employees WHERE account_id = $1 AND deleted_at IS NULL", [account_id]);
      const activeToday = await query("SELECT COUNT(*) FROM e_attendance WHERE account_id = $1 AND date = CURRENT_DATE AND status = 'Present' AND deleted_at IS NULL", [account_id]);
      const absentToday = await query("SELECT COUNT(*) FROM e_attendance WHERE account_id = $1 AND date = CURRENT_DATE AND status = 'Absent' AND deleted_at IS NULL", [account_id]);
      
      res.json({
        totalWorkforce: parseInt(totalWorkforce.rows[0].count),
        activeToday: parseInt(activeToday.rows[0].count),
        absentToday: parseInt(absentToday.rows[0].count),
        growth: "+4.2%"
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/roles", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT * FROM e_roles WHERE account_id = $1 AND deleted_at IS NULL ORDER BY name ASC", [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("INSERT INTO e_roles (account_id, name) VALUES ($1, $2) RETURNING *", [account_id, name]);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to add role" });
    }
  });

  app.put("/api/roles/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("UPDATE e_roles SET name = $1 WHERE id = $2 AND account_id = $3 AND deleted_at IS NULL RETURNING *", [name, req.params.id, account_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Role not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_roles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  app.get("/api/sections", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT * FROM e_sections WHERE account_id = $1 AND deleted_at IS NULL ORDER BY name ASC", [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.post("/api/sections", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("INSERT INTO e_sections (account_id, name) VALUES ($1, $2) RETURNING *", [account_id, name]);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to add section" });
    }
  });

  app.put("/api/sections/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("UPDATE e_sections SET name = $1 WHERE id = $2 AND account_id = $3 AND deleted_at IS NULL RETURNING *", [name, req.params.id, account_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Section not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update section" });
    }
  });

  app.delete("/api/sections/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_sections SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  app.get("/api/employees", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT e.*, r.name as role, s.name as section 
        FROM e_employees e
        LEFT JOIN e_roles r ON e.role_id = r.id
        LEFT JOIN e_sections s ON e.section_id = s.id
        WHERE e.account_id = $1 AND e.deleted_at IS NULL 
        ORDER BY e.name ASC
      `, [account_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching employees:", err);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name, nickname, role_id, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section_id, salary_type, avatar_url } = req.body;
    try {
      const result = await query(
        `INSERT INTO e_employees (account_id, name, nickname, role_id, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section_id, salary_type, avatar_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [account_id, name, nickname, role_id, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section_id, salary_type, avatar_url]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error("Error adding employee:", err);
      if (err.code === '23505') {
        res.status(400).json({ error: "Employee ID already exists" });
      } else {
        res.status(500).json({ error: "Failed to add employee" });
      }
    }
  });

  app.put("/api/employees/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name, nickname, role_id, join_date, mobile, whatsapp, nic, tax_residency, section_id, salary_type, avatar_url, status } = req.body;
    try {
      const result = await query(
        `UPDATE e_employees 
         SET name = $1, nickname = $2, role_id = $3, join_date = $4, mobile = $5, whatsapp = $6, nic = $7, tax_residency = $8, section_id = $9, salary_type = $10, avatar_url = $11, status = $12
         WHERE employee_id = $13 AND account_id = $14 AND deleted_at IS NULL RETURNING *`,
        [name, nickname, role_id, join_date, mobile, whatsapp, nic, tax_residency, section_id, salary_type, avatar_url, status, req.params.id, account_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Employee not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating employee:", err);
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.get("/api/employees/:id/details", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT * FROM e_employee_details WHERE employee_id = $1 AND account_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC", [req.params.id, account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch employee details" });
    }
  });

  app.post("/api/employees/:id/details", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { title, content, image_data } = req.body;
    try {
      const result = await query(
        "INSERT INTO e_employee_details (account_id, employee_id, title, content, image_data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [account_id, req.params.id, title, content, image_data]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error adding employee detail:", err);
      res.status(500).json({ error: "Failed to add employee detail" });
    }
  });

  app.delete("/api/employees/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_employees SET deleted_at = CURRENT_TIMESTAMP WHERE employee_id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  app.get("/api/employees/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT e.*, r.name as role, s.name as section 
        FROM e_employees e
        LEFT JOIN e_roles r ON e.role_id = r.id
        LEFT JOIN e_sections s ON e.section_id = s.id
        WHERE e.employee_id = $1 AND e.account_id = $2 AND e.deleted_at IS NULL
      `, [req.params.id, account_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Employee not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.get("/api/attendance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT a.*, e.name, e.avatar_url, s.name as section 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.employee_id AND a.account_id = e.account_id
        LEFT JOIN e_sections s ON a.section_id = s.id
        WHERE a.account_id = $1 AND a.deleted_at IS NULL AND e.deleted_at IS NULL
        ORDER BY a.date DESC, a.check_in DESC
      `, [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id, date, check_in, check_out, status, section_id } = req.body;
    try {
      const result = await query(
        "INSERT INTO e_attendance (account_id, employee_id, date, check_in, check_out, status, section_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [account_id, employee_id, date, check_in, check_out, status, section_id]
      );
      
      // Fetch joined data for response
      const joinedResult = await query(`
        SELECT a.*, e.name, e.avatar_url, s.name as section 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.employee_id AND a.account_id = e.account_id
        LEFT JOIN e_sections s ON a.section_id = s.id
        WHERE a.id = $1
      `, [result.rows[0].id]);
      
      res.json(joinedResult.rows[0]);
    } catch (err) {
      console.error("Error recording attendance:", err);
      res.status(500).json({ error: "Failed to record attendance" });
    }
  });

  app.get("/api/leaves", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT l.*, e.name 
        FROM e_leaves l 
        JOIN e_employees e ON l.employee_id = e.employee_id AND l.account_id = e.account_id
        WHERE l.account_id = $1 AND l.deleted_at IS NULL AND e.deleted_at IS NULL
        ORDER BY l.start_date ASC
      `, [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leaves" });
    }
  });

  app.get("/api/alerts", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT * FROM e_alerts WHERE account_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10", [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Account Management (Super Admin Only)
  app.get("/api/accounts", authenticate, async (req: any, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const result = await query("SELECT * FROM e_accounts WHERE deleted_at IS NULL ORDER BY name ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", authenticate, async (req: any, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    const { name } = req.body;
    try {
      const result = await query("INSERT INTO e_accounts (name) VALUES ($1) RETURNING *", [name]);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    const { name } = req.body;
    try {
      const result = await query("UPDATE e_accounts SET name = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *", [name, req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    try {
      await query("UPDATE e_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
      // Also soft delete all users in this account
      await query("UPDATE e_users SET deleted_at = CURRENT_TIMESTAMP WHERE account_id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/users", authenticate, async (req: any, res) => {
    const { account_id, role } = req.user;
    try {
      let result;
      if (role === 'super_admin') {
        result = await query("SELECT u.*, a.name as account_name FROM e_users u LEFT JOIN e_accounts a ON u.account_id = a.id WHERE u.deleted_at IS NULL ORDER BY u.email ASC");
      } else if (role === 'admin') {
        result = await query("SELECT * FROM e_users WHERE account_id = $1 AND deleted_at IS NULL ORDER BY email ASC", [account_id]);
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticate, async (req: any, res) => {
    const { account_id, role } = req.user;
    const { email, password, name, role: newUserRole, account_id: targetAccountId } = req.body;
    
    try {
      let finalAccountId = account_id;
      if (role === 'super_admin') {
        finalAccountId = targetAccountId ? parseInt(targetAccountId) : account_id;
      } else if (role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await query(
        "INSERT INTO e_users (email, password, name, role, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [email, password, name, newUserRole, finalAccountId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", authenticate, async (req: any, res) => {
    const { account_id, role } = req.user;
    const { email, name, role: newUserRole, account_id: targetAccountId, password } = req.body;
    
    try {
      let q = "UPDATE e_users SET email = $1, name = $2, role = $3";
      let params: any[] = [email, name, newUserRole];
      let paramCount = 3;
      
      if (role === 'super_admin') {
        if (password) {
          paramCount++;
          q += `, password = $${paramCount}`;
          params.push(password);
        }
        paramCount++;
        const finalAccountId = targetAccountId ? parseInt(targetAccountId) : account_id;
        q += `, account_id = $${paramCount}`;
        params.push(finalAccountId);
        
        paramCount++;
        q += ` WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
        params.push(req.params.id);
      } else if (role === 'admin') {
        paramCount++;
        q += ` WHERE id = $${paramCount}`;
        params.push(req.params.id);
        
        paramCount++;
        q += ` AND account_id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
        params.push(account_id);
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await query(q, params);
      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticate, async (req: any, res) => {
    const { account_id, role } = req.user;
    try {
      if (role === 'super_admin') {
        await query("UPDATE e_users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
      } else if (role === 'admin') {
        await query("UPDATE e_users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

export async function setupApp() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to load Vite:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // The catch-all route should only be added if we are NOT in a serverless environment
    // or if we want the function to handle the SPA routing (which is usually handled by vercel.json)
    if (process.env.VERCEL !== "1") {
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }
}

if (process.env.VERCEL !== "1") {
  initDb()
    .then(() => setupApp())
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Fatal server error during startup:", err);
      process.exit(1);
    });
}

export default app;
