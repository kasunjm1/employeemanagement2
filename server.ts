import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initDb } from "./src/lib/initDb.ts";
export { initDb };
import { query } from "./src/lib/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log('Server.ts module loading...');
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: process.env.VERCEL });
});

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
        account_id: user.account_id,
        account_name: accountResult.rows[0].name
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Helper for half-day status
  async function getStatusWithThreshold(accountId: number, checkIn: string | null): Promise<string> {
    if (!checkIn) return 'Full-Day';
    try {
      const settingsResult = await query("SELECT value FROM e_settings WHERE account_id = $1 AND key = 'half_day_threshold'", [accountId]);
      const threshold = settingsResult.rows[0]?.value || '10:00';
      
      // Normalize checkIn to HH:mm
      const checkInTime = checkIn.substring(0, 5);
      return checkInTime > threshold ? 'Half-Day' : 'Full-Day';
    } catch (err) {
      return 'Full-Day';
    }
  }

  app.get("/api/stats", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const totalWorkforce = await query("SELECT COUNT(*) FROM e_employees WHERE account_id = $1 AND deleted_at IS NULL", [account_id]);
      const activeToday = await query("SELECT COUNT(*) FROM e_attendance WHERE account_id = $1 AND date = CURRENT_DATE AND status IN ('Full-Day', 'Half-Day') AND deleted_at IS NULL", [account_id]);
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

  app.get("/api/dashboard/project-attendance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT 
          p.id, 
          p.name,
          COUNT(CASE WHEN a.status = 'Full-Day' THEN 1 END) as full_day,
          COUNT(CASE WHEN a.status = 'Half-Day' THEN 1 END) as half_day,
          COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent,
          COUNT(a.id) as total
        FROM e_projects p
        LEFT JOIN e_attendance a ON p.id = a.project_id AND a.date = CURRENT_DATE AND a.deleted_at IS NULL
        WHERE p.account_id = $1 AND p.deleted_at IS NULL
        GROUP BY p.id, p.name
        HAVING COUNT(a.id) > 0
        ORDER BY p.name ASC
      `, [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project attendance summary" });
    }
  });

  app.get("/api/dashboard/project-attendance/:projectId", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { projectId } = req.params;
    try {
      const result = await query(`
        SELECT 
          e.id, 
          e.name, 
          e.avatar_url,
          e.employee_id as employee_number,
          a.status,
          a.check_in,
          a.check_out
        FROM e_attendance a
        JOIN e_employees e ON a.employee_id = e.id
        WHERE a.account_id = $1 AND a.project_id = $2 AND a.date = CURRENT_DATE AND a.deleted_at IS NULL
        ORDER BY e.name ASC
      `, [account_id, projectId]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project employee list" });
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
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(400).json({ error: "Role name already exists in this account" });
      } else {
        res.status(500).json({ error: "Failed to add role" });
      }
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
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(400).json({ error: "Section name already exists in this account" });
      } else {
        res.status(500).json({ error: "Failed to add section" });
      }
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

  app.get("/api/projects", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT * FROM e_projects WHERE account_id = $1 AND deleted_at IS NULL ORDER BY name ASC", [account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("INSERT INTO e_projects (account_id, name) VALUES ($1, $2) RETURNING *", [account_id, name]);
      res.json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(400).json({ error: "Project name already exists in this account" });
      } else {
        res.status(500).json({ error: "Failed to add project" });
      }
    }
  });

  app.put("/api/projects/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name } = req.body;
    try {
      const result = await query("UPDATE e_projects SET name = $1 WHERE id = $2 AND account_id = $3 AND deleted_at IS NULL RETURNING *", [name, req.params.id, account_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete project" });
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
        ORDER BY e.employee_id ASC
      `, [account_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching employees:", err);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { name, nickname, role_id, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section_id, salary_type, unit_description, salary, avatar_url } = req.body;
    try {
      const result = await query(
        `INSERT INTO e_employees (account_id, name, nickname, role_id, join_date, employee_id, mobile, whatsapp, nic, tax_residency, section_id, salary_type, unit_description, salary, avatar_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
        [
          account_id, 
          name, 
          nickname, 
          role_id === 0 ? null : role_id, 
          join_date, 
          employee_id, 
          mobile, 
          whatsapp, 
          nic, 
          tax_residency, 
          section_id === 0 ? null : section_id, 
          salary_type, 
          unit_description || null,
          salary || 0,
          avatar_url
        ]
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
    const { name, nickname, role_id, join_date, mobile, whatsapp, nic, tax_residency, section_id, salary_type, unit_description, salary, avatar_url, status } = req.body;
    try {
      const result = await query(
        `UPDATE e_employees 
         SET name = $1, nickname = $2, role_id = $3, join_date = $4, mobile = $5, whatsapp = $6, nic = $7, tax_residency = $8, section_id = $9, salary_type = $10, unit_description = $11, salary = $12, avatar_url = $13, status = $14
         WHERE id = $15 AND account_id = $16 AND deleted_at IS NULL RETURNING *`,
        [
          name, 
          nickname, 
          role_id === 0 ? null : role_id, 
          join_date, 
          mobile, 
          whatsapp, 
          nic, 
          tax_residency, 
          section_id === 0 ? null : section_id, 
          salary_type, 
          unit_description || null,
          salary || 0,
          avatar_url, 
          status, 
          req.params.id, 
          account_id
        ]
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
      await query("UPDATE e_employees SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
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
        WHERE e.id = $1 AND e.account_id = $2 AND e.deleted_at IS NULL
      `, [req.params.id, account_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Employee not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.get("/api/attendance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { date, employee_id, project_id, month, year } = req.query;
    try {
      let queryStr = `
        SELECT a.*, e.name, e.avatar_url, e.employee_id as employee_number, e.salary_type, e.salary as current_salary, s.name as section, p.name as project 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.id
        LEFT JOIN e_sections s ON a.section_id = s.id
        LEFT JOIN e_projects p ON a.project_id = p.id
        WHERE a.account_id = $1 AND a.deleted_at IS NULL AND e.deleted_at IS NULL
      `;
      const params: any[] = [account_id];

      if (date) {
        params.push(date);
        queryStr += ` AND a.date = $${params.length}`;
      }

      if (employee_id && employee_id !== '0') {
        params.push(employee_id);
        queryStr += ` AND a.employee_id = $${params.length}`;
      }

      if (project_id && project_id !== '0') {
        params.push(project_id);
        queryStr += ` AND a.project_id = $${params.length}`;
      }

      if (month) {
        params.push(month);
        queryStr += ` AND EXTRACT(MONTH FROM a.date) = $${params.length}`;
      }

      if (year) {
        params.push(year);
        queryStr += ` AND EXTRACT(YEAR FROM a.date) = $${params.length}`;
      }

      queryStr += " ORDER BY a.date DESC, a.check_in DESC";
      
      const result = await query(queryStr, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id, date, check_in, check_out, status: providedStatus, section_id, project_id, units, allowance, salary_per_unit } = req.body;
    try {
      const status = await getStatusWithThreshold(account_id, check_in);
      
      // If salary_per_unit is not provided or is 0, fetch current employee salary
      let finalSalary = salary_per_unit;
      if (finalSalary === undefined || finalSalary === null || Number(finalSalary) === 0) {
        const emp = await query("SELECT salary FROM e_employees WHERE id = $1 AND account_id = $2", [employee_id, account_id]);
        finalSalary = emp.rows[0]?.salary || 0;
      }

      const result = await query(
        "INSERT INTO e_attendance (account_id, employee_id, date, check_in, check_out, status, section_id, project_id, units, allowance, salary_per_unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
        [
          account_id, 
          employee_id, 
          date, 
          check_in || null, 
          check_out || null, 
          status, 
          section_id === 0 ? null : section_id,
          project_id === 0 ? null : project_id,
          units || 0,
          allowance || 0,
          finalSalary
        ]
      );
      
      // Fetch joined data for response
      const joinedResult = await query(`
        SELECT a.*, e.name, e.avatar_url, e.employee_id as employee_number, e.salary_type, e.salary as current_salary, s.name as section, p.name as project 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.id
        LEFT JOIN e_sections s ON a.section_id = s.id
        LEFT JOIN e_projects p ON a.project_id = p.id
        WHERE a.id = $1
      `, [result.rows[0].id]);
      
      res.json(joinedResult.rows[0]);
    } catch (err) {
      console.error("Error recording attendance:", err);
      res.status(500).json({ error: "Failed to record attendance" });
    }
  });

  app.patch("/api/attendance/:id/allowance", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { id } = req.params;
    const { allowance } = req.body;
    try {
      const result = await query(
        "UPDATE e_attendance SET allowance = $1 WHERE id = $2 AND account_id = $3 RETURNING *",
        [allowance, id, account_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating allowance:", err);
      res.status(500).json({ error: "Failed to update allowance" });
    }
  });

  app.get("/api/employees/:id/attendance-status", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
      // Get today's attendance
      const todayAttendance = await query(
        "SELECT * FROM e_attendance WHERE account_id = $1 AND employee_id = $2 AND date = $3 AND deleted_at IS NULL",
        [account_id, id, today]
      );

      // Get last worked section from most recent attendance record
      const lastAttendance = await query(
        "SELECT section_id, project_id FROM e_attendance WHERE account_id = $1 AND employee_id = $2 AND deleted_at IS NULL ORDER BY date DESC, check_in DESC LIMIT 1",
        [account_id, id]
      );

      // Also get employee's default section
      const emp = await query(
        "SELECT section_id FROM e_employees WHERE account_id = $1 AND id = $2 AND deleted_at IS NULL",
        [account_id, id]
      );

      res.json({
        today: todayAttendance.rows[0] || null,
        last_section_id: lastAttendance.rows[0]?.section_id || emp.rows[0]?.section_id || null,
        last_project_id: lastAttendance.rows[0]?.project_id || null
      });
    } catch (err) {
      console.error("Error fetching attendance status:", err);
      res.status(500).json({ error: "Failed to fetch attendance status" });
    }
  });

  app.put("/api/attendance/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { id } = req.params;
    const { check_in, check_out, status: providedStatus, section_id, project_id, date, units, allowance, salary_per_unit, employee_id } = req.body;
    try {
      const status = await getStatusWithThreshold(account_id, check_in);
      
      // If salary_per_unit is not provided or is 0, fetch current employee salary
      let finalSalary = salary_per_unit;
      if (finalSalary === undefined || finalSalary === null || Number(finalSalary) === 0) {
        const emp = await query("SELECT salary FROM e_employees WHERE id = $1 AND account_id = $2", [employee_id, account_id]);
        finalSalary = emp.rows[0]?.salary || 0;
      }

      const result = await query(
        "UPDATE e_attendance SET check_in = $1, check_out = $2, status = $3, section_id = $4, project_id = $5, date = $6, units = $7, allowance = $8, salary_per_unit = $9 WHERE id = $10 AND account_id = $11 RETURNING *",
        [
          check_in || null, 
          check_out || null, 
          status, 
          section_id === 0 ? null : section_id, 
          project_id === 0 ? null : project_id,
          date, 
          units || 0,
          allowance || 0,
          finalSalary,
          id, 
          account_id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Attendance record not found" });
      }

      // Fetch joined data for response
      const joinedResult = await query(`
        SELECT a.*, e.name, e.avatar_url, e.employee_id as employee_number, e.salary_type, e.salary as current_salary, s.name as section, p.name as project 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.id
        LEFT JOIN e_sections s ON a.section_id = s.id
        LEFT JOIN e_projects p ON a.project_id = p.id
        WHERE a.id = $1
      `, [id]);

      res.json(joinedResult.rows[0]);
    } catch (err) {
      console.error("Error updating attendance:", err);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  app.delete("/api/attendance/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { id } = req.params;
    try {
      await query("UPDATE e_attendance SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete attendance" });
    }
  });

  app.post("/api/attendance/fingerprint", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    try {
      // Check if employee exists
      const empCheck = await query("SELECT * FROM e_employees WHERE employee_id = $1 AND account_id = $2 AND deleted_at IS NULL", [employee_id, account_id]);
      if (empCheck.rows.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      const employee = empCheck.rows[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Check for existing record today
      const attendanceCheck = await query(
        "SELECT * FROM e_attendance WHERE account_id = $1 AND employee_id = $2 AND date = $3",
        [account_id, employee.id, today]
      );
      
      let result;
      let action = "";
      
      if (attendanceCheck.rows.length === 0) {
        // First scan of the day - Check-in
        // Get IST time for threshold check
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const istTimeStr = ist.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const status = await getStatusWithThreshold(account_id, istTimeStr);

        result = await query(
          "INSERT INTO e_attendance (account_id, employee_id, date, check_in, status, section_id, project_id, salary_per_unit) VALUES ($1, $2, $3, CURRENT_TIME, $4, $5, $6, $7) RETURNING *",
          [account_id, employee.id, today, status, employee.section_id, null, Number(employee.salary) || 0] // project_id null for now on fingerprint
        );
        action = "Check-in";
      } else {
        // Subsequent scan - Check-out (updates to latest scan time)
        const recordId = attendanceCheck.rows[0].id;
        result = await query(
          "UPDATE e_attendance SET check_out = CURRENT_TIME WHERE id = $1 RETURNING *",
          [recordId]
        );
        action = "Check-out";
      }
      
      // Fetch joined data for response
      const joinedResult = await query(`
        SELECT a.*, e.name, e.avatar_url, e.employee_id as employee_number, e.salary_type, e.salary as current_salary, s.name as section, p.name as project 
        FROM e_attendance a 
        JOIN e_employees e ON a.employee_id = e.id
        LEFT JOIN e_sections s ON a.section_id = s.id
        LEFT JOIN e_projects p ON a.project_id = p.id
        WHERE a.id = $1
      `, [result.rows[0].id]);
      
      res.json({ 
        success: true, 
        action, 
        data: joinedResult.rows[0],
        message: `${action} successful for ${employee.name}`
      });
    } catch (err) {
      console.error("Error in fingerprint attendance:", err);
      res.status(500).json({ error: "Failed to process fingerprint scan" });
    }
  });

  app.get("/api/leaves", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT l.*, e.name, e.employee_id as employee_number 
        FROM e_leaves l 
        JOIN e_employees e ON l.employee_id = e.id
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

  app.get("/api/settings", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query("SELECT key, value FROM e_settings WHERE account_id = $1", [account_id]);
      const settings: Record<string, string> = {
        half_day_threshold: '10:00' // Default
      };
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { key, value } = req.body;
    try {
      await query(`
        INSERT INTO e_settings (account_id, key, value) 
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id, key) 
        DO UPDATE SET value = EXCLUDED.value
      `, [account_id, key, value]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update setting" });
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

  // Payroll Endpoints
  app.get("/api/payroll/suggested-breakdown/:employeeId", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const startDate = `${y}-${m}-01`;
    const endDate = new Date(parseInt(y as string), parseInt(m as string), 0).toISOString().split('T')[0];

    try {
      // Get earned per project using historical salary from attendance table
      const earnedResult = await query(`
        SELECT 
          a.project_id, 
          p.name as project_name,
          SUM(
            CASE 
              WHEN e.salary_type = 'Daily' THEN 
                (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) WHEN a.status = 'Half-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) * 0.5 ELSE 0 END)
              WHEN e.salary_type = 'Monthly' THEN 
                (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0 WHEN a.status = 'Half-Day' THEN (COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0) * 0.5 ELSE 0 END)
              WHEN e.salary_type = 'Per-unit' THEN 
                (a.units * COALESCE(NULLIF(a.salary_per_unit, 0), e.salary))
              ELSE 0 
            END + a.allowance
          ) as earned_amount
        FROM e_attendance a
        JOIN e_projects p ON a.project_id = p.id
        JOIN e_employees e ON a.employee_id = e.id
        WHERE a.account_id = $1 AND a.employee_id = $2 AND a.date >= $3 AND a.date <= $4 AND a.deleted_at IS NULL
        GROUP BY a.project_id, p.name
      `, [account_id, employeeId, startDate, endDate]);

      const suggested = earnedResult.rows.map(row => {
        const earned = parseFloat(row.earned_amount || 0);
        return {
          project_id: row.project_id,
          project_name: row.project_name,
          earned: earned // Total earned for this project in this period
        };
      });

      // Now subtract already paid advances for each project
      const finalSuggested = [];
      for (const item of suggested) {
        const paidResult = await query(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM e_expenses
          WHERE account_id = $1 AND employee_id = $2 AND project_id = $3 AND category = 'Salary Advance' AND date >= $4 AND date <= $5 AND deleted_at IS NULL
        `, [account_id, employeeId, item.project_id, startDate, endDate]);
        
        const paid = parseFloat(paidResult.rows[0].total);
        const pending = Math.max(0, item.earned - paid);

        if (pending > 0) {
          finalSuggested.push({
            project_id: item.project_id,
            project_name: item.project_name,
            payable: pending,
            amount: pending.toFixed(2)
          });
        }
      }

      res.json(finalSuggested);
    } catch (err) {
      console.error("Error fetching suggested breakdown:", err);
      res.status(500).json({ error: "Failed to fetch suggested breakdown" });
    }
  });

  app.get("/api/payroll/advances", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { month, year, employee_id } = req.query;
    try {
      let q = `
        SELECT a.*, e.name, e.employee_id as employee_number 
        FROM e_payroll_advances a 
        JOIN e_employees e ON a.employee_id = e.id
        WHERE a.account_id = $1 AND a.deleted_at IS NULL AND e.deleted_at IS NULL
      `;
      const params: any[] = [account_id];
      
      if (month && year) {
        params.push(`${year}-${month}-01`);
        q += ` AND a.date >= $${params.length}::date AND a.date < ($${params.length}::date + interval '1 month')`;
      }
      
      if (employee_id) {
        params.push(employee_id);
        q += ` AND a.employee_id = $${params.length}`;
      }
      
      q += ` ORDER BY a.date DESC`;
      
      const result = await query(q, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch advances" });
    }
  });

  app.post("/api/payroll/advances", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id, amount } = req.body;
    try {
      const result = await query(
        "INSERT INTO e_payroll_advances (account_id, employee_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [account_id, employee_id, amount]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to request advance" });
    }
  });

  app.put("/api/payroll/advances/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { amount, breakdown, date } = req.body;
    try {
      await query("BEGIN");
      
      const result = await query(
        "UPDATE e_payroll_advances SET amount = $1, date = $2 WHERE id = $3 AND account_id = $4 RETURNING *",
        [amount, date, req.params.id, account_id]
      );
      
      if (result.rows.length === 0) {
        await query("ROLLBACK");
        return res.status(404).json({ error: "Advance not found" });
      }

      // Update breakdown
      await query("DELETE FROM e_salary_advance_breakdown WHERE advance_id = $1 AND account_id = $2", [req.params.id, account_id]);
      await query("DELETE FROM e_expenses WHERE advance_id = $1 AND account_id = $2", [req.params.id, account_id]);

      if (breakdown && Array.isArray(breakdown)) {
        for (const item of breakdown) {
          await query(
            "INSERT INTO e_salary_advance_breakdown (account_id, advance_id, project_id, amount) VALUES ($1, $2, $3, $4)",
            [account_id, req.params.id, item.project_id, item.amount]
          );
          
          await query(
            "INSERT INTO e_expenses (account_id, project_id, employee_id, advance_id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [account_id, item.project_id, result.rows[0].employee_id, req.params.id, 'Salary Advance', item.amount, date, `Updated salary advance breakdown for employee ID: ${result.rows[0].employee_id}`]
          );
        }
      }

      await query("COMMIT");
      res.json(result.rows[0]);
    } catch (err) {
      await query("ROLLBACK");
      res.status(500).json({ error: "Failed to update advance" });
    }
  });

  app.delete("/api/payroll/advances/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_payroll_advances SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      // Also soft delete breakdown and expenses
      await query("UPDATE e_salary_advance_breakdown SET deleted_at = CURRENT_TIMESTAMP WHERE advance_id = $1 AND account_id = $2", [req.params.id, account_id]);
      await query("UPDATE e_expenses SET deleted_at = CURRENT_TIMESTAMP WHERE advance_id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete advance" });
    }
  });

  app.get("/api/payroll/loans", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { month, year, employee_id } = req.query;
    try {
      let q = `
        SELECT l.*, e.name, e.employee_id as employee_number 
        FROM e_payroll_loans l 
        JOIN e_employees e ON l.employee_id = e.id
        WHERE l.account_id = $1 AND l.deleted_at IS NULL AND e.deleted_at IS NULL
      `;
      const params: any[] = [account_id];
      
      if (month && year) {
        params.push(`${year}-${month}-01`);
        q += ` AND l.date >= $${params.length}::date AND l.date < ($${params.length}::date + interval '1 month')`;
      }
      
      if (employee_id) {
        params.push(employee_id);
        q += ` AND l.employee_id = $${params.length}`;
      }
      
      q += ` ORDER BY l.date DESC`;
      
      const result = await query(q, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  app.post("/api/payroll/loans", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id, amount, repayment_period, monthly_installment } = req.body;
    try {
      const result = await query(
        "INSERT INTO e_payroll_loans (account_id, employee_id, amount, repayment_period, monthly_installment) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [account_id, employee_id, amount, repayment_period, monthly_installment]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to request loan" });
    }
  });

  app.put("/api/payroll/loans/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { amount } = req.body;
    try {
      const result = await query(
        "UPDATE e_payroll_loans SET amount = $1 WHERE id = $2 AND account_id = $3 AND deleted_at IS NULL RETURNING *",
        [amount, req.params.id, account_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Loan not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update loan" });
    }
  });

  app.delete("/api/payroll/loans/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_payroll_loans SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete loan" });
    }
  });

  app.get("/api/payroll/summary", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { month, year } = req.query;
    
    const targetDate = (month && year) ? `${year}-${month}-01` : 'CURRENT_DATE';
    const dateFilter = (month && year) ? `$2::date` : 'CURRENT_DATE';
    
    try {
      // Get all employees with their salary info and attendance counts for the month
      const employees = await query(`
        SELECT e.id, e.employee_id as employee_number, e.name, e.salary, e.salary_type, e.avatar_url, e.role_id, e.section_id,
               (SELECT project_id FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL ORDER BY date DESC, id DESC LIMIT 1) as project_id,
               COALESCE((SELECT COUNT(*) FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND status = 'Full-Day' AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as present_days,
               COALESCE((SELECT COUNT(*) FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND status = 'Half-Day' AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as half_days,
               COALESCE((SELECT SUM(units) FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as total_units,
               COALESCE((SELECT SUM(allowance) FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as total_allowance,
               COALESCE((SELECT SUM(
                 CASE 
                   WHEN e.salary_type = 'Daily' THEN 
                     (CASE WHEN status = 'Full-Day' THEN COALESCE(NULLIF(salary_per_unit, 0), e.salary) WHEN status = 'Half-Day' THEN COALESCE(NULLIF(salary_per_unit, 0), e.salary) * 0.5 ELSE 0 END)
                   WHEN e.salary_type = 'Monthly' THEN 
                     (CASE WHEN status = 'Full-Day' THEN COALESCE(NULLIF(salary_per_unit, 0), e.salary) / 30.0 WHEN status = 'Half-Day' THEN (COALESCE(NULLIF(salary_per_unit, 0), e.salary) / 30.0) * 0.5 ELSE 0 END)
                   WHEN e.salary_type = 'Per-unit' THEN 
                     (units * COALESCE(NULLIF(salary_per_unit, 0), e.salary))
                   ELSE 0 
                 END + allowance
               ) FROM e_attendance WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as total_earned,
               COALESCE((SELECT SUM(amount) FROM e_payroll_advances WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as total_advances,
               COALESCE((SELECT SUM(amount) FROM e_payroll_loans WHERE employee_id = e.id AND account_id = e.account_id AND deleted_at IS NULL AND date >= date_trunc('month', ${dateFilter}) AND date < (date_trunc('month', ${dateFilter}) + interval '1 month')), 0) as total_loan_installments
        FROM e_employees e
        WHERE e.account_id = $1 AND e.deleted_at IS NULL
      `, [account_id, ...(month && year ? [targetDate] : [])]);
      
      res.json(employees.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch payroll summary" });
    }
  });

  // Expenses Endpoints
  app.get("/api/expenses", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { project_id, start_date, end_date, month, year } = req.query;
    try {
      let q = `
        SELECT ex.*, p.name as project_name 
        FROM e_expenses ex 
        LEFT JOIN e_projects p ON ex.project_id = p.id
        WHERE ex.account_id = $1 AND ex.deleted_at IS NULL
      `;
      const params: any[] = [account_id];

      if (project_id) {
        params.push(project_id);
        q += ` AND ex.project_id = $${params.length}`;
      }

      if (start_date && end_date) {
        params.push(start_date);
        q += ` AND ex.date >= $${params.length}`;
        params.push(end_date);
        q += ` AND ex.date <= $${params.length}`;
      } else if (month && year) {
        params.push(`${year}-${month}-01`);
        q += ` AND ex.date >= $${params.length}::date AND ex.date < ($${params.length}::date + interval '1 month')`;
      }

      q += ` ORDER BY ex.date DESC, ex.created_at DESC`;

      const result = await query(q, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/reports/project-expenses", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { month, year } = req.query;
    
    try {
      // 1. Get all projects
      const projectsResult = await query(
        "SELECT id, name FROM e_projects WHERE account_id = $1 AND deleted_at IS NULL",
        [account_id]
      );
      const projects = projectsResult.rows;

      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0];

      const reportData = [];

      for (const project of projects) {
        // 2. Get Paid Expenses (Salary Advances recorded in e_expenses)
        const paidResult = await query(
          `SELECT COALESCE(SUM(amount), 0) as total 
           FROM e_expenses 
           WHERE account_id = $1 AND project_id = $2 AND category = 'Salary Advance'
           AND date >= $3 AND date <= $4 AND deleted_at IS NULL`,
          [account_id, project.id, startDate, endDate]
        );
        const paidAmount = parseFloat(paidResult.rows[0].total);

        // 3. Get Earned Salary (Total Expense based on attendance)
        const earnedResult = await query(
          `SELECT 
            SUM(
              CASE 
                WHEN e.salary_type = 'Daily' THEN 
                  (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) WHEN a.status = 'Half-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) * 0.5 ELSE 0 END)
                WHEN e.salary_type = 'Monthly' THEN 
                  (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0 WHEN a.status = 'Half-Day' THEN (COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0) * 0.5 ELSE 0 END)
                WHEN e.salary_type = 'Per-unit' THEN 
                  (a.units * COALESCE(NULLIF(a.salary_per_unit, 0), e.salary))
                ELSE 0 
              END + a.allowance
            ) as total_earned
           FROM e_attendance a
           JOIN e_employees e ON a.employee_id = e.id
           WHERE a.account_id = $1 AND a.project_id = $2
           AND a.date >= $3 AND a.date <= $4 
           AND a.deleted_at IS NULL`,
          [account_id, project.id, startDate, endDate]
        );

        const totalEarned = parseFloat(earnedResult.rows[0].total_earned || 0);

        reportData.push({
          project_id: project.id,
          project_name: project.name,
          paid_expenses: paidAmount,
          pending_expenses: Math.max(0, totalEarned - paidAmount),
          total_expenses: Math.max(paidAmount, totalEarned)
        });
      }

      res.json(reportData);
    } catch (err) {
      console.error("Error generating project expense report:", err);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/reports/project-expenses/:projectId/breakdown", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { projectId } = req.params;
    const { month, year } = req.query;
    
    try {
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0];

      // Get all employees who either worked or received an advance on this project
      const employeesResult = await query(
        `SELECT DISTINCT e.id, e.name, e.employee_id as employee_number, e.salary, e.salary_type
         FROM e_employees e
         LEFT JOIN e_attendance a ON e.id = a.employee_id AND a.project_id = $2 AND a.date >= $3 AND a.date <= $4 AND a.status = 'Full-Day' AND a.deleted_at IS NULL
         LEFT JOIN e_expenses ex ON e.id = ex.employee_id AND ex.project_id = $2 AND ex.date >= $3 AND ex.date <= $4 AND ex.category = 'Salary Advance' AND ex.deleted_at IS NULL
         WHERE e.account_id = $1 AND e.deleted_at IS NULL
         AND (a.id IS NOT NULL OR ex.id IS NOT NULL)`,
        [account_id, projectId, startDate, endDate]
      );
      
      const breakdown = [];

      for (const emp of employeesResult.rows) {
        // Get earned salary using historical data from attendance table
        const attendanceResult = await query(
          `SELECT 
            COUNT(CASE WHEN a.status = 'Full-Day' THEN 1 END) as full_days,
            COUNT(CASE WHEN a.status = 'Half-Day' THEN 1 END) as half_days,
            SUM(
              CASE 
                WHEN e.salary_type = 'Daily' THEN 
                  (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) WHEN a.status = 'Half-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) * 0.5 ELSE 0 END)
                WHEN e.salary_type = 'Monthly' THEN 
                  (CASE WHEN a.status = 'Full-Day' THEN COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0 WHEN a.status = 'Half-Day' THEN (COALESCE(NULLIF(a.salary_per_unit, 0), e.salary) / 30.0) * 0.5 ELSE 0 END)
                WHEN e.salary_type = 'Per-unit' THEN 
                  (a.units * COALESCE(NULLIF(a.salary_per_unit, 0), e.salary))
                ELSE 0 
              END + a.allowance
            ) as total_earned
           FROM e_attendance a
           JOIN e_employees e ON a.employee_id = e.id
           WHERE a.account_id = $1 AND a.employee_id = $2 AND a.project_id = $3
           AND a.date >= $4 AND a.date <= $5 AND a.deleted_at IS NULL`,
          [account_id, emp.id, projectId, startDate, endDate]
        );
        
        const earned = parseFloat(attendanceResult.rows[0].total_earned || 0);
        const workingDays = parseFloat(attendanceResult.rows[0].full_days) + (parseFloat(attendanceResult.rows[0].half_days) * 0.5);

        // Get paid advances
        const paidResult = await query(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM e_expenses
           WHERE account_id = $1 AND employee_id = $2 AND project_id = $3
           AND category = 'Salary Advance' AND date >= $4 AND date <= $5 AND deleted_at IS NULL`,
          [account_id, emp.id, projectId, startDate, endDate]
        );
        
        const paid = parseFloat(paidResult.rows[0].total);

        breakdown.push({
          employee_id: emp.id,
          employee_name: emp.name,
          employee_number: emp.employee_number,
          working_days: workingDays,
          earned_salary: earned,
          paid_advances: paid,
          pending: Math.max(0, earned - paid)
        });
      }

      res.json(breakdown);
    } catch (err) {
      console.error("Error fetching project breakdown:", err);
      res.status(500).json({ error: "Failed to fetch project breakdown" });
    }
  });

  app.post("/api/expenses", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { project_id, employee_id, category, amount, date, description } = req.body;
    try {
      const result = await query(
        "INSERT INTO e_expenses (account_id, project_id, employee_id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          account_id, 
          project_id === 0 ? null : project_id, 
          employee_id || null,
          category, 
          amount, 
          date || new Date().toISOString().split('T')[0], 
          description
        ]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error adding expense:", err);
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  app.delete("/api/expenses/:id", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      await query("UPDATE e_expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2", [req.params.id, account_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Salary Advance with Breakdown
  app.post("/api/payroll/advances-with-breakdown", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    const { employee_id, amount, breakdown, date } = req.body; // breakdown: [{ project_id, amount }]
    
    try {
      // Start transaction
      await query("BEGIN");
      
      // 1. Record the advance
      const advanceResult = await query(
        "INSERT INTO e_payroll_advances (account_id, employee_id, amount, date) VALUES ($1, $2, $3, $4) RETURNING id",
        [account_id, employee_id, amount, date || new Date().toISOString().split('T')[0]]
      );
      const advanceId = advanceResult.rows[0].id;
      
      // 2. Record the breakdown
      if (breakdown && Array.isArray(breakdown)) {
        for (const item of breakdown) {
          await query(
            "INSERT INTO e_salary_advance_breakdown (account_id, advance_id, project_id, amount) VALUES ($1, $2, $3, $4)",
            [account_id, advanceId, item.project_id, item.amount]
          );
          
          // 3. Also record as an expense for the project
          await query(
            "INSERT INTO e_expenses (account_id, project_id, employee_id, advance_id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [account_id, item.project_id, employee_id, advanceId, 'Salary Advance', item.amount, date || new Date().toISOString().split('T')[0], `Salary advance breakdown for employee ID: ${employee_id}`]
          );
        }
      }
      
      await query("COMMIT");
      res.json({ success: true, advance_id: advanceId });
    } catch (err) {
      await query("ROLLBACK");
      console.error("Error recording advance with breakdown:", err);
      res.status(500).json({ error: "Failed to record advance with breakdown" });
    }
  });

  app.get("/api/payroll/advances/:id/breakdown", authenticate, async (req: any, res) => {
    const { account_id } = req.user;
    try {
      const result = await query(`
        SELECT b.*, p.name as project_name 
        FROM e_salary_advance_breakdown b
        JOIN e_projects p ON b.project_id = p.id
        WHERE b.advance_id = $1 AND b.account_id = $2 AND b.deleted_at IS NULL
      `, [req.params.id, account_id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch advance breakdown" });
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
    
    // Catch-all route for SPA fallback
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Fallback to root index.html if dist/index.html is missing (e.g. during some build phases)
        const rootIndexPath = path.join(process.cwd(), "index.html");
        if (fs.existsSync(rootIndexPath)) {
          res.sendFile(rootIndexPath);
        } else {
          res.status(404).send("Not Found");
        }
      }
    });
  }
}

if (process.env.VERCEL !== "1") {
  const start = async () => {
    try {
      if (process.env.DATABASE_URL) {
        await initDb();
      } else {
        console.warn("DATABASE_URL environment variable is missing. Database initialization skipped.");
      }
      await setupApp();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error("Fatal server error during startup:", err);
      // Even if database fails, we should try to start the app to pass health checks
      // and allow the user to see error messages in logs or UI
      try {
        await setupApp();
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT} (with startup errors)`);
        });
      } catch (setupErr) {
        console.error("Failed to even setup app:", setupErr);
        process.exit(1);
      }
    }
  };
  start();
}

export default app;
