import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './components/Dashboard';
import CoreModules from './components/CoreModules';
import EmployeeProfile from './components/EmployeeProfile';
import AttendanceLogging from './components/AttendanceLogging';
import LeaveManagement from './components/LeaveManagement';
import PayrollManagement from './components/PayrollManagement';
import ExpenseManagement from './components/ExpenseManagement';
import Directory from './components/Directory';
import Login from './components/Login';
import Settings from './components/Settings';
import AccountManagement from './components/AccountManagement';
import { User } from './types';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ems_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('ems_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ems_user');
  };

  if (loading) return null;

  return (
    <ThemeProvider>
      {!user ? (
        <>
          {(() => { document.title = 'EMS Master - Login'; return null; })()}
          <Login onLogin={handleLogin} />
        </>
      ) : (
        <Router>
          <Layout onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/modules" element={<CoreModules />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<AttendanceLogging />} />
              <Route path="/leave" element={<LeaveManagement />} />
              <Route path="/payroll" element={<PayrollManagement />} />
              <Route path="/expenses" element={<ExpenseManagement />} />
              <Route path="/settings" element={user.role === 'standard' ? <Navigate to="/" replace /> : <Settings />} />
              <Route path="/accounts" element={user.role === 'super_admin' ? <AccountManagement /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      )}
    </ThemeProvider>
  );
}
