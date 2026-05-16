import { Outlet } from 'react-router-dom';
import ProtectedLayout from '../shared/ProtectedLayout';
import { LayoutDashboard, Users, Shield, Layers, Settings, ClipboardList, Activity, BookOpen, Bell, Gift, Ticket, Key, Puzzle, Bot, MessageSquare, Workflow, Cpu, FileEdit, Mic } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Roles', href: '/admin/roles', icon: <Shield className="w-5 h-5" /> },
  { label: 'Categories', href: '/admin/categories', icon: <Layers className="w-5 h-5" /> },
  { label: 'Products', href: '/admin/products', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Blog', href: '/admin/blog', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Tickets', href: '/admin/tickets', icon: <Ticket className="w-5 h-5" /> },
  { label: 'Announcements', href: '/admin/announcements', icon: <Bell className="w-5 h-5" /> },
  { label: 'Gift Cards', href: '/admin/giftcards', icon: <Gift className="w-5 h-5" /> },
  { label: 'API Keys', href: '/admin/api-keys', icon: <Key className="w-5 h-5" /> },
  { label: 'Plugins', href: '/admin/plugins', icon: <Puzzle className="w-5 h-5" /> },
  { label: 'AI Providers', href: '/admin/ai-providers', icon: <Bot className="w-5 h-5" /> },
  { label: 'AI Config', href: '/admin/ai-config', icon: <Cpu className="w-5 h-5" /> },
  { label: 'Chatbot', href: '/admin/chatbot', icon: <MessageSquare className="w-5 h-5" /> },
  { label: 'Workflows', href: '/admin/workflows', icon: <Workflow className="w-5 h-5" /> },
  { label: 'Config', href: '/admin/config', icon: <Settings className="w-5 h-5" /> },
  { label: 'AI Content', href: '/admin/ai-content', icon: <FileEdit className="w-5 h-5" /> },
  { label: 'Voice', href: '/admin/voice', icon: <Mic className="w-5 h-5" /> },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: <Activity className="w-5 h-5" /> },
];

export default function AdminLayout() {
  return (
    <ProtectedLayout items={navItems} title="Admin Panel" subtitle="Platform administration">
      <Outlet />
    </ProtectedLayout>
  );
}
