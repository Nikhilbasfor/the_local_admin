import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext(null);
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN;
const STORAGE_KEY = "yatraki_admin_authenticated";

async function authenticateFirebaseAdmin() {
  const email = 'admin@yatraki.com';
  const password = 'adminPassword123!';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Firebase Admin signed in successfully.");
  } catch (err) {
    // If the admin user doesn't exist, we attempt to sign them up.
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Firebase Admin created and signed in successfully.");
      } catch (signUpErr) {
        console.error("Firebase Admin Auto-Signup Error:", signUpErr);
      }
    } else {
      console.error("Firebase Admin SignIn Error:", err);
    }
  }
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check local session for existing active PIN session
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY);
      if (savedAuth === 'true') {
        if (!auth.currentUser) {
          authenticateFirebaseAdmin();
        }
        setIsAuthenticated(true);
        setAdminData({
          fullName: 'System Administrator',
          role: 'ADMIN',
          isAdmin: true,
          email: 'admin@yatraki.com'
        });
      }
    } catch (err) {
      console.warn("Storage check error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPin = (pin) => {
    setAuthError(null);
    if (pin.trim() === ADMIN_PIN) {
      authenticateFirebaseAdmin();
      setIsAuthenticated(true);
      setAdminData({
        fullName: 'System Administrator',
        role: 'ADMIN',
        isAdmin: true,
        email: 'admin@yatraki.com'
      });
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    } else {
      setAuthError('Incorrect Admin PIN code. Please enter a valid PIN.');
      throw new Error('Incorrect Admin PIN code.');
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAdminData(null);
    auth.signOut().catch((err) => {
      console.warn("Firebase SignOut Error:", err);
    });
  };

  const value = {
    isAuthenticated,
    adminData,
    currentUser: adminData,
    loading,
    authError,
    setAuthError,
    loginWithPin,
    logout,
    isAdmin: isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
