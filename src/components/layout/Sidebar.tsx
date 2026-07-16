import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  TrendingUp, 
  UsersRound, 
  Settings, 
  UserCircle, 
  LogOut,
  Trophy,
  Search,
  Plus,
  X,
  ChevronLeft,
  ClipboardList,
  Shield,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import UDLaPovedaLogo from './UDLaPovedaLogo';

const menuItems = [
  { icon: LayoutGrid, label: 'Volver al Portal', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/scouting' },
  { icon: Users, label: 'Jugadores', path: '/players' },
  { icon: UsersRound, label: 'Scouters', path: '/observers' },
  { icon: Trophy, label: 'Necesidades', path: '/needs' },
  { icon: ClipboardList, label: 'Entrenadores', path: '/coaches' },
  { icon: Search, label: 'Comparador', path: '/comparison' },
  { icon: Shield, label: 'Campograma', path: '/campograma' },
  { icon: TrendingUp, label: 'Analítica', path: '/analytics' },
];

interface SidebarProps {
  onClose?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
}

export default function Sidebar({ onClose, onCollapse, isCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuthStore();

  return (
    <aside className="w-full lg:w-64 bg-slate-950 text-white flex flex-col h-full lg:border-r border-slate-800 relative">
      <div className="p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg flex-shrink-0">
            <UDLaPovedaLogo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-tight">U.D. LA POVEDA</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Scouting System</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"
            aria-label="Cerrar menú"
            id="close-sidebar-mobile-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {onCollapse && (
          <button
            onClick={onCollapse}
            className="hidden lg:flex text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-900 transition-colors border border-slate-850"
            aria-label="Colapsar menú"
            title="Ocultar menú"
            id="collapse-sidebar-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
              location.pathname === item.path 
                ? "bg-blue-600 text-white" 
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}

        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
              location.pathname === '/admin' 
                ? "bg-blue-600 text-white" 
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Administración</span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <Link 
          to="/players/new"
          className="w-full bg-slate-50 text-blue-950 font-bold hover:bg-white flex items-center justify-center gap-2 py-2 rounded-lg mb-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs uppercase">Nuevo Jugador</span>
        </Link>
        
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {user?.nombre.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nombre}</p>
            <p className="text-[10px] text-slate-500 uppercase">{user?.role}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="text-slate-500 hover:text-red-400 p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
