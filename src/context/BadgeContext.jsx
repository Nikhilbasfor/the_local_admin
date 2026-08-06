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

    // Listen to users collection for pending guides (role = GUIDE and isVerified != true)
    const usersQ = query(
      collection(db, 'users'),
      where('role', '==', 'GUIDE')
    );

    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.isVerified) {
          count++;
        }
      });
      setPendingGuidesCount(count);
    }, (err) => {
      console.warn("Badge listener users error:", err);
    });

    // Listen to experiences collection for pending itineraries (itineraryVerified != true)
    const expRef = collection(db, 'experiences');
    const unsubExp = onSnapshot(expRef, (snapshot) => {
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.itineraryVerified !== true) {
          count++;
        }
      });
      setPendingItinerariesCount(count);
    }, (err) => {
      console.warn("Badge listener experiences error:", err);
    });

    return () => {
      unsubUsers();
      unsubExp();
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
