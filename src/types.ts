export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'standard';
  account_id: number;
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
  avatar_url: string;
  role?: string; // For display
  section?: string; // For display
}

export interface Attendance {
  id: number;
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  section_id: number;
  name?: string;
  avatar_url?: string;
  section?: string; // For display
}

export interface Leave {
  id: number;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  applied_on: string;
  name?: string;
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
