import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const BadgeContext = createContext({ pendingGuidesCount: 0, pendingItinerariesCount: 0 });

export function BadgeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [pendingGuidesCount, setPendingGuidesCount] = useState(0);
  const [pendingItinerariesCount, setPendingItinerariesCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isGuide = data.role && data.role.toUpperCase() === 'GUIDE';
        const isVerified = data.isVerified === true || data.isVerified === "true" || data.verified === true || data.verified === "true";
        if (isGuide && !isVerified && (!data.rejectionReason || data.isRevoked === true) && data.onboardingComplete === true) {
          count++;
        }
      });
      setPendingGuidesCount(count);
    }, (err) => {
      console.warn("Badge listener users error:", err);
    });

    // Listen to experiences & itineraries collections for pending itineraries (itineraryVerified != true or status == 'pending')
    let itinList = [];
    let expList = [];

    const updatePendingCount = () => {
      const map = {};
      expList.forEach((e) => map[e.id] = e);
      itinList.forEach((i) => map[i.id] = i);
      const combined = Object.values(map);

      const pendingCount = combined.filter((exp) => {
        const status = exp.status || exp.itineraryStatus || (exp.itineraryVerified ? 'approved' : 'pending');
        return (status === 'pending' || !exp.itineraryVerified) && exp.itineraryStatus !== 'changes_requested' && exp.itineraryStatus !== 'rejected';
      }).length;

      setPendingItinerariesCount(pendingCount);
    };

    const unsubExp = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      expList = [];
      snapshot.forEach((docSnap) => expList.push({ id: docSnap.id, ...docSnap.data() }));
      updatePendingCount();
    }, (err) => {
      console.warn("Badge listener experiences error:", err);
    });

    const unsubItin = onSnapshot(collection(db, 'itineraries'), (snapshot) => {
      itinList = [];
      snapshot.forEach((docSnap) => itinList.push({ id: docSnap.id, ...docSnap.data() }));
      updatePendingCount();
    }, (err) => {
      console.warn("Badge listener itineraries error:", err);
    });

    return () => {
      unsubUsers();
      unsubExp();
      unsubItin();
    };
  }, [isAuthenticated]);

  return (
    <BadgeContext.Provider value={{ pendingGuidesCount, pendingItinerariesCount }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  return useContext(BadgeContext);
}
