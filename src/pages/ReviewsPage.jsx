import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Trash2, Search, MessageSquare, Compass } from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [experiencesMap, setExperiencesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');

  useEffect(() => {
    let expMap = {};
    let itinMap = {};

    const updateCombinedMap = () => {
      setExperiencesMap({ ...expMap, ...itinMap });
    };

    // Listen to experiences to map experienceId -> title
    const unsubExp = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      expMap = {};
      snapshot.forEach(docSnap => {
        expMap[docSnap.id] = docSnap.data().title || 'Untitled Experience';
      });
      updateCombinedMap();
    }, (err) => console.warn("Error mapping experiences for reviews:", err));

    // Listen to itineraries to map experienceId -> title
    const unsubItin = onSnapshot(collection(db, 'itineraries'), (snapshot) => {
      itinMap = {};
      snapshot.forEach(docSnap => {
        itinMap[docSnap.id] = docSnap.data().title || 'Untitled Itinerary';
      });
      updateCombinedMap();
    }, (err) => console.warn("Error mapping itineraries for reviews:", err));

    // Listen to reviews
    const unsubRev = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setReviews(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading reviews:", err);
      setLoading(false);
    });

    return () => {
      unsubExp();
      unsubItin();
      unsubRev();
    };
  }, []);

  const handleDeleteReview = async (review) => {
    if (!window.confirm(`Are you sure you want to delete this review by ${review.travellerName || 'traveller'}?`)) {
      return;
    }

    try {
      // 1. Delete review document
      await deleteDoc(doc(db, 'reviews', review.id));

      // 2. Recalculate average rating & reviewCount for parent experience / itinerary
      const expId = review.experienceId;
      if (expId) {
        const q = query(collection(db, 'reviews'), where('experienceId', '==', expId));
        const remSnap = await getDocs(q);
        
        let totalRating = 0;
        let count = 0;

        remSnap.forEach(d => {
          const rData = d.data();
          if (rData.rating) {
            totalRating += Number(rData.rating);
            count++;
          }
        });

        const newAvgRating = count > 0 ? Number((totalRating / count).toFixed(1)) : 0;

        // Update parent experience document if exists
        try {
          const expRef = doc(db, 'experiences', expId);
          const expSnap = await getDoc(expRef);
          if (expSnap.exists()) {
            await updateDoc(expRef, {
              rating: newAvgRating,
              reviewCount: count
            });
          }
        } catch (e) {
          console.warn("Could not update experiences doc:", e);
        }

        // Update parent itinerary document if exists
        try {
          const itinRef = doc(db, 'itineraries', expId);
          const itinSnap = await getDoc(itinRef);
          if (itinSnap.exists()) {
            await updateDoc(itinRef, {
              rating: newAvgRating,
              reviewCount: count
            });
          }
        } catch (e) {
          console.warn("Could not update itineraries doc:", e);
        }
      }

      alert('Review deleted and experience rating updated successfully!');
    } catch (err) {
      console.error("Error deleting review:", err);
      alert(`Failed to delete review: ${err.message}`);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(Number(rating || 0));
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`w-3.5 h-3.5 ${i <= r ? 'fill-[#EF9F27] text-[#EF9F27]' : 'text-gray-300'}`} 
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return 'N/A';
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
    if (typeof createdAt === 'number') {
      return new Date(createdAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
    if (typeof createdAt === 'string') return createdAt;
    return 'N/A';
  };

  const filteredReviews = reviews.filter((r) => {
    const expTitle = experiencesMap[r.experienceId] || '';
    const matchesSearch = 
      expTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.travellerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.comment || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (ratingFilter !== 'ALL' && Math.round(Number(r.rating || 0)) !== Number(ratingFilter)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <Star className="w-6 h-6 text-[#EF9F27] fill-[#EF9F27]" /> Traveller Reviews & Ratings
          </h2>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Audit user feedback. Deleting a review automatically recalculates the parent experience rating.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-[#ECFDF5] border border-[#E8DFD0] rounded-xl text-xs font-bold text-[#0F6E56] focus:outline-none"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
            <input
              type="text"
              placeholder="Search reviewer or tour..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-xl text-xs text-[#2C2C2A] focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-3xl border border-[#E8DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DFD0] text-[11px] font-bold uppercase tracking-wider text-[#5F5E5A] bg-[#ECFDF5]/50">
                <th className="py-3.5 px-6">Experience</th>
                <th className="py-3.5 px-4">Reviewer Name</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-6">Comment</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFD0]/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#5F5E5A] text-xs">
                    Loading review records...
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#5F5E5A] text-xs">
                    No reviews found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-[#ECFDF5]/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#2C2C2A]">
                      <div className="truncate max-w-[200px]" title={experiencesMap[r.experienceId] || r.experienceId}>
                        {experiencesMap[r.experienceId] || r.experienceId || 'Experience'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-[#0F6E56]">
                      {r.travellerName || r.travellerId || 'Anonymous Traveller'}
                    </td>
                    <td className="py-4 px-4">
                      {renderStars(r.rating)}
                    </td>
                    <td className="py-4 px-6 text-xs text-[#5F5E5A] max-w-xs">
                      <p className="line-clamp-2">{r.comment || 'No comment text.'}</p>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5F5E5A]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteReview(r)}
                        className="p-2 text-[#D85A30] hover:bg-rose-50 rounded-xl transition-colors font-semibold text-xs inline-flex items-center gap-1"
                        title="Delete Review & Recalculate Rating"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
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
