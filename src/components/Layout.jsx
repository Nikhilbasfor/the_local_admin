import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/': return 'Dashboard Overview';
      case '/guide-approvals': return 'Guide Approvals & Verification';
      case '/itinerary-review': return 'Itinerary Review & Verification';
      case '/users': return 'User Management';
      case '/experiences': return 'Experiences & Tours';
      case '/bookings': return 'Bookings & Orders';
      case '/reviews': return 'Reviews & Ratings';
      case '/notifications': return 'System Notifications Log';
      case '/settings': return 'System & Firebase Settings';
      default: return 'Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-[#ECFDF5]/60 flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          title={getPageTitle(location.pathname)}
        />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
