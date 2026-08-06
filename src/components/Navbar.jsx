import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onMenuToggle, title = "Dashboard" }) {
  const { adminData } = useAuth();
  const { pendingGuidesCount, pendingItinerariesCount } = useBadges();
  const navigate = useNavigate();

  const totalPending = pendingGuidesCount + pendingItinerariesCount;

  return (
    <header className="h-16 bg-white border-b border-[#E8DFD0] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-[#2C2C2A] p-2 hover:bg-[#ECFDF5] rounded-xl transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] tracking-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Notification Badge Button */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-[#5F5E5A] hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-xl transition-colors"
          title="Notifications Log"
        >
          <Bell className="w-5 h-5" />
          {totalPending > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D85A30] rounded-full ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Admin verified badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#ECFDF5] text-[#0F6E56] border border-[#0F6E56]/20 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Admin</span>
        </div>
      </div>
    </header>
  );
}
