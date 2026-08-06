import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  IndianRupee, 
  User, 
  Compass,
  CheckCircle
} from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setBookings(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading bookings:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert(`Failed to update booking status: ${err.message}`);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      (b.experienceTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.travellerId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.guideId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.id || '').includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full flex items-center gap-1 w-max"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full w-max">{status || 'N/A'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#0F6E56]" /> Bookings & Reservations
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Monitor all traveller bookings, update order statuses, and track revenue.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-[#ECFDF5] p-1 rounded-xl border border-[#E8DFD0]">
            {['ALL', 'pending', 'confirmed', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  statusFilter === st 
                    ? 'bg-[#0F6E56] text-white shadow-xs' 
                    : 'text-[#5F5E5A] hover:text-[#0F6E56]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
            <input
              type="text"
              placeholder="Search title, traveller ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3.5 px-6">Experience Title / ID</th>
                <th className="py-3.5 px-4">Traveller ID</th>
                <th className="py-3.5 px-4">Guide ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Guests</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-6 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#5F5E5A] text-xs">
                    Loading booking records...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#5F5E5A] text-xs">
                    No bookings found matching filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ECFDF5]/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#2C2C2A]">
                      <div className="truncate max-w-[200px]" title={b.experienceTitle || b.id}>
                        {b.experienceTitle || 'Untitled Experience'}
                      </div>
                      <span className="text-[10px] text-[#5F5E5A] font-mono block font-normal">Booking ID: {b.id}</span>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-[#5F5E5A]">
                      {b.travellerId ? `${b.travellerId.substring(0, 10)}...` : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-[#5F5E5A]">
                      {b.guideId ? `${b.guideId.substring(0, 10)}...` : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#2C2C2A] font-medium">
                      <div>{b.date || 'N/A'}</div>
                      {b.timeSlot && <span className="text-[10px] text-[#5F5E5A] block">{b.timeSlot}</span>}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-[#2C2C2A]">{b.guests || 1}</td>
                    <td className="py-4 px-4 font-bold text-[#0F6E56]">₹{b.totalAmount || 0}</td>
                    <td className="py-4 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-4 px-6 text-right">
                      <select
                        value={b.status || 'pending'}
                        onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-[#E8DFD0] rounded-xl text-xs font-bold text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56] shadow-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
