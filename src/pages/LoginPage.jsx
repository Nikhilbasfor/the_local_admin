import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mountain, KeyRound, ShieldAlert, LogIn, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [pin, setPin] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { loginWithPin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin) {
      setErrorMessage('Please enter the 6-digit Admin PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      loginWithPin(pin);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Incorrect Admin PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECFDF5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-[#E8DFD0] space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#0F6E56] rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-[#0F6E56]/30">
              <Mountain className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2C2C2A] tracking-tight">YatraKi Admin</h1>
              <p className="text-sm text-[#5F5E5A] mt-1">Himalayan Travel Marketplace Management</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-[#FDF0EC] border border-[#D85A30]/30 rounded-2xl flex items-center gap-3 text-[#D85A30] text-sm font-medium">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#5F5E5A] uppercase tracking-wider mb-2 text-center">
                Enter Admin Passcode PIN
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#0F6E56]" />
                <input
                  type="password"
                  required
                  maxLength="6"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#ECFDF5]/50 border border-[#E8DFD0] rounded-2xl text-[#2C2C2A] text-center font-mono text-xl tracking-widest focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all font-bold"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !pin}
                className="w-full py-3.5 px-4 bg-[#0F6E56] hover:bg-[#094D3C] active:bg-[#063529] text-white font-bold rounded-2xl shadow-md shadow-[#0F6E56]/30 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Unlock Admin Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="p-3 bg-[#ECFDF5] rounded-2xl border border-[#0F6E56]/20 text-center space-y-1">
            <p className="text-xs text-[#0F6E56] font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PIN Protected Access
            </p>
            <p className="text-[11px] text-[#5F5E5A]">
              Default Access PIN: <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-[#0F6E56]">123456</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
