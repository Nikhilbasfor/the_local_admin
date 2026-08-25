import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, 
  UserCheck, 
  Compass, 
  Calendar, 
  IndianRupee, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGuides: 0,
    totalExperiences: 0,
    totalBookings: 0,
    totalRevenue: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Users & Guides count
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let userCount = 0;
      let guideCount = 0;
      snapshot.forEach(docSnap => {
        userCount++;
        const u = docSnap.data();
        if (u.role && u.role.toUpperCase() === 'GUIDE') {
          guideCount++;
        }
      });
      setStats(prev => ({ ...prev, totalUsers: userCount, totalGuides: guideCount }));
    }, (err) => console.warn("Dashboard users error:", err));

    // 2. Experiences count & category breakdown across both collections
    let expList = [];
    let itinList = [];

    const updateExperiencesStats = () => {
      const map = {};
      expList.forEach((e) => map[e.id] = e);
      itinList.forEach((i) => map[i.id] = i);
      const combined = Object.values(map);

      const categoriesMap = {};
      combined.forEach((exp) => {
        const cat = exp.category || 'Uncategorized';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
      });

      const chartData = Object.keys(categoriesMap).map((catName) => ({
        name: catName,
        count: categoriesMap[catName]
      }));

      setStats((prev) => ({ ...prev, totalExperiences: combined.length }));
      setCategoryChartData(chartData);
    };

    const unsubExp = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      expList = [];
      snapshot.forEach((docSnap) => expList.push({ id: docSnap.id, ...docSnap.data() }));
      updateExperiencesStats();
    }, (err) => console.warn("Dashboard experiences error:", err));

    const unsubItin = onSnapshot(collection(db, 'itineraries'), (snapshot) => {
      itinList = [];
      snapshot.forEach((docSnap) => itinList.push({ id: docSnap.id, ...docSnap.data() }));
      updateExperiencesStats();
    }, (err) => console.warn("Dashboard itineraries error:", err));

    // 3. Bookings count, revenue & recent 10 list
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      let count = 0;
      let revenue = 0;
      const allBookings = [];

      snapshot.forEach(docSnap => {
        count++;
        const b = { id: docSnap.id, ...docSnap.data() };
        if (b.status === 'completed') {
          revenue += Number(b.totalAmount || 0);
        }
        allBookings.push(b);
      });

      // Sort recent 10 bookings by createdAt descending
      allBookings.sort((a, b) => {
        const tA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const tB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return tB - tA;
      });

      setRecentBookings(allBookings.slice(0, 10));
      setStats(prev => ({ ...prev, totalBookings: count, totalRevenue: revenue }));
      setLoading(false);
    }, (err) => {
      console.warn("Dashboard bookings error:", err);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubExp();
      unsubItin();
      unsubBookings();
    };
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Pending</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100 rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-[#5F5E5A] bg-gray-100 rounded-full w-max">{status || 'N/A'}</span>;
    }
  };

  const CATEGORY_COLORS = ['#0F6E56', '#EF9F27', '#D85A30', '#2563EB', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="space-y-8">
      {/* Stats Header Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold text-[#2C2C2A] mt-1">{stats.totalUsers}</h3>
            <p className="text-[11px] text-[#0F6E56] font-medium mt-1">Travellers & Guides</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#0F6E56] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Guides */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Total Guides</p>
            <h3 className="text-2xl font-bold text-[#2C2C2A] mt-1">{stats.totalGuides}</h3>
            <p className="text-[11px] text-[#EF9F27] font-medium mt-1">Himalayan Experts</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8E6] text-[#EF9F27] flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Experiences */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Experiences</p>
            <h3 className="text-2xl font-bold text-[#2C2C2A] mt-1">{stats.totalExperiences}</h3>
            <p className="text-[11px] text-[#0F6E56] font-medium mt-1">Tours & Treks</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#0F6E56] flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Total Bookings</p>
            <h3 className="text-2xl font-bold text-[#2C2C2A] mt-1">{stats.totalBookings}</h3>
            <p className="text-[11px] text-blue-600 font-medium mt-1">All Recorded</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-xl font-bold text-[#0F6E56] mt-1 truncate">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="text-[11px] text-[#5F5E5A] mt-1">From Completed Bookings</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#0F6E56] flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content: Chart & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#2C2C2A]">Experiences by Category</h3>
              <p className="text-xs text-[#5F5E5A]">Breakdown of travel experiences across categories</p>
            </div>
            <div className="px-3 py-1 bg-[#ECFDF5] text-[#0F6E56] text-xs font-semibold rounded-full flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live Firestore Sync
            </div>
          </div>

          {categoryChartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" vertical={false} />
                  <XAxis dataKey="name" stroke="#5F5E5A" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#5F5E5A" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8DFD0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: '#ECFDF5' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-[#5F5E5A] bg-[#ECFDF5]/30 rounded-2xl border border-dashed border-[#E8DFD0]">
              <Compass className="w-8 h-8 text-[#0F6E56]/40 mb-2 animate-bounce" />
              <p className="text-sm font-medium">No experience categories found in Firestore yet.</p>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#0F6E56] to-[#094D3C] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
                Priority Task
              </span>
              <h3 className="text-xl font-bold">Guide Verification</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Review pending guide verification requests and document proofs (Aadhar, Certificates).
              </p>
              <button
                onClick={() => navigate('/guide-approvals')}
                className="w-full py-3 px-4 bg-[#EF9F27] hover:bg-[#C97E16] text-[#2C2C2A] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Open Guide Approvals</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#2C2C2A]">Itinerary Audit</h3>
            <p className="text-xs text-[#5F5E5A]">
              Verify day-by-day tour itineraries, highlights, accommodation, and safety guidelines submitted by guides.
            </p>
            <button
              onClick={() => navigate('/itinerary-review')}
              className="w-full py-2.5 px-4 bg-[#ECFDF5] hover:bg-[#0F6E56] text-[#0F6E56] hover:text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-[#0F6E56]/30"
            >
              <span>Review Pending Itineraries</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#2C2C2A]">Recent Bookings</h3>
            <p className="text-xs text-[#5F5E5A]">Showing the latest 10 travel bookings across the platform</p>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="text-xs font-bold text-[#0F6E56] hover:underline flex items-center gap-1"
          >
            <span>View All Bookings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3 px-4 rounded-l-xl">Booking ID / Exp</th>
                <th className="py-3 px-4">Traveller ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Guests</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {recentBookings.length > 0 ? (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ECFDF5]/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#2C2C2A]">
                      <div className="truncate max-w-[200px]" title={b.experienceTitle || b.id}>
                        {b.experienceTitle || b.id}
                      </div>
                      <span className="text-[11px] text-[#5F5E5A] font-normal block">ID: {b.id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F5E5A] font-mono text-xs">
                      {b.travellerId ? `${b.travellerId.substring(0, 10)}...` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-[#2C2C2A] text-xs font-medium">
                      {b.date || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-[#2C2C2A] font-semibold">
                      {b.guests || 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F6E56]">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(b.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#5F5E5A] text-sm">
                    No bookings found in Firestore.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
