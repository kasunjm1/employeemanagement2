import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Clock, 
  Umbrella, 
  CreditCard, 
  TrendingUp, 
  UserPlus, 
  GraduationCap, 
  Package, 
  FileText, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  { 
    id: 'directory', 
    label: 'Employee', 
    description: 'Manage staff profiles and organization structure',
    icon: Users, 
    path: '/directory',
    color: 'bg-blue-50 text-blue-600'
  },
  { 
    id: 'attendance', 
    label: 'Attendance Tracking', 
    description: 'Monitor daily attendance and work hours',
    icon: Clock, 
    path: '/attendance',
    color: 'bg-emerald-50 text-emerald-600'
  },
  { 
    id: 'leaves', 
    label: 'Leave Management', 
    description: 'Track leave requests and balances',
    icon: Umbrella, 
    path: '/leaves',
    color: 'bg-amber-50 text-amber-600'
  },
  { 
    id: 'payroll', 
    label: 'Payroll & Benefits', 
    description: 'Manage salaries, bonuses and deductions',
    icon: CreditCard, 
    path: '#',
    color: 'bg-purple-50 text-purple-600'
  },
  { 
    id: 'performance', 
    label: 'Performance Reviews', 
    description: 'Evaluate employee performance and goals',
    icon: TrendingUp, 
    path: '#',
    color: 'bg-rose-50 text-rose-600'
  },
  { 
    id: 'recruitment', 
    label: 'Recruitment', 
    description: 'Manage job postings and candidates',
    icon: UserPlus, 
    path: '#',
    color: 'bg-indigo-50 text-indigo-600'
  },
  { 
    id: 'training', 
    label: 'Training & Development', 
    description: 'Assign and track employee training',
    icon: GraduationCap, 
    path: '#',
    color: 'bg-teal-50 text-teal-600'
  },
  { 
    id: 'assets', 
    label: 'Assets & Inventory', 
    description: 'Track company equipment and assets',
    icon: Package, 
    path: '#',
    color: 'bg-orange-50 text-orange-600'
  },
  { 
    id: 'documents', 
    label: 'Document Management', 
    description: 'Store and manage employee documents',
    icon: FileText, 
    path: '#',
    color: 'bg-slate-50 text-slate-600'
  },
  { 
    id: 'settings', 
    label: 'System Settings', 
    description: 'Configure application and user permissions',
    icon: Settings, 
    path: '/settings',
    color: 'bg-gray-50 text-gray-600'
  }
];

const CoreModules = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <section>
        <span className="font-body text-[0.6875rem] font-bold text-on-surface-variant tracking-widest uppercase block mb-1">System Hub</span>
        <h2 className="font-headline font-bold text-3xl text-on-surface tracking-tight">Core Modules</h2>
        <p className="font-body text-on-surface-variant mt-2 max-w-2xl">
          Access all integrated modules of the Nexus EMS Master. Each module is designed for high-precision operational oversight.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, i) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link 
              to={module.path}
              className="group block bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all h-full"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                  <module.icon size={28} />
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={16} className="text-primary" />
                </div>
              </div>
              
              <h3 className="font-headline font-bold text-xl text-on-surface mb-2">{module.label}</h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                {module.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CoreModules;
