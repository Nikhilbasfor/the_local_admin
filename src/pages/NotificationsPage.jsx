import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Bell, 
  Search, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Edit3, 
  FileCheck, 
  UserCheck, 
  Clock, 
  Filter 
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [guideFilter, setGuideFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), (snapshot) => {
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
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading notifications:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'guide_approved':
        return <span className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full flex items-center gap-1 w-max"><UserCheck className="w-3.5 h-3.5" /> Guide Approved</span>;
      case 'guide_rejected':
        return <span className="px-2.5 py-1 text-xs font-bold text-rose-800 bg-rose-100 rounded-full flex items-center gap-1 w-max"><XCircle className="w-3.5 h-3.5" /> Guide Rejected</span>;
      case 'guide_info_needed':
        return <span className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-full flex items-center gap-1 w-max"><HelpCircle className="w-3.5 h-3.5" /> Info Requested</span>;
      case 'itinerary_approved':
        return <span className="px-2.5 py-1 text-xs font-bold text-teal-800 bg-teal-100 rounded-full flex items-center gap-1 w-max"><FileCheck className="w-3.5 h-3.5" /> Itinerary Approved</span>;
      case 'itinerary_changes':
        return <span className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-full flex items-center gap-1 w-max"><Edit3 className="w-3.5 h-3.5" /> Itinerary Changes</span>;
      case 'itinerary_rejected':
        return <span className="px-2.5 py-1 text-xs font-bold text-rose-800 bg-rose-100 rounded-full flex items-center gap-1 w-max"><XCircle className="w-3.5 h-3.5" /> Itinerary Rejected</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 rounded-full w-max">{type || 'System'}</span>;
    }
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return 'N/A';
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString('en-IN', {
        dateStyle: 'medium', timeStyle: 'short'
      });
    }
    return 'N/A';
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = 
      (n.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.experienceTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    if (guideFilter.trim() && !(n.userId || '').toLowerCase().includes(guideFilter.trim().toLowerCase())) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0F6E56]" /> System Notifications Log
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Complete audit trail of automated push & mobile notifications sent to guides.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#ECFDF5] border border-[#E8DFD0] rounded-xl text-xs font-bold text-[#0F6E56] focus:outline-none"
          >
            <option value="ALL">All Notification Types</option>
            <option value="guide_approved">Guide Approved</option>
            <option value="guide_rejected">Guide Rejected</option>
            <option value="guide_info_needed">Guide Info Needed</option>
            <option value="itinerary_approved">Itinerary Approved</option>
            <option value="itinerary_changes">Itinerary Changes</option>
            <option value="itinerary_rejected">Itinerary Rejected</option>
          </select>

          {/* Guide ID Filter */}
          <input
            type="text"
            placeholder="Filter by Guide User ID..."
            value={guideFilter}
            onChange={(e) => setGuideFilter(e.target.value)}
            className="px-3 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none"
          />

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
            <input
              type="text"
              placeholder="Search message text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Notification Type</th>
                <th className="py-3.5 px-4">Recipient Guide (UID)</th>
                <th className="py-3.5 px-6">Message & Feedback</th>
                <th className="py-3.5 px-4">Associated Experience</th>
                <th className="py-3.5 px-4 rounded-r-xl">Read Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#5F5E5A] text-xs">
                    Loading notification logs...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#5F5E5A] text-xs">
                    No notification records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((n) => (
                  <tr key={n.id} className="hover:bg-[#ECFDF5]/30 transition-colors">
                    <td className="py-4 px-6 text-xs text-[#5F5E5A] whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getTypeBadge(n.type)}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-[#0F6E56]">
                      {n.userId ? `${n.userId.substring(0, 12)}...` : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-xs text-[#2C2C2A] max-w-sm">
                      <p className="font-semibold">{n.message || 'N/A'}</p>
                      {n.feedback && (
                        <p className="mt-1 text-[11px] text-[#5F5E5A] italic bg-amber-50 p-2 rounded-lg border border-[#EF9F27]/30">
                          Feedback: {n.feedback}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5F5E5A]">
                      {n.experienceTitle ? (
                        <span className="font-semibold text-[#2C2C2A]">{n.experienceTitle}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {n.read ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Read by Guide</span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Unread</span>
                      )}
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
