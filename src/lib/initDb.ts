import { query } from './db.ts';

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing. Please set it in Vercel project settings.");
  }
  
  try {
    console.log('Initializing database tables...');
    
    // 1. Core Tables (Essential for app to start)
    await query(`
      CREATE TABLE IF NOT EXISTS e_accounts (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_users (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'standard',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_roles (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, name)
      );

      CREATE TABLE IF NOT EXISTS e_sections (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, name)
      );

      CREATE TABLE IF NOT EXISTS e_projects (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, name)
      );

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
        unit_description TEXT,
        avatar_url TEXT,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, employee_id)
      );
    `);

    // 2. Secondary Tables
    await query(`
      CREATE TABLE IF NOT EXISTS e_employee_details (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE CASCADE,
        title TEXT,
        content TEXT,
        image_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_attendance (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        status TEXT,
        section_id INTEGER REFERENCES e_sections(id),
        project_id INTEGER REFERENCES e_projects(id),
        allowance DECIMAL(10, 2) DEFAULT 0,
        units DECIMAL(10, 2) DEFAULT 0,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_leaves (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days INTEGER NOT NULL,
        status TEXT DEFAULT 'Pending',
        applied_on DATE DEFAULT CURRENT_DATE,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_alerts (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_settings (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        UNIQUE(account_id, key)
      );

      CREATE TABLE IF NOT EXISTS e_payroll_advances (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'Approved',
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_payroll_loans (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        repayment_period INTEGER NOT NULL,
        monthly_installment NUMERIC NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'Approved',
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_expenses (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES e_projects(id) ON DELETE SET NULL,
        employee_id INTEGER REFERENCES e_employees(id) ON DELETE SET NULL,
        advance_id INTEGER REFERENCES e_payroll_advances(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS e_salary_advance_breakdown (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES e_accounts(id) ON DELETE CASCADE,
        advance_id INTEGER REFERENCES e_payroll_advances(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES e_projects(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        deleted_at TIMESTAMP
      );
    `);

    // 3. Migrations & Seeding (Run only if needed)
    const userCount = await query("SELECT COUNT(*) FROM e_users");
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      await seedInitialData();
    }

    console.log('Database initialization complete');
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}

async function seedInitialData() {
  const accountResult = await query("INSERT INTO e_accounts (name) VALUES ('Nexus Global') RETURNING id");
  const accountId = accountResult.rows[0].id;

  await query(`
    INSERT INTO e_users (email, password, name, role, account_id)
    VALUES 
    ('admin@nexus.com', 'admin123', 'System Administrator', 'super_admin', $1),
    ('kasun.jm@gmail.com', 'admin@123', 'Kasun Super Admin', 'super_admin', $1)
  `, [accountId]);

  await query(`
    INSERT INTO e_roles (account_id, name) VALUES ($1, 'Senior Lead'), ($1, 'Logistics Coordinator'), ($1, 'HR Specialist'), ($1, 'Production Manager'), ($1, 'Quality Control')
  `, [accountId]);
  
  await query(`
    INSERT INTO e_sections (account_id, name) VALUES ($1, 'Operations & Logistics'), ($1, 'Logistics'), ($1, 'Human Resources'), ($1, 'Production Wing A'), ($1, 'Admin HQ')
  `, [accountId]);

  await query(`
    INSERT INTO e_employees (account_id, name, nickname, role, join_date, employee_id, mobile, whatsapp, nic, tax_residency, salary_type, avatar_url)
    VALUES 
    ($1, 'Samantha Richards', 'Sam', 'Senior Lead', '2021-10-12', 'EMP-2021-084', '+1 (555) 012-3456', '+1 (555) 012-3456', '198812345678', 'Domestic (Standard)', 'Daily', 'https://picsum.photos/seed/sam/200/200'),
    ($1, 'David Miller', 'Dave', 'Logistics Coordinator', '2022-03-15', 'EMP-2022-012', '+1 (555) 987-6543', '+1 (555) 987-6543', '199012345678', 'Domestic (Standard)', 'Daily', 'https://picsum.photos/seed/david/200/200')
  `, [accountId]);
}
