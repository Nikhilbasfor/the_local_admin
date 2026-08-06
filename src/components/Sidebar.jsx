import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  MapPin, 
  Users, 
  Compass, 
  Calendar, 
  Star, 
  Bell, 
  Settings, 
  LogOut,
  Mountain,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';

export default function Sidebar({ isOpen, onClose }) {
  const { logout, adminData } = useAuth();
  const { pendingGuidesCount, pendingItinerariesCount } = useBadges();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { 
      name: 'Guide Approvals', 
      path: '/guide-approvals', 
      icon: UserCheck,
      badge: pendingGuidesCount > 0 ? pendingGuidesCount : null,
      badgeColor: 'bg-[#D85A30]'
    },
    { 
      name: 'Itinerary Review', 
      path: '/itinerary-review', 
      icon: MapPin,
      badge: pendingItinerariesCount > 0 ? pendingItinerariesCount : null,
      badgeColor: 'bg-[#EF9F27]'
    },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Experiences', path: '/experiences', icon: Compass },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Reviews', path: '/reviews', icon: Star },
    { name: 'Notifications Log', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity" 
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E8DFD0] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Header */}
        <div>
          <div className="h-16 px-5 border-b border-[#E8DFD0] flex items-center justify-between bg-[#ECFDF5]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center shadow-md shadow-[#0F6E56]/20">
                <Mountain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#2C2C2A] tracking-tight leading-none">YatraKi</h1>
                <span className="text-xs font-semibold text-[#0F6E56] tracking-wider uppercase">Admin Portal</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="lg:hidden text-[#5F5E5A] hover:text-[#2C2C2A] p-1 rounded-lg hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150
                    ${isActive 
                      ? 'bg-[#0F6E56] text-white shadow-sm shadow-[#0F6E56]/30 font-semibold' 
                      : 'text-[#5F5E5A] hover:bg-[#ECFDF5] hover:text-[#0F6E56]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${item.badgeColor || 'bg-[#D85A30]'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="p-3 border-t border-[#E8DFD0] bg-[#ECFDF5]/30">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8DFD0]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] flex items-center justify-center font-bold text-xs shrink-0">
                {adminData?.fullName ? adminData.fullName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2C2C2A] truncate">
                  {adminData?.fullName || 'System Administrator'}
                </p>
                <p className="text-[10px] text-[#0F6E56] font-mono truncate font-bold">
                  PIN Auth Active
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Lock / Logout"
              className="p-1.5 text-[#5F5E5A] hover:text-[#D85A30] hover:bg-[#FDF0EC] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
