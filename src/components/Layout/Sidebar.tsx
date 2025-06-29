import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Calendar,
  FileText,
  Radio,
  Images,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projek', href: '/projek', icon: FolderOpen },
  { name: 'Tugasan', href: '/tugasan', icon: CheckSquare },
  { name: 'Kalendar', href: '/kalendar', icon: Calendar },
  { name: 'Content Harian', href: '/content', icon: FileText },
  { name: 'Host LIVE', href: '/live', icon: Radio },
  { name: 'Template Design', href: '/templates', icon: Images },
  { name: 'Analitik', href: '/analitik', icon: BarChart3 },
  { name: 'Tetapan Akaun', href: '/tetapan', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-16'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}
    >
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          {isOpen && (
            <span className="font-bold text-gray-900 dark:text-white">
              Saffa
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              } group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors`}
              title={!isOpen ? item.name : undefined}
            >
              <item.icon
                className={`${
                  isActive
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                } mr-3 h-5 w-5 flex-shrink-0`}
              />
              {isOpen && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}