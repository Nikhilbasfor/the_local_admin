import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  UserCheck, 
  ShieldCheck, 
  ShieldX, 
  CheckCircle, 
  Clock, 
  X, 
  ExternalLink, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar,
  FileText
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL | TRAVELLER | GUIDE
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ uid: docSnap.id, id: docSnap.id, ...docSnap.data() });
      });
      const deduped = Object.values(list.reduce((acc, user) => {
        const ex = acc[user.email];
        if (!ex || (user.createdAt?.seconds||0) > (ex.createdAt?.seconds||0)) acc[user.email] = user;
        return acc;
      }, {}));
      setUsers(deduped);
      setLoading(false);
    }, (err) => {
      console.error("Error loading users:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleToggleVerified = async (user) => {
    try {
      const newStatus = !user.isVerified;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isVerified: newStatus,
        ...(newStatus ? { onboardingComplete: true } : {})
      });
      if (selectedUser?.uid === user.uid) {
        setSelectedUser((prev) => ({ ...prev, isVerified: newStatus }));
      }
    } catch (err) {
      console.error("Error toggling verification:", err);
      alert(`Failed to update verification status: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.uid || '').includes(searchQuery);

    if (!matchesSearch) return false;

    if (roleFilter === 'TRAVELLER') return u.role === 'TRAVELLER';
    if (roleFilter === 'GUIDE') return u.role === 'GUIDE';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0F6E56]" /> User Directory
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Manage all registered travellers and guide accounts across the Himalayan marketplace.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Role Filter Tabs */}
          <div className="flex items-center bg-[#ECFDF5] p-1 rounded-xl border border-[#E8DFD0]">
            {['ALL', 'TRAVELLER', 'GUIDE'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === role 
                    ? 'bg-[#0F6E56] text-white shadow-xs' 
                    : 'text-[#5F5E5A] hover:text-[#0F6E56]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
            <input
              type="text"
              placeholder="Search name, email, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3.5 px-6">User / Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Verified Status</th>
                <th className="py-3.5 px-4">Onboarding</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5F5E5A] text-xs">
                    Loading user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5F5E5A] text-xs">
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr 
                    key={u.uid} 
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-[#ECFDF5]/40 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-semibold text-[#2C2C2A]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0F6E56]/10 text-[#0F6E56] font-bold flex items-center justify-center text-xs shrink-0">
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-[#2C2C2A]">{u.fullName || 'Unnamed User'}</p>
                          <span className="text-[10px] text-[#5F5E5A] font-mono">UID: {u.uid.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5F5E5A]">{u.email || 'N/A'}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'GUIDE' ? 'bg-[#EF9F27]/20 text-[#C97E16]' : 'bg-[#0F6E56]/15 text-[#0F6E56]'
                      }`}>
                        {u.role || 'TRAVELLER'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#2C2C2A]">{u.city || 'N/A'}</td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleVerified(u)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          u.isVerified 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {u.isVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>{u.isVerified ? 'Verified' : 'Unverified'}</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {u.onboardingComplete ? (
                        <span className="text-emerald-700 font-semibold">Complete</span>
                      ) : (
                        <span className="text-gray-400">Incomplete</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-xs font-bold text-[#0F6E56] hover:underline"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Modal for User Profile */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-l border-[#E8DFD0]">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-4">
                <h3 className="text-base font-bold text-[#2C2C2A]">User Profile Details</h3>
                <button onClick={() => setSelectedUser(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A] p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card Header */}
              <div className="flex items-center gap-4 bg-[#ECFDF5]/50 p-4 rounded-2xl border border-[#E8DFD0]">
                {selectedUser.profileImage ? (
                  <img src={selectedUser.profileImage} alt="Profile" className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#0F6E56] text-white font-bold flex items-center justify-center text-lg shadow-xs">
                    {selectedUser.fullName ? selectedUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-[#2C2C2A]">{selectedUser.fullName || 'Unnamed User'}</h4>
                  <span className="text-xs text-[#0F6E56] font-semibold">{selectedUser.role || 'TRAVELLER'}</span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white border border-[#E8DFD0] rounded-xl">
                  <span className="text-[#5F5E5A] font-semibold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#0F6E56]" /> Email:</span>
                  <span className="font-medium text-[#2C2C2A]">{selectedUser.email || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-[#E8DFD0] rounded-xl">
                  <span className="text-[#5F5E5A] font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#0F6E56]" /> Phone:</span>
                  <span className="font-medium text-[#2C2C2A]">{selectedUser.phone || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-[#E8DFD0] rounded-xl">
                  <span className="text-[#5F5E5A] font-semibold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#0F6E56]" /> City / Location:</span>
                  <span className="font-medium text-[#2C2C2A]">{selectedUser.city || 'N/A'}</span>
                </div>

                {selectedUser.age && (
                  <div className="flex items-center justify-between p-3 bg-white border border-[#E8DFD0] rounded-xl">
                    <span className="text-[#5F5E5A] font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#0F6E56]" /> Age:</span>
                    <span className="font-medium text-[#2C2C2A]">{selectedUser.age} years</span>
                  </div>
                )}

                {selectedUser.languages && selectedUser.languages.length > 0 && (
                  <div className="p-3 bg-white border border-[#E8DFD0] rounded-xl space-y-1.5">
                    <span className="text-[#5F5E5A] font-semibold flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#0F6E56]" /> Languages Spoken:</span>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {selectedUser.languages.map((l, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#ECFDF5] text-[#0F6E56] font-bold rounded text-[10px]">{l}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.bio && (
                  <div className="p-3 bg-white border border-[#E8DFD0] rounded-xl space-y-1">
                    <span className="text-[#5F5E5A] font-semibold block">User Bio:</span>
                    <p className="text-[#2C2C2A] leading-relaxed">{selectedUser.bio}</p>
                  </div>
                )}
              </div>

              {/* Verification Toggle */}
              <div className="p-4 bg-[#ECFDF5] border border-[#0F6E56]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-[#2C2C2A]">Verified Status</h5>
                  <p className="text-[10px] text-[#5F5E5A]">Toggles isVerified on user doc</p>
                </div>
                <button
                  onClick={() => handleToggleVerified(selectedUser)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                    selectedUser.isVerified ? 'bg-[#D85A30] hover:bg-[#A83C19]' : 'bg-[#0F6E56] hover:bg-[#094D3C]'
                  }`}
                >
                  {selectedUser.isVerified ? 'Revoke Verification' : 'Verify User'}
                </button>
              </div>

              {/* Special Guide Action Upgrade Button */}
              {selectedUser.role === 'GUIDE' && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const gId = selectedUser.uid;
                      setSelectedUser(null);
                      navigate(`/guide-approvals?guideId=${gId}`);
                    }}
                    className="w-full py-3 px-4 bg-[#EF9F27] hover:bg-[#C97E16] text-[#2C2C2A] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Verification Docs in Guide Approvals</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8DFD0] space-y-2">
              <button
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to delete ${selectedUser.fullName || selectedUser.email} from the database?`)) {
                    try {
                      await deleteDoc(doc(db, 'users', selectedUser.uid));
                      setSelectedUser(null);
                    } catch (err) {
                      alert(`Failed to delete user: ${err.message}`);
                    }
                  }
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Remove from Database
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 bg-gray-100 text-[#5F5E5A] font-semibold text-xs rounded-xl"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
