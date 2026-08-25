import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Search, 
  Star, 
  MapPin, 
  Trash2, 
  FileCheck, 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  IndianRupee,
  CheckCircle,
  Eye,
  AlertTriangle
} from 'lucide-react';

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | published | draft
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExp, setSelectedExp] = useState(null);
  
  // Delete modal state
  const [deleteModalExp, setDeleteModalExp] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let itinList = [];
    let expList = [];

    const updateCombined = () => {
      const map = {};
      expList.forEach((e) => map[e.id] = { _collection: 'experiences', ...e });
      itinList.forEach((i) => map[i.id] = { _collection: 'itineraries', ...i });
      setExperiences(Object.values(map));
      setLoading(false);
    };

    const unsubItin = onSnapshot(collection(db, 'itineraries'), (snapshot) => {
      itinList = [];
      snapshot.forEach((docSnap) => {
        itinList.push({ id: docSnap.id, ...docSnap.data() });
      });
      updateCombined();
    }, (err) => {
      console.warn("Error loading itineraries:", err);
    });

    const unsubExp = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      expList = [];
      snapshot.forEach((docSnap) => {
        expList.push({ id: docSnap.id, ...docSnap.data() });
      });
      updateCombined();
    }, (err) => {
      console.warn("Error loading experiences:", err);
    });

    return () => {
      unsubItin();
      unsubExp();
    };
  }, []);

  const handleToggleStatus = async (exp) => {
    try {
      const colName = exp._collection || 'itineraries';
      const newStatus = (exp.status === 'published' || exp.status === 'approved') ? 'draft' : 'approved';
      await updateDoc(doc(db, colName, exp.id), { status: newStatus });
      if (selectedExp?.id === exp.id) {
        setSelectedExp((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleOpenDeleteModal = (exp) => {
    setDeleteModalExp(exp);
    setDeleteReason('');
  };

  const handleConfirmDeleteItinerary = async () => {
    if (!deleteModalExp) return;
    const reasonText = deleteReason.trim();
    if (!reasonText) {
      alert('Please enter a reason/note for deleting this itinerary.');
      return;
    }

    setIsDeleting(true);
    try {
      const expId = deleteModalExp.id;
      const title = deleteModalExp.title || 'Itinerary';
      const targetGuideId = deleteModalExp.guideId || deleteModalExp.userId || deleteModalExp.guideEmail || '';

      // 1. Delete from BOTH 'experiences' and 'itineraries' collections
      await deleteDoc(doc(db, 'experiences', expId)).catch((err) => console.warn('Err deleting from experiences:', err));
      await deleteDoc(doc(db, 'itineraries', expId)).catch((err) => console.warn('Err deleting from itineraries:', err));

      // Also set status: 'deleted' as fallback update in case deletion was blocked or cached
      try {
        await updateDoc(doc(db, 'experiences', expId), { status: 'deleted', deletionReason: reasonText });
      } catch (_) {}
      try {
        await updateDoc(doc(db, 'itineraries', expId), { status: 'deleted', deletionReason: reasonText });
      } catch (_) {}

      // 2. Write notification to the guide explaining why it was deleted
      if (targetGuideId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetGuideId,
          type: 'itinerary_deleted',
          title: 'Itinerary Deleted by Admin',
          message: `Your itinerary "${title}" was permanently deleted by Admin. Reason: ${reasonText}`,
          experienceTitle: title,
          reason: reasonText,
          itineraryId: expId,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      if (selectedExp?.id === expId) setSelectedExp(null);
      setDeleteModalExp(null);
      setDeleteReason('');
      alert(`Itinerary "${title}" deleted successfully and guide notified.`);
    } catch (err) {
      console.error("Error deleting experience:", err);
      alert(`Failed to delete experience: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Categories list derived dynamically
  const categories = Array.from(new Set(experiences.map(e => e.category).filter(Boolean)));

  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (exp.id || '').includes(searchQuery);
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && (exp.status || 'published') !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#0F6E56]" /> Experiences & Treks
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Manage published marketplace tours, ratings, status, and itinerary details.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#ECFDF5] border border-[#E8DFD0] rounded-xl text-xs font-bold text-[#0F6E56] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#ECFDF5] border border-[#E8DFD0] rounded-xl text-xs font-bold text-[#0F6E56] focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
            <input
              type="text"
              placeholder="Search experience title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3.5 px-6">Title</th>
                <th className="py-3.5 px-4">Guide Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#5F5E5A] text-xs">
                    Loading experiences...
                  </td>
                </tr>
              ) : filteredExperiences.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#5F5E5A] text-xs">
                    No experiences found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredExperiences.map((exp) => (
                  <tr 
                    key={exp.id} 
                    onClick={() => setSelectedExp(exp)}
                    className="hover:bg-[#ECFDF5]/40 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-[#2C2C2A]">
                      <div className="flex items-center gap-3">
                        {exp.coverImage ? (
                          <img src={exp.coverImage} alt="Cover" className="w-10 h-10 rounded-xl object-cover border border-[#E8DFD0]" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#0F6E56]/10 text-[#0F6E56] flex items-center justify-center font-bold text-xs shrink-0">
                            <Compass className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#2C2C2A] truncate max-w-[200px]" title={exp.title}>{exp.title || 'Untitled Tour'}</p>
                          <span className="text-[10px] text-[#5F5E5A] font-mono">ID: {exp.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-[#5F5E5A]">{exp.guideName || exp.guideId || 'N/A'}</td>
                    <td className="py-4 px-4 text-xs">
                      <span className="px-2.5 py-0.5 bg-[#EF9F27]/20 text-[#C97E16] font-bold rounded-full">
                        {exp.category || 'Trek'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5F5E5A]">{exp.location || 'Himalayas'}</td>
                    <td className="py-4 px-4 font-bold text-[#0F6E56]">₹{exp.price || 0}</td>
                    <td className="py-4 px-4 text-xs font-bold text-[#EF9F27]">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
                        <span>{exp.rating || 0}</span>
                        <span className="text-[#5F5E5A] font-normal text-[10px]">({exp.reviewCount || 0})</span>
                      </div>
                    </td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(exp)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          exp.status === 'published' 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {exp.status === 'published' ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedExp(exp)}
                        className="text-xs font-bold text-[#0F6E56] hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(exp)}
                        className="text-xs font-bold text-[#D85A30] hover:underline inline-flex items-center gap-1 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Modal for Experience Details */}
      {selectedExp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-l border-[#E8DFD0]">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-4">
                <h3 className="text-base font-bold text-[#2C2C2A]">Experience Details</h3>
                <button onClick={() => setSelectedExp(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A] p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cover Image & Title */}
              {selectedExp.coverImage && (
                <img src={selectedExp.coverImage} alt={selectedExp.title} className="w-full h-40 rounded-2xl object-cover border border-[#E8DFD0]" />
              )}

              <div>
                <h4 className="text-lg font-bold text-[#2C2C2A]">{selectedExp.title}</h4>
                <p className="text-xs text-[#5F5E5A] mt-1">Guide: {selectedExp.guideName || selectedExp.guideId}</p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#0F6E56]/20">
                  <span className="text-[#5F5E5A] block">Price</span>
                  <span className="font-bold text-[#0F6E56]">₹{selectedExp.price || 0}</span>
                </div>
                <div className="p-3 bg-[#FFF8E6] rounded-xl border border-[#EF9F27]/20">
                  <span className="text-[#5F5E5A] block">Category</span>
                  <span className="font-bold text-[#C97E16]">{selectedExp.category || 'Trek'}</span>
                </div>
                <div className="p-3 bg-white border border-[#E8DFD0] rounded-xl">
                  <span className="text-[#5F5E5A] block">Location</span>
                  <span className="font-semibold text-[#2C2C2A]">{selectedExp.location || 'N/A'}</span>
                </div>
                <div className="p-3 bg-white border border-[#E8DFD0] rounded-xl">
                  <span className="text-[#5F5E5A] block">Rating</span>
                  <span className="font-semibold text-[#EF9F27] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#EF9F27]" /> {selectedExp.rating || 0} ({selectedExp.reviewCount || 0})
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#2C2C2A]">Description</span>
                <p className="text-xs text-[#5F5E5A] leading-relaxed bg-gray-50 p-3 rounded-xl border border-[#E8DFD0]">
                  {selectedExp.description || 'No description available.'}
                </p>
              </div>

              {/* Special Upgrade Button: Jump to Itinerary Review */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    const eId = selectedExp.id;
                    setSelectedExp(null);
                    navigate(`/itinerary-review?expId=${eId}`);
                  }}
                  className="w-full py-3 px-4 bg-[#0F6E56] hover:bg-[#094D3C] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <FileCheck className="w-4 h-4 text-[#EF9F27]" />
                  <span>Review Itinerary in Dedicated Portal</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8DFD0] flex gap-3">
              <button
                onClick={() => handleToggleStatus(selectedExp)}
                className="flex-1 py-2.5 bg-[#ECFDF5] hover:bg-[#0F6E56] text-[#0F6E56] hover:text-white font-bold text-xs rounded-xl transition-colors border border-[#0F6E56]/30"
              >
                Toggle Status ({selectedExp.status === 'published' ? 'Draft' : 'Publish'})
              </button>
              <button
                onClick={() => handleOpenDeleteModal(selectedExp)}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-[#D85A30] font-bold text-xs rounded-xl transition-colors border border-[#D85A30]/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Reason Modal */}
      {deleteModalExp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8DFD0] space-y-4">
            <div className="flex items-center gap-3 text-[#D85A30]">
              <div className="p-2.5 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-[#D85A30]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#2C2C2A]">Permanent Deletion Note</h3>
                <p className="text-xs text-[#5F5E5A]">This will remove the itinerary from Traveller & Guide apps.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-[#E8DFD0] text-xs">
              <span className="font-bold text-[#2C2C2A]">Itinerary Title: </span>
              <span className="text-[#0F6E56] font-semibold">{deleteModalExp.title || 'Untitled'}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C2C2A] mb-1">
                Reason / Note to Guide for Deletion <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="3"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Safety standard non-compliance, inaccurate details, duplicate listing..."
                className="w-full p-3 bg-white border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#D85A30]"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalExp(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#5F5E5A] font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteItinerary}
                disabled={isDeleting || !deleteReason.trim()}
                className="flex-1 py-2.5 bg-[#D85A30] hover:bg-[#B54622] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete & Notify Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
