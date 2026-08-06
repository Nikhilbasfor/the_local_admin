import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BadgeProvider } from './context/BadgeContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GuideApprovalsPage from './pages/GuideApprovalsPage';
import ItineraryReviewPage from './pages/ItineraryReviewPage';
import UsersPage from './pages/UsersPage';
import ExperiencesPage from './pages/ExperiencesPage';
import BookingsPage from './pages/BookingsPage';
import ReviewsPage from './pages/ReviewsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECFDF5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#0F6E56] tracking-wider uppercase">Loading YatraKi Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BadgeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="guide-approvals" element={<GuideApprovalsPage />} />
              <Route path="itinerary-review" element={<ItineraryReviewPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="experiences" element={<ExperiencesPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BadgeProvider>
    </AuthProvider>
  );
}
