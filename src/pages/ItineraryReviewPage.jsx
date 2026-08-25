import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getStorageFiles } from '../utils/firebaseStorage';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Compass, 
  Calendar, 
  Clock, 
  IndianRupee, 
  AlertTriangle, 
  User,
  Phone,
  Mail,
  Globe,
  ExternalLink
} from 'lucide-react';

export default function ItineraryReviewPage() {
  const { currentUser } = useAuth();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending | changes_requested | approved | rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [searchParams] = useSearchParams();

  // Real-time map of guide users
  const [guidesMap, setGuidesMap] = useState({});

  // Storage gallery images per experience: { [expId]: Array of files }
  const [expImages, setExpImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});

  // Modals state
  const [changesModalExp, setChangesModalExp] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const [rejectModalExp, setRejectModalExp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [lightboxUrl, setLightboxUrl] = useState(null);

  const checkIsVerified = (g) => g && (g.isVerified === true || g.isVerified === "true" || g.verified === true || g.verified === "true");

  // Subscribe to users collection to map guide profile details
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const gMap = {};
      snapshot.forEach((docSnap) => {
        const u = { uid: docSnap.id, id: docSnap.id, ...docSnap.data() };
        gMap[docSnap.id] = u;
        if (u.email) gMap[u.email.toLowerCase().trim()] = u;
      });
      setGuidesMap(gMap);
    }, (err) => {
      console.warn("Error fetching users map:", err);
    });
    return () => unsub();
  }, []);

  // Read URL query parameter for expId filter if coming from Experiences page
  useEffect(() => {
    const expIdParam = searchParams.get('expId');
    if (expIdParam) {
      setSearchQuery(expIdParam);
      setExpandedCards({ [expIdParam]: true });
      setActiveTab('all');
    }
  }, [searchParams]);

  // Real-time listener for both 'itineraries' and 'experiences' collections
  useEffect(() => {
    let itinList = [];
    let expList = [];

    const updateCombined = () => {
      const map = {};
      expList.forEach((e) => map[e.id] = { _collection: 'experiences', ...e });
      itinList.forEach((i) => map[i.id] = { _collection: 'itineraries', ...i });
      const combined = Object.values(map);
      setExperiences(combined);
      setLoading(false);
    };

    const unsubItin = onSnapshot(collection(db, 'itineraries'), (snapshot) => {
      itinList = [];
      snapshot.forEach((docSnap) => {
        itinList.push({ id: docSnap.id, ...docSnap.data() });
      });
      updateCombined();
    }, (err) => {
      console.warn("Error fetching itineraries:", err);
    });

    const unsubExp = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      expList = [];
      snapshot.forEach((docSnap) => {
        expList.push({ id: docSnap.id, ...docSnap.data() });
      });
      updateCombined();
    }, (err) => {
      console.warn("Error fetching experiences:", err);
    });

    return () => {
      unsubItin();
      unsubExp();
    };
  }, []);

  // Fetch gallery images from Storage path experiences/{id}/images/
  useEffect(() => {
    experiences.forEach((exp) => {
      if (!expImages[exp.id] && !loadingImages[exp.id]) {
        setLoadingImages((prev) => ({ ...prev, [exp.id]: true }));
        getStorageFiles(`experiences/${exp.id}/images/`)
          .then((files) => {
            setExpImages((prev) => ({ ...prev, [exp.id]: files }));
            setLoadingImages((prev) => ({ ...prev, [exp.id]: false }));
          })
          .catch((err) => {
            console.warn(`Error fetching images for ${exp.id}:`, err);
            setExpImages((prev) => ({ ...prev, [exp.id]: [] }));
            setLoadingImages((prev) => ({ ...prev, [exp.id]: false }));
          });
      }
    });
  }, [experiences]);

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Action Handlers
  const handleApproveItinerary = async (exp) => {
    try {
      const colName = exp._collection || 'itineraries';
      const expRef = doc(db, colName, exp.id);
      const adminEmail = currentUser?.email || 'admin@yatraki.com';

      await updateDoc(expRef, {
        itineraryVerified: true,
        itineraryVerifiedAt: serverTimestamp(),
        itineraryVerifiedBy: adminEmail,
        itineraryStatus: 'approved',
        itineraryRejectionReason: null,
        status: 'approved'
      });

      // Write notification
      if (exp.guideId) {
        await addDoc(collection(db, 'notifications'), {
          userId: exp.guideId,
          type: 'itinerary_approved',
          experienceId: exp.id,
          experienceTitle: exp.title || 'Experience',
          message: `Your itinerary for "${exp.title}" has been reviewed and approved!`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      alert(`Itinerary for "${exp.title}" approved successfully!`);
    } catch (err) {
      console.error("Approve itinerary error:", err);
      alert(`Failed to approve itinerary: ${err.message}`);
    }
  };

  const handleReReview = async (exp) => {
    if (!window.confirm(`Reset "${exp.title}" back to pending review?`)) return;
    try {
      const colName = exp._collection || 'itineraries';
      const expRef = doc(db, colName, exp.id);
      await updateDoc(expRef, {
        itineraryVerified: false,
        itineraryStatus: 'pending',
        status: 'pending'
      });
      alert(`Itinerary status reset to pending review.`);
    } catch (err) {
      console.error("Re-review error:", err);
      alert(`Failed to reset status: ${err.message}`);
    }
  };

  const handleConfirmRequestChanges = async () => {
    if (!changesModalExp || !feedbackText.trim()) return;
    try {
      const colName = changesModalExp._collection || 'itineraries';
      const expRef = doc(db, colName, changesModalExp.id);
      const adminEmail = currentUser?.email || 'admin@yatraki.com';

      // Write to sub-collection
      await addDoc(collection(db, colName, changesModalExp.id, 'itineraryFeedback'), {
        feedback: feedbackText.trim(),
        adminEmail,
        createdAt: serverTimestamp(),
        resolved: false
      });

      // Update itinerary doc
      await updateDoc(expRef, {
        itineraryVerified: false,
        itineraryStatus: 'changes_requested',
        status: 'changes_requested'
      });

      // Write notification
      if (changesModalExp.guideId) {
        await addDoc(collection(db, 'notifications'), {
          userId: changesModalExp.guideId,
          type: 'itinerary_changes',
          experienceId: changesModalExp.id,
          experienceTitle: changesModalExp.title || 'Experience',
          feedback: feedbackText.trim(),
          message: `Changes requested for "${changesModalExp.title}": ${feedbackText.trim()}`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      setChangesModalExp(null);
      setFeedbackText('');
      alert('Feedback submitted and guide notified!');
    } catch (err) {
      console.error("Request changes error:", err);
      alert(`Failed to submit feedback: ${err.message}`);
    }
  };

  const handleConfirmRejectItinerary = async () => {
    if (!rejectModalExp || !rejectReason.trim()) return;
    try {
      const colName = rejectModalExp._collection || 'itineraries';
      const expRef = doc(db, colName, rejectModalExp.id);

      await updateDoc(expRef, {
        itineraryVerified: false,
        itineraryStatus: 'rejected',
        itineraryRejectionReason: rejectReason.trim(),
        status: 'rejected'
      });

      if (rejectModalExp.guideId) {
        await addDoc(collection(db, 'notifications'), {
          userId: rejectModalExp.guideId,
          type: 'itinerary_revoked',
          title: 'Itinerary Revoked',
          message: `Your itinerary ${rejectModalExp.title || 'Itinerary'} has been revoked by admin.`,
          itineraryId: rejectModalExp.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setRejectModalExp(null);
      setRejectReason('');
      alert('Itinerary revoked and guide notified.');
    } catch (err) {
      console.error("Reject itinerary error:", err);
      alert(`Failed to reject itinerary: ${err.message}`);
    }
  };

  const handleRevokeApprovedItinerary = async (exp) => {
    const reason = window.prompt(`Revoke itinerary "${exp.title}"?\n\nEnter reason:`);
    if (reason === null) return;
    const trimmedReason = reason.trim() || 'Revoked by admin';
    try {
      const colName = exp._collection || 'itineraries';
      const expRef = doc(db, colName, exp.id);

      await updateDoc(expRef, {
        itineraryVerified: false,
        itineraryStatus: 'rejected',
        itineraryRejectionReason: trimmedReason,
        status: 'rejected'
      });

      if (exp.guideId) {
        await addDoc(collection(db, 'notifications'), {
          userId: exp.guideId,
          type: 'itinerary_revoked',
          title: 'Itinerary Revoked',
          message: `Your itinerary ${exp.title || 'Itinerary'} has been revoked by admin.`,
          itineraryId: exp.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      alert('Itinerary revoked and guide notified.');
    } catch (err) {
      console.error("Revoke error:", err);
      alert(`Failed to revoke: ${err.message}`);
    }
  };

  // Filter experiences based on activeTab & searchQuery
  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch = 
      (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.guideName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.id || '').includes(searchQuery);

    if (!matchesSearch) return false;

    const status = exp.status || exp.itineraryStatus || (exp.itineraryVerified ? 'approved' : 'pending');

    if (activeTab === 'pending' || activeTab === 'requested') {
      return (status === 'pending' || !exp.itineraryVerified) && exp.itineraryStatus !== 'changes_requested' && exp.itineraryStatus !== 'rejected';
    }
    if (activeTab === 'approved') {
      return status === 'approved' || exp.itineraryVerified === true;
    }
    if (activeTab === 'changes_requested') {
      return exp.itineraryStatus === 'changes_requested';
    }
    if (activeTab === 'rejected') {
      return exp.itineraryStatus === 'rejected';
    }
    return true; // all
  });

  const getStatusBadge = (exp) => {
    if (exp.itineraryVerified || exp.status === 'approved') {
      return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Approved</span>;
    }
    if (exp.itineraryStatus === 'changes_requested') {
      return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Changes Requested</span>;
    }
    if (exp.itineraryStatus === 'rejected') {
      return <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
    }
    return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Audit</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#0F6E56]" />
            Itinerary Review & Verification
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Audit day-by-day tour itineraries, safety protocols, inclusions & gallery images before public publishing.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
          <input
            type="text"
            placeholder="Search title, guide name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5E5A] hover:text-[#2C2C2A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD0] pb-2 overflow-x-auto">
        {[
          { key: 'pending', label: 'Requested', color: 'bg-blue-600' },
          { key: 'approved', label: 'Approved', color: 'bg-[#0F6E56]' },
          { key: 'changes_requested', label: 'Changes Requested', color: 'bg-[#EF9F27]' },
          { key: 'rejected', label: 'Rejected', color: 'bg-[#D85A30]' },
          { key: 'all', label: 'All Itineraries', color: 'bg-gray-600' },
        ].map((tab) => {
          const count = experiences.filter((e) => {
            const st = e.status || e.itineraryStatus || (e.itineraryVerified ? 'approved' : 'pending');
            if (tab.key === 'pending') return (st === 'pending' || !e.itineraryVerified) && e.itineraryStatus !== 'changes_requested' && e.itineraryStatus !== 'rejected';
            if (tab.key === 'approved') return st === 'approved' || e.itineraryVerified === true;
            if (tab.key === 'changes_requested') return e.itineraryStatus === 'changes_requested';
            if (tab.key === 'rejected') return e.itineraryStatus === 'rejected';
            return true;
          }).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                ${activeTab === tab.key 
                  ? 'bg-[#0F6E56] text-white shadow-sm' 
                  : 'bg-white text-[#5F5E5A] hover:bg-[#ECFDF5] border border-[#E8DFD0]'
                }
              `}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${tab.color}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Experience Cards List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#0F6E56] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#5F5E5A]">Loading experience itineraries from Firestore...</p>
        </div>
      ) : filteredExperiences.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E8DFD0] text-center space-y-3">
          <Compass className="w-12 h-12 text-[#0F6E56]/30 mx-auto" />
          <h3 className="text-base font-bold text-[#2C2C2A]">No Itineraries Found</h3>
          <p className="text-xs text-[#5F5E5A] max-w-md mx-auto">
            No experiences match the selected tab filter ({activeTab.toUpperCase()}) or search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredExperiences.map((exp) => {
            const isExpanded = !!expandedCards[exp.id];
            const images = expImages[exp.id] || [];
            const isImgLoading = loadingImages[exp.id];

            return (
              <div 
                key={exp.id} 
                id={`exp-${exp.id}`}
                className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden transition-all hover:border-[#0F6E56]/40"
              >
                {/* Cover Banner */}
                {exp.coverImage && (
                  <div className="h-48 lg:h-64 w-full relative overflow-hidden bg-gray-100">
                    <img 
                      src={exp.coverImage} 
                      alt={exp.title || 'Cover'} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 text-white">
                      <div>
                        <span className="px-2.5 py-1 bg-[#EF9F27] text-[#2C2C2A] font-bold text-[11px] rounded-full uppercase tracking-wider mb-2 inline-block">
                          {exp.category || 'Trek'}
                        </span>
                        <h3 className="text-2xl font-bold leading-tight">{exp.title}</h3>
                        <p className="text-xs text-white/80 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#EF9F27]" /> {exp.location || 'Himalayas'}</span>
                          <span>•</span>
                          <span>Guide: {exp.guideName || exp.guideId || 'Unknown'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Main Info Bar */}
                <div className="p-6 bg-[#ECFDF5]/30 border-b border-[#E8DFD0] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {!exp.coverImage && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#EF9F27] text-[#2C2C2A] font-bold text-[11px] rounded-full uppercase">
                          {exp.category || 'Trek'}
                        </span>
                        {getStatusBadge(exp)}
                      </div>
                      <h3 className="text-xl font-bold text-[#2C2C2A]">{exp.title}</h3>
                      <p className="text-xs text-[#5F5E5A]">Guide: {exp.guideName || exp.guideId || 'Unknown'}</p>
                    </div>
                  )}

                  {/* Badges / Key Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#2C2C2A]">
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                      <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Price / Person</span>
                      <span className="font-bold text-[#0F6E56]">₹{exp.price || 0}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                      <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Duration</span>
                      <span className="font-semibold">{exp.durationDays || exp.duration || 'N/A'} Days</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                      <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Fitness Level</span>
                      <span className="font-semibold text-[#D85A30]">{exp.fitnessLevel || 'Moderate'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                      <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Best Season</span>
                      <span className="font-semibold text-[#EF9F27]">{exp.bestSeason || 'Spring/Autumn'}</span>
                    </div>
                  </div>

                  {/* Actions Header Bar */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {exp.coverImage && getStatusBadge(exp)}

                    {!exp.itineraryVerified ? (
                      <>
                        <button
                          onClick={() => handleApproveItinerary(exp)}
                          className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#094D3C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve Itinerary</span>
                        </button>
                        <button
                          onClick={() => { setChangesModalExp(exp); setFeedbackText(''); }}
                          className="px-3.5 py-2.5 bg-white hover:bg-amber-50 text-[#EF9F27] border border-[#EF9F27] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Request Changes</span>
                        </button>
                        <button
                          onClick={() => { setRejectModalExp(exp); setRejectReason(''); }}
                          className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-[#D85A30] border border-[#D85A30] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleReReview(exp)}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-[#EF9F27] border border-[#EF9F27]/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Re-review Itinerary</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(exp.id)}
                      className="px-3 py-2.5 bg-white border border-[#E8DFD0] hover:bg-[#ECFDF5] text-[#2C2C2A] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'Full Itinerary & Gallery'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Full Itinerary & Details Content */}
                {isExpanded && (
                  <div className="p-6 space-y-8 divide-y divide-[#E8DFD0]">
                    {/* Rejection Reason Notice */}
                    {exp.itineraryRejectionReason && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Rejection Reason: </span>
                          {exp.itineraryRejectionReason}
                        </div>
                      </div>
                    )}

                    {/* Guide Profile & Onboarding Info */}
                    {(() => {
                      const guideUser = guidesMap[exp.guideId] || (exp.guideEmail ? guidesMap[exp.guideEmail.toLowerCase().trim()] : null);
                      return (
                        <div className="bg-[#ECFDF5]/50 border border-[#0F6E56]/30 rounded-2xl p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8DFD0] pb-3">
                            <div className="flex items-center gap-3">
                              {guideUser?.profilePicUrl || guideUser?.profileImage || exp.guideImage ? (
                                <img src={guideUser?.profilePicUrl || guideUser?.profileImage || exp.guideImage} alt="Guide" className="w-12 h-12 rounded-full object-cover border-2 border-[#0F6E56]" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold text-lg shrink-0">
                                  {(exp.guideName || 'G')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-sm text-[#2C2C2A] flex items-center gap-2 flex-wrap">
                                  <span>{guideUser?.name || guideUser?.fullName || exp.guideName || 'Local Guide'}</span>
                                  {checkIsVerified(guideUser) ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                                      Verified Guide
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                                      Under Review / Pending
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-[#5F5E5A] mt-0.5">UID: <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E8DFD0]">{exp.guideId || guideUser?.uid || 'N/A'}</code></p>
                              </div>
                            </div>

                            <a
                              href={`/guide-approvals?guideId=${exp.guideId || guideUser?.uid}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 bg-[#0F6E56] hover:bg-[#094D3C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-center shrink-0 shadow-xs"
                            >
                              <span>Inspect Full Guide Dossier</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold">Email</span>
                              <span className="font-semibold text-[#2C2C2A] truncate block">{guideUser?.email || exp.guideEmail || 'N/A'}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold">Phone</span>
                              <span className="font-semibold text-[#2C2C2A]">{guideUser?.phone || guideUser?.phoneNumber || exp.guidePhone || 'N/A'}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold">State / City</span>
                              <span className="font-semibold text-[#2C2C2A]">{guideUser?.state || exp.state || ''} {guideUser?.city ? `(${guideUser.city})` : ''}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold">Experience</span>
                              <span className="font-semibold text-[#0F6E56]">{guideUser?.experienceYears || guideUser?.yearsOfExperience || exp.guideExperienceYears || 2} Years</span>
                            </div>
                          </div>

                          {/* Languages & Specialisms */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold mb-0.5">Languages Spoken</span>
                              <span className="font-semibold text-[#2C2C2A]">
                                {Array.isArray(guideUser?.languages) ? guideUser.languages.join(', ') : (guideUser?.languages || 'English, Hindi')}
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                              <span className="text-[10px] text-[#5F5E5A] block uppercase font-bold mb-0.5">Specializations</span>
                              <span className="font-semibold text-[#EF9F27]">
                                {Array.isArray(guideUser?.specialties) ? guideUser.specialties.join(', ') : (guideUser?.specialisms || 'High Altitude Trekking, Culture')}
                              </span>
                            </div>
                          </div>

                          {(guideUser?.bio || guideUser?.about) && (
                            <div className="bg-white p-3 rounded-xl border border-[#E8DFD0] text-xs">
                              <span className="font-bold text-[#2C2C2A] block mb-1">Guide Bio / About:</span>
                              <p className="text-[#5F5E5A] leading-relaxed">{guideUser.bio || guideUser.about}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Description & Overview */}
                    <div className="space-y-3 pt-6">
                      <h4 className="text-sm font-bold text-[#2C2C2A] flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#0F6E56]" /> Experience Overview & Description
                      </h4>
                      <p className="text-xs text-[#5F5E5A] leading-relaxed bg-[#ECFDF5]/20 p-4 rounded-2xl border border-[#E8DFD0]">
                        {exp.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Day by Day Itinerary */}
                    <div className="pt-6 space-y-4">
                      <h4 className="text-sm font-bold text-[#2C2C2A] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#0F6E56]" /> Day-by-Day Detailed Itinerary
                      </h4>

                      {exp.itinerary && Array.isArray(exp.itinerary) && exp.itinerary.length > 0 ? (
                        <div className="space-y-4">
                          {exp.itinerary.map((dayItem, dIdx) => (
                            <div key={dIdx} className="bg-[#ECFDF5]/30 border border-[#E8DFD0] rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-2">
                                <span className="px-3 py-1 bg-[#0F6E56] text-white font-bold text-xs rounded-lg">
                                  Day {dayItem.day || dIdx + 1}
                                </span>
                                <h5 className="text-sm font-bold text-[#2C2C2A] flex-1 ml-3">
                                  {dayItem.title || dayItem.dayTitle || `Day ${dIdx + 1} Schedule`}
                                </h5>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#5F5E5A] bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                                <div><span className="font-bold text-[#2C2C2A]">Stay:</span> {dayItem.overnightStay || 'N/A'}</div>
                                <div><span className="font-bold text-[#2C2C2A]">Meals:</span> {dayItem.meals || 'Included'}</div>
                                <div><span className="font-bold text-[#2C2C2A]">Transport:</span> {dayItem.transport || 'N/A'}</div>
                              </div>

                              {/* Timeline items within the day */}
                              {dayItem.activities || dayItem.timelineItems ? (
                                <div className="space-y-2 pt-2">
                                  {(dayItem.activities || dayItem.timelineItems).map((act, aIdx) => (
                                    <div key={aIdx} className="p-3 bg-white rounded-xl border border-[#E8DFD0] flex items-start gap-3">
                                      <span className="px-2 py-0.5 bg-[#EF9F27]/20 text-[#C97E16] font-mono text-[10px] font-bold rounded shrink-0">
                                        {act.time || 'All Day'}
                                      </span>
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <h6 className="text-xs font-bold text-[#2C2C2A]">{act.title || act.activityTitle}</h6>
                                        <p className="text-[11px] text-[#5F5E5A]">{act.description}</p>
                                      </div>
                                      {act.image && (
                                        <img src={act.image} alt="Activity" className="w-12 h-12 rounded-lg object-cover border border-[#E8DFD0]" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : dayItem.description ? (
                                <p className="text-xs text-[#5F5E5A]">{dayItem.description}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : exp.days && Array.isArray(exp.days) && exp.days.length > 0 ? (
                        <div className="space-y-3">
                          {exp.days.map((dayItem, dIdx) => {
                            if (typeof dayItem === 'object' && dayItem !== null) {
                              return (
                                <div key={dIdx} className="bg-[#ECFDF5]/30 border border-[#E8DFD0] rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-2">
                                    <span className="px-3 py-1 bg-[#0F6E56] text-white font-bold text-xs rounded-lg">
                                      Day {dayItem.dayNumber || dayItem.day || dIdx + 1}
                                    </span>
                                    <h5 className="text-sm font-bold text-[#2C2C2A] flex-1 ml-3">
                                      {dayItem.dayTitle || dayItem.title || `Day ${dIdx + 1} Schedule`}
                                    </h5>
                                  </div>
                                  {dayItem.accommodation && (
                                    <div className="text-[11px] text-[#5F5E5A] bg-white p-2.5 rounded-xl border border-[#E8DFD0]">
                                      <span className="font-bold text-[#2C2C2A]">Stay / Lodging:</span> {dayItem.accommodation}
                                    </div>
                                  )}
                                  {dayItem.activities && Array.isArray(dayItem.activities) && dayItem.activities.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      {dayItem.activities.map((act, aIdx) => (
                                        <div key={aIdx} className="p-2.5 bg-white rounded-xl border border-[#E8DFD0] flex items-center gap-3 text-xs">
                                          <span className="px-2 py-0.5 bg-[#EF9F27]/20 text-[#C97E16] font-mono text-[10px] font-bold rounded">
                                            {typeof act === 'object' ? (act.time || 'All Day') : 'Activity'}
                                          </span>
                                          <span className="font-semibold text-[#2C2C2A]">
                                            {typeof act === 'object' ? (act.activityTitle || act.title || '') : String(act)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div key={dIdx} className="p-3 bg-white rounded-xl border border-[#E8DFD0] text-xs text-[#2C2C2A]">
                                <span className="font-bold text-[#0F6E56] mr-2">Day {dIdx + 1}:</span> {String(dayItem)}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5F5E5A] italic">No detailed day-by-day itinerary object supplied.</p>
                      )}
                    </div>

                    {/* Lists Grid: Inclusions, Exclusions, Carry */}
                    <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Inclusions */}
                      <div className="bg-[#ECFDF5] p-4 rounded-2xl border border-[#0F6E56]/20 space-y-2">
                        <h5 className="text-xs font-bold text-[#0F6E56] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Inclusions
                        </h5>
                        <ul className="text-xs text-[#2C2C2A] space-y-1 list-disc list-inside">
                          {exp.inclusions && exp.inclusions.length > 0 ? (
                            exp.inclusions.map((item, idx) => <li key={idx}>{item}</li>)
                          ) : (
                            <li className="italic text-[#5F5E5A]">Standard guide service</li>
                          )}
                        </ul>
                      </div>

                      {/* Exclusions */}
                      <div className="bg-rose-50/50 p-4 rounded-2xl border border-[#D85A30]/20 space-y-2">
                        <h5 className="text-xs font-bold text-[#D85A30] uppercase tracking-wider flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Exclusions
                        </h5>
                        <ul className="text-xs text-[#2C2C2A] space-y-1 list-disc list-inside">
                          {exp.exclusions && exp.exclusions.length > 0 ? (
                            exp.exclusions.map((item, idx) => <li key={idx}>{item}</li>)
                          ) : (
                            <li className="italic text-[#5F5E5A]">Personal expenses</li>
                          )}
                        </ul>
                      </div>

                      {/* Things to Carry */}
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#EF9F27]/20 space-y-2">
                        <h5 className="text-xs font-bold text-[#C97E16] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Things to Carry
                        </h5>
                        <ul className="text-xs text-[#2C2C2A] space-y-1 list-disc list-inside">
                          {exp.thingsToCarry && exp.thingsToCarry.length > 0 ? (
                            exp.thingsToCarry.map((item, idx) => <li key={idx}>{item}</li>)
                          ) : (
                            <li className="italic text-[#5F5E5A]">Trekking boots, warm layers</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Logistics & Policies */}
                    <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#2C2C2A]">
                      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD0]">
                        <span className="font-bold text-[#0F6E56] block mb-1">Meeting Point</span>
                        <p className="text-[#5F5E5A]">{exp.meetingPoint || 'Specified upon booking confirmation'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD0]">
                        <span className="font-bold text-[#D85A30] block mb-1">Cancellation Policy</span>
                        <p className="text-[#5F5E5A]">{exp.cancellationPolicy || 'Standard 48-hour cancellation policy'}</p>
                      </div>
                    </div>

                    {/* Firebase Storage Experience Photo Gallery */}
                    <div className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#2C2C2A] flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-[#0F6E56]" />
                          Experience Image Gallery (Firebase Storage)
                        </h4>
                        <span className="text-[11px] text-[#5F5E5A]">
                          Path: <code className="bg-[#ECFDF5] px-1.5 py-0.5 rounded text-[#0F6E56]">experiences/{exp.id}/images/</code>
                        </span>
                      </div>

                      {isImgLoading ? (
                        <div className="py-6 text-center text-xs text-[#5F5E5A]">
                          Loading Storage photos...
                        </div>
                      ) : images.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-[#E8DFD0] text-center text-xs text-[#5F5E5A]">
                          No additional gallery photos found in Storage path experiences/{exp.id}/images/
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 overflow-x-auto pb-2">
                          {images.map((imgFile, idx) => (
                            <div 
                              key={idx}
                              className="relative shrink-0 w-36 h-28 rounded-2xl overflow-hidden bg-black/5 border border-[#E8DFD0] group cursor-pointer"
                              onClick={() => setLightboxUrl(imgFile.url)}
                            >
                              <img src={imgFile.url} alt={imgFile.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Request Changes Modal */}
      {changesModalExp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8DFD0]">
            <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
              <h3 className="text-base font-bold text-[#EF9F27] flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Request Itinerary Revisions
              </h3>
              <button onClick={() => setChangesModalExp(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              Write specific feedback or day-by-day corrections for <span className="font-bold text-[#2C2C2A]">{changesModalExp.title}</span>. Saved to <code className="bg-[#ECFDF5] px-1 py-0.5 rounded font-mono text-[#0F6E56]">itineraryFeedback</code> sub-collection.
            </p>
            <textarea
              rows="5"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Day 2 altitude gain is too rapid. Please specify emergency evacuation route for Day 4..."
              className="w-full p-3 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#EF9F27]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setChangesModalExp(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#5F5E5A] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRequestChanges}
                disabled={!feedbackText.trim()}
                className="px-4 py-2 bg-[#EF9F27] hover:bg-[#C97E16] text-[#2C2C2A] font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Send Feedback to Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalExp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8DFD0]">
            <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
              <h3 className="text-base font-bold text-[#D85A30] flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Itinerary
              </h3>
              <button onClick={() => setRejectModalExp(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              State the rejection reason for <span className="font-bold text-[#2C2C2A]">{rejectModalExp.title}</span>.
            </p>
            <textarea
              rows="4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unsafe route or duplicate listing..."
              className="w-full p-3 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#D85A30]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalExp(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#5F5E5A] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectItinerary}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-[#D85A30] hover:bg-[#A83C19] text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Reject Itinerary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxUrl} alt="Zoomed" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-10 right-0 text-white font-bold p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
