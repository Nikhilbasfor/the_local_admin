import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { wipeAllFirestoreData } from '../utils/firebaseReset';
import { Settings, Server, ToggleLeft, ToggleRight, Check, Code2, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [guidesRegistrationOpen, setGuidesRegistrationOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeResults, setWipeResults] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRef = doc(db, 'settings', 'global');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setGuidesRegistrationOpen(snap.data()?.guidesRegistrationOpen ?? true);
        }
      } catch (err) {
        console.warn("Could not fetch global settings doc:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleToggleRegistration = async () => {
    const newStatus = !guidesRegistrationOpen;
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, {
        guidesRegistrationOpen: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setGuidesRegistrationOpen(newStatus);
      setToastMessage(`Guide registrations have been ${newStatus ? 'ENABLED' : 'DISABLED'}.`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error("Error updating settings:", err);
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleWipeDatabase = async () => {
    const confirmText = window.prompt(
      '⚠️ WARNING: This will permanently delete ALL users, experiences, bookings, reviews, notifications, and settings from Firestore!\n\nTo confirm, type DELETE in all caps:'
    );

    if (confirmText !== 'DELETE') {
      alert('Action cancelled. Confirmation string did not match.');
      return;
    }

    setWiping(true);
    setWipeResults(null);

    try {
      const results = await wipeAllFirestoreData();
      setWipeResults(results);
      setToastMessage('Firestore database has been completely wiped and reset!');
    } catch (err) {
      console.error("Database wipe failed:", err);
      alert(`Wipe failed: ${err.message}`);
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs">
        <h2 className="text-xl font-bold text-[#2C2C2A] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0F6E56]" /> Portal & Platform Settings
        </h2>
        <p className="text-xs text-[#5F5E5A] mt-1">
          Manage system-wide marketplace configurations and view active Firebase project details.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Registration Toggle Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#2C2C2A]">Guide Registration Control</h3>
            <p className="text-xs text-[#5F5E5A]">
              Control whether new Himalayan guides can sign up and request profile verification on mobile apps.
            </p>
          </div>

          <button
            onClick={handleToggleRegistration}
            disabled={loading || saving}
            className="flex items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
          >
            {guidesRegistrationOpen ? (
              <ToggleRight className="w-12 h-12 text-[#0F6E56]" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-gray-400" />
            )}
          </button>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#E8DFD0] text-xs">
          <span className="text-[#5F5E5A]">Status in <code className="bg-[#ECFDF5] px-1.5 py-0.5 rounded text-[#0F6E56] font-mono">settings/global</code>:</span>
          <span className={`font-bold px-3 py-1 rounded-full text-xs ${
            guidesRegistrationOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {guidesRegistrationOpen ? 'REGISTRATIONS OPEN' : 'REGISTRATIONS CLOSED'}
          </span>
        </div>
      </div>

      {/* Fresh Start / Reset Database Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#D85A30]/30 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#D85A30] flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#D85A30]" /> Clear All Firestore Data (Start Fresh)
            </h3>
            <p className="text-xs text-[#5F5E5A]">
              Deletes all records in <code className="bg-gray-100 px-1 rounded font-mono text-[#D85A30]">users</code>, <code className="bg-gray-100 px-1 rounded font-mono text-[#D85A30]">experiences</code>, <code className="bg-gray-100 px-1 rounded font-mono text-[#D85A30]">bookings</code>, <code className="bg-gray-100 px-1 rounded font-mono text-[#D85A30]">reviews</code>, and <code className="bg-gray-100 px-1 rounded font-mono text-[#D85A30]">notifications</code> so you can test fresh signups.
            </p>
          </div>

          <button
            onClick={handleWipeDatabase}
            disabled={wiping}
            className="px-4 py-3 bg-[#D85A30] hover:bg-[#A83C19] text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
          >
            {wiping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Wiping Firestore...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Clear All Data</span>
              </>
            )}
          </button>
        </div>

        {wipeResults && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-[#E8DFD0] space-y-2 text-xs">
            <span className="font-bold text-[#2C2C2A] block">Wipe Summary:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
              {Object.entries(wipeResults).map(([col, count]) => (
                <div key={col} className="p-2 bg-white rounded-lg border border-[#E8DFD0] flex justify-between">
                  <span className="text-[#5F5E5A]">{col}:</span>
                  <span className="font-bold text-[#0F6E56]">{count} deleted</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Firebase Project Info Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DFD0] shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#2C2C2A] flex items-center gap-2">
          <Server className="w-5 h-5 text-[#0F6E56]" /> Firebase Project Connection Info
        </h3>
        <p className="text-xs text-[#5F5E5A]">
          Connected project parameters from <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[#0F6E56]">src/firebase.js</code>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-2xl space-y-1">
            <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Project ID</span>
            <span className="font-bold text-[#0F6E56] font-mono block truncate">{firebaseConfig.projectId}</span>
          </div>

          <div className="p-4 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-2xl space-y-1">
            <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Auth Domain</span>
            <span className="font-bold text-[#0F6E56] font-mono block truncate">{firebaseConfig.authDomain}</span>
          </div>

          <div className="p-4 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-2xl space-y-1">
            <span className="text-[10px] text-[#5F5E5A] uppercase font-bold block">Storage Bucket</span>
            <span className="font-bold text-[#0F6E56] font-mono block truncate">{firebaseConfig.storageBucket}</span>
          </div>
        </div>
      </div>

      {/* Recommended Firestore Security Rules Code Block */}
      <div className="bg-[#1E1E1E] text-gray-200 p-6 rounded-3xl border border-gray-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-sm font-bold text-[#EF9F27] flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4" /> Recommended Firestore Security Rules Update
          </h3>
          <span className="text-[11px] text-gray-400 font-mono">firestore.rules</span>
        </div>

        <p className="text-xs text-gray-400">
          Copy and paste these rule definitions into your Firebase console to grant access to mobile notifications & itinerary feedback:
        </p>

        <pre className="bg-[#121212] p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-gray-800 leading-relaxed">
{`// Add to firestore.rules:
match /notifications/{docId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
match /experiences/{expId}/itineraryFeedback/{fbId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.isAdmin == true;
}`}
        </pre>
      </div>
    </div>
  );
}
