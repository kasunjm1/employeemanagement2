export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'standard';
  account_id: number;
  account_name?: string;
}

export interface Account {
  id: number;
  name: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Section {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  nickname: string;
  role_id: number;
  section_id: number;
  join_date: string;
  employee_id: string;
  status: string;
  mobile: string;
  whatsapp: string;
  nic: string;
  tax_residency: string;
  salary_type: string;
  salary: number;
  avatar_url: string;
  role?: string; // For display
  section?: string; // For display
  project_id?: number;
  project?: string; // For display
}

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  section_id: number;
  project_id: number;
  allowance: number;
  name?: string;
  avatar_url?: string;
  section?: string; // For display
  project?: string; // For display
  employee_number?: string; // For display
}

export interface Leave {
  id: number;
  employee_id: number;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  applied_on: string;
  name?: string;
  employee_number?: string; // For display
}

export interface Alert {
  id: number;
  title: string;
  description: string;
  type: 'warning' | 'approval' | 'celebration';
  created_at: string;
}

export interface DashboardStats {
  totalWorkforce: number;
  activeToday: number;
  absentToday: number;
  growth: string;
}

export interface AppSettings {
  half_day_threshold: string;
  default_check_in: string;
  default_check_out: string;
}

export interface PayrollAdvance {
  id: number;
  employee_id: number;
  amount: number;
  date: string;
  status: string;
  name?: string;
  employee_number?: string; // For display
}

export interface PayrollLoan {
  id: number;
  employee_id: number;
  amount: number;
  date: string;
  status: string;
  repayment_period: number; // in months
  monthly_installment: number;
  name?: string;
  employee_number?: string; // For display
}
