import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, addDoc, onSnapshot, serverTimestamp, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { getStorageFiles } from '../utils/firebaseStorage';
import { useSearchParams } from 'react-router-dom';
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  ExternalLink, 
  Maximize2, 
  X, 
  RefreshCw,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Globe,
  Award,
  Clock
} from 'lucide-react';

export default function GuideApprovalsPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending | approved | rejected | all
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();

  // Guide docs map: { [uid]: Array of file objects }
  const [guideDocuments, setGuideDocuments] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});

  // Modals state
  const [rejectModalGuide, setRejectModalGuide] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [infoModalGuide, setInfoModalGuide] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Read URL query parameter for guideId filter if coming from Users page
  useEffect(() => {
    const guideIdParam = searchParams.get('guideId');
    if (guideIdParam) {
      setSearchQuery(guideIdParam);
      setActiveTab('all');
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const guideList = [];
      snapshot.forEach((docSnap) => {
        if (!docSnap.exists()) return;
        const u = { uid: docSnap.id, id: docSnap.id, ...docSnap.data() };
        if (u.role && u.role.toUpperCase() === 'GUIDE') {
          guideList.push(u);
        }
      });
      const deduped = Object.values(guideList.reduce((acc, user) => {
        const ex = acc[user.email];
        if (!ex || (user.createdAt?.seconds||0) > (ex.createdAt?.seconds||0)) acc[user.email] = user;
        return acc;
      }, {}));
      setGuides(deduped);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching guides:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Helper check for verification status across both field schemas
  const checkIsVerified = (g) => g.isVerified === true || g.isVerified === "true" || g.verified === true || g.verified === "true";

  // Fetch documents for guides from Storage path guides/{uid}/documents/
  useEffect(() => {
    guides.forEach((guide) => {
      if (!guideDocuments[guide.uid] && !loadingDocs[guide.uid]) {
        setLoadingDocs((prev) => ({ ...prev, [guide.uid]: true }));
        getStorageFiles(`guides/${guide.uid}/documents/`)
          .then((files) => {
            setGuideDocuments((prev) => ({ ...prev, [guide.uid]: files }));
            setLoadingDocs((prev) => ({ ...prev, [guide.uid]: false }));
          })
          .catch((err) => {
            console.warn(`Error loading docs for ${guide.uid}:`, err);
            setGuideDocuments((prev) => ({ ...prev, [guide.uid]: [] }));
            setLoadingDocs((prev) => ({ ...prev, [guide.uid]: false }));
          });
      }
    });
  }, [guides]);

  // Action Handlers
  const handleApprove = async (guide) => {
    try {
      const userRef = doc(db, 'users', guide.uid);
      await updateDoc(userRef, {
        isVerified: true,
        verified: true,
        onboardingComplete: true,
        rejectionReason: null
      });

      const batch = writeBatch(db);

      const expSnapshot = await getDocs(
        query(collection(db, "experiences"), where("guideId", "==", guide.uid))
      );
      expSnapshot.forEach((expDoc) => {
        batch.update(expDoc.ref, { status: "approved" });
      });

      const itinSnapshot = await getDocs(
        query(collection(db, "itineraries"), where("guideId", "==", guide.uid))
      );
      itinSnapshot.forEach((itinDoc) => {
        batch.update(itinDoc.ref, { status: "approved", itineraryVerified: true });
      });

      await batch.commit();

      // Write notification
      await addDoc(collection(db, 'notifications'), {
        userId: guide.uid,
        type: 'guide_approved',
        message: 'Your guide profile has been verified! You can now publish itineraries.',
        createdAt: serverTimestamp(),
        read: false
      });

      alert(`Guide ${guide.name || guide.fullName || guide.email} has been approved successfully!`);
    } catch (err) {
      console.error("Approve error:", err);
      alert(`Failed to approve guide: ${err.message}`);
    }
  };

  const handleRevoke = async (guide) => {
    const reason = window.prompt(`Are you sure you want to revoke verification for ${guide.name || guide.fullName || guide.email}?\n\nReason:`);
    if (reason === null) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      alert("A revocation reason is required.");
      return;
    }
    try {
      const userRef = doc(db, 'users', guide.uid);
      await updateDoc(userRef, {
        isVerified: false,
        verified: false,
        rejectionReason: trimmedReason,
        rejectionDate: serverTimestamp(),
        isRevoked: true
      });

      await addDoc(collection(db, 'notifications'), {
        userId: guide.uid,
        type: 'guide_rejected',
        message: `Your guide verification status has been revoked by admin: ${trimmedReason}`,
        createdAt: serverTimestamp(),
        read: false
      });
      alert('Verification status revoked successfully.');
    } catch (err) {
      console.error("Revoke error:", err);
      alert(`Failed to revoke: ${err.message}`);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalGuide || !rejectReason.trim()) return;
    try {
      const userRef = doc(db, 'users', rejectModalGuide.uid);
      await updateDoc(userRef, {
        isVerified: false,
        verified: false,
        rejectionReason: rejectReason.trim(),
        rejectionDate: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: rejectModalGuide.uid,
        type: 'guide_rejected',
        message: `Your guide profile request was rejected: ${rejectReason.trim()}`,
        createdAt: serverTimestamp(),
        read: false
      });

      setRejectModalGuide(null);
      setRejectReason('');
      alert('Guide rejected and notification sent.');
    } catch (err) {
      console.error("Reject error:", err);
      alert(`Failed to reject guide: ${err.message}`);
    }
  };

  const handleConfirmRequestInfo = async () => {
    if (!infoModalGuide || !infoMessage.trim()) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: infoModalGuide.uid,
        type: 'guide_info_needed',
        message: infoMessage.trim(),
        createdAt: serverTimestamp(),
        read: false
      });

      setInfoModalGuide(null);
      setInfoMessage('');
      alert('Information request notification sent to guide.');
    } catch (err) {
      console.error("Info request error:", err);
      alert(`Failed to send request: ${err.message}`);
    }
  };

  // Filter guides based on activeTab & searchQuery
  const filteredGuides = guides.filter((g) => {
    const guideName = g.name || g.fullName || '';
    const matchesSearch = 
      guideName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.uid || '').includes(searchQuery);

    if (!matchesSearch) return false;

    const isVerified = checkIsVerified(g);

    if (activeTab === 'pending') {
      return !isVerified && (!g.rejectionReason || g.isRevoked === true);
    }
    if (activeTab === 'approved') {
      return isVerified;
    }
    if (activeTab === 'rejected') {
      return !isVerified && !!g.rejectionReason && !g.isRevoked;
    }
    return true; // all
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#0F6E56]" />
            Guide Approvals & Verification
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Review guide identity documents (Aadhar, Certificates) and approve or request revisions.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
          <input
            type="text"
            placeholder="Search guide name, email, city..."
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
          { key: 'pending', label: 'Pending Review', color: 'bg-[#D85A30]' },
          { key: 'approved', label: 'Approved Guides', color: 'bg-[#0F6E56]' },
          { key: 'rejected', label: 'Rejected', color: 'bg-gray-500' },
          { key: 'all', label: 'All Guides', color: 'bg-blue-600' },
        ].map((tab) => {
          const count = guides.filter(g => {
            const isVerified = checkIsVerified(g);
            if (tab.key === 'pending') return !isVerified && (!g.rejectionReason || g.isRevoked === true);
            if (tab.key === 'approved') return isVerified;
            if (tab.key === 'rejected') return !isVerified && !!g.rejectionReason && !g.isRevoked;
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

      {/* Guide Cards Container */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#0F6E56] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#5F5E5A]">Loading guide approval records from Firestore...</p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E8DFD0] text-center space-y-3">
          <UserCheck className="w-12 h-12 text-[#0F6E56]/30 mx-auto" />
          <h3 className="text-base font-bold text-[#2C2C2A]">No Guides Found</h3>
          <p className="text-xs text-[#5F5E5A] max-w-md mx-auto">
            No guides match the selected tab filter ({activeTab.toUpperCase()}) or search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGuides.map((guide) => {
            const docs = guideDocuments[guide.uid] || [];
            const isDocLoading = loadingDocs[guide.uid];

            return (
              <div 
                key={guide.uid} 
                id={`guide-${guide.uid}`}
                className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden transition-all hover:border-[#0F6E56]/40"
              >
                {/* Top Guide Profile Header */}
                <div className="p-6 bg-[#ECFDF5]/30 border-b border-[#E8DFD0] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    {/* Profile Photo */}
                    <div className="relative shrink-0">
                      {guide.profileImage ? (
                        <img 
                          src={guide.profileImage} 
                          alt={guide.name || guide.fullName || 'Guide'} 
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[#0F6E56] text-white flex items-center justify-center font-bold text-xl shadow-md">
                          {(guide.name || guide.fullName || 'G').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white border-2 border-white text-[10px] ${checkIsVerified(guide) ? 'bg-[#0F6E56]' : 'bg-[#EF9F27]'}`}>
                        {checkIsVerified(guide) ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      </span>
                    </div>

                    {/* Guide Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-[#2C2C2A]">{guide.name || guide.fullName || 'Unnamed Guide'}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          checkIsVerified(guide) 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : guide.rejectionReason 
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {checkIsVerified(guide) ? 'VERIFIED GUIDE' : guide.rejectionReason ? 'REJECTED' : 'PENDING APPROVAL'}
                        </span>
                        {guide.onboardingComplete && (
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold">
                            Onboarding Complete
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#5F5E5A] flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#0F6E56]" /> {guide.email || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#0F6E56]" /> {guide.phone || 'N/A'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#0F6E56]" /> {guide.city || 'Location N/A'}</span>
                        {guide.age && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#0F6E56]" /> Age: {guide.age}</span>}
                      </div>

                      {/* Languages */}
                      {guide.languages && guide.languages.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <Globe className="w-3.5 h-3.5 text-[#5F5E5A] shrink-0" />
                          <span className="text-xs text-[#5F5E5A] font-medium mr-1">Languages:</span>
                          {guide.languages.map((lang, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-[#E8DFD0] rounded-md text-[11px] font-semibold text-[#0F6E56]">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Card Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {!checkIsVerified(guide) ? (
                      <>
                        <button
                          onClick={() => handleApprove(guide)}
                          className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#094D3C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve Guide</span>
                        </button>
                        <button
                          onClick={() => { setInfoModalGuide(guide); setInfoMessage(''); }}
                          className="px-3.5 py-2.5 bg-white hover:bg-amber-50 text-[#EF9F27] border border-[#EF9F27] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Request Info</span>
                        </button>
                        <button
                          onClick={() => { setRejectModalGuide(guide); setRejectReason(''); }}
                          className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-[#D85A30] border border-[#D85A30] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRevoke(guide)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#D85A30] border border-[#D85A30]/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Revoke Verification</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bio Section */}
                {guide.bio && (
                  <div className="px-6 py-3 bg-[#ECFDF5]/10 border-b border-[#E8DFD0] text-xs text-[#5F5E5A]">
                    <span className="font-bold text-[#2C2C2A]">Bio: </span> {guide.bio}
                  </div>
                )}

                {/* Rejection notice if rejected */}
                {guide.rejectionReason && (
                  <div className="px-6 py-3 bg-rose-50 text-rose-800 border-b border-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold">Rejection Reason: </span>
                      {guide.rejectionReason}
                    </div>
                  </div>
                )}

                {/* Document Viewer Section */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#2C2C2A] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0F6E56]" />
                      Document Proofs & KYC
                    </h4>
                    {guide.aadhaarNumber && (
                      <span className="px-3 py-1 bg-[#ECFDF5] border border-[#0F6E56]/20 rounded-lg text-xs font-bold text-[#0F6E56]">
                        Aadhaar No: {guide.aadhaarNumber}
                      </span>
                    )}
                  </div>

                  {/* Direct Aadhaar Documents from Guide Profile if available */}
                  {(guide.aadhaarFrontUrl || guide.aadhaarBackUrl) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-[#E8DFD0]">
                      {guide.aadhaarFrontUrl && (
                        <div className="bg-[#ECFDF5]/30 border border-[#E8DFD0] rounded-2xl p-3 space-y-2">
                          <span className="text-xs font-bold text-[#0F6E56]">Aadhaar Card (Front)</span>
                          <div 
                            className="relative group h-44 rounded-xl overflow-hidden bg-black/5 cursor-pointer border border-[#E8DFD0]"
                            onClick={() => setLightboxUrl(guide.aadhaarFrontUrl)}
                          >
                            <img src={guide.aadhaarFrontUrl} alt="Aadhaar Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Maximize2 className="w-4 h-4" /> Click to Zoom
                            </div>
                          </div>
                        </div>
                      )}

                      {guide.aadhaarBackUrl && (
                        <div className="bg-[#ECFDF5]/30 border border-[#E8DFD0] rounded-2xl p-3 space-y-2">
                          <span className="text-xs font-bold text-[#0F6E56]">Aadhaar Card (Back)</span>
                          <div 
                            className="relative group h-44 rounded-xl overflow-hidden bg-black/5 cursor-pointer border border-[#E8DFD0]"
                            onClick={() => setLightboxUrl(guide.aadhaarBackUrl)}
                          >
                            <img src={guide.aadhaarBackUrl} alt="Aadhaar Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Maximize2 className="w-4 h-4" /> Click to Zoom
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isDocLoading ? (
                    <div className="py-8 text-center text-xs text-[#5F5E5A] bg-[#ECFDF5]/20 rounded-2xl">
                      <RefreshCw className="w-5 h-5 text-[#0F6E56] animate-spin mx-auto mb-2" />
                      Checking Firebase Storage files...
                    </div>
                  ) : (docs.length === 0 && !guide.aadhaarFrontUrl && !guide.aadhaarBackUrl) ? (
                    <div className="p-6 bg-amber-50/50 rounded-2xl border border-dashed border-[#EF9F27]/30 text-center space-y-2">
                      <FileText className="w-8 h-8 text-[#EF9F27]/60 mx-auto" />
                      <p className="text-xs font-semibold text-[#2C2C2A]">No document uploads found.</p>
                      <p className="text-[11px] text-[#5F5E5A]">
                        Guide has not yet uploaded files under <code className="bg-white px-1 py-0.5 rounded">guides/{guide.uid}/documents/</code>
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {docs.map((docFile, idx) => (
                        <div key={idx} className="bg-[#ECFDF5]/20 border border-[#E8DFD0] rounded-2xl p-3 flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2C2C2A] truncate max-w-[180px]" title={docFile.name}>
                              {docFile.name}
                            </span>
                            <a 
                              href={docFile.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0F6E56] hover:text-[#094D3C] p-1 rounded hover:bg-white"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          {/* Inline Preview */}
                          {docFile.isImage ? (
                            <div 
                              className="relative group h-44 rounded-xl overflow-hidden bg-black/5 border border-[#E8DFD0] cursor-pointer"
                              onClick={() => setLightboxUrl(docFile.url)}
                            >
                              <img 
                                src={docFile.url} 
                                alt={docFile.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-xs gap-1">
                                <Maximize2 className="w-4 h-4" /> Click to Zoom
                              </div>
                            </div>
                          ) : docFile.isPdf ? (
                            <div className="h-44 rounded-xl overflow-hidden border border-[#E8DFD0] bg-white">
                              <iframe
                                src={docFile.url}
                                title={docFile.name}
                                className="w-full h-full border-0"
                              />
                            </div>
                          ) : (
                            <div className="h-44 rounded-xl bg-white border border-[#E8DFD0] flex flex-col items-center justify-center p-4 text-center">
                              <FileText className="w-10 h-10 text-[#0F6E56] mb-2" />
                              <span className="text-xs font-medium text-[#2C2C2A]">{docFile.name}</span>
                              <a 
                                href={docFile.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 text-xs font-bold text-[#0F6E56] hover:underline"
                              >
                                Download / View Document
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8DFD0]">
            <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
              <h3 className="text-base font-bold text-[#D85A30] flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Guide Verification
              </h3>
              <button onClick={() => setRejectModalGuide(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              State the reason for rejecting <span className="font-bold text-[#2C2C2A]">{rejectModalGuide.fullName || rejectModalGuide.email}</span>. This will be sent as a notification to the guide.
            </p>
            <textarea
              rows="4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Aadhar card photo is blurred or expired certificate..."
              className="w-full p-3 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#D85A30]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalGuide(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#5F5E5A] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-[#D85A30] hover:bg-[#A83C19] text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {infoModalGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8DFD0]">
            <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
              <h3 className="text-base font-bold text-[#EF9F27] flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Request Additional Information
              </h3>
              <button onClick={() => setInfoModalGuide(null)} className="text-[#5F5E5A] hover:text-[#2C2C2A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              Specify missing documents or info required from <span className="font-bold text-[#2C2C2A]">{infoModalGuide.fullName || infoModalGuide.email}</span>. Verified status will remain pending.
            </p>
            <textarea
              rows="4"
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="e.g. Please re-upload clear back side of Aadhar card..."
              className="w-full p-3 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#EF9F27]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setInfoModalGuide(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#5F5E5A] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRequestInfo}
                disabled={!infoMessage.trim()}
                className="px-4 py-2 bg-[#EF9F27] hover:bg-[#C97E16] text-[#2C2C2A] font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxUrl} alt="Document Zoom" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button 
              onClick={() => setLightboxUrl(null)} 
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
