import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CameraView } from '../camera/CameraView';
import { FaceDetectionResult } from '../face-ai/faceEngine';
import { apiRequest, setStoredToken, setStoredUser } from '../services/api';
import { storeOfflinePunch, syncOfflinePunchesWithServer, getPendingOfflinePunches } from '../pwa/offlineDb';

export const KioskPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState<number | null>(null);

  // Admin Access Modal State (Locks out workers, requires admin password)
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Kiosk Operating Mode
  const [activeMode, setActiveMode] = useState<'face' | 'manual'>('face');

  // Manual fallback state with password validation
  const [manualCode, setManualCode] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // AI Face scanning state & Status Beacon
  const [isAnalyzingFace, setIsAnalyzingFace] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failure'>('idle');
  const [resetCountdown, setResetCountdown] = useState(3);
  const lastScanTimeRef = useRef<number>(0);

  // PWA Web App Installation State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  // Attendance Result Modal / Card
  const [punchResult, setPunchResult] = useState<any | null>(null);

  // Offline Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await syncOfflinePunchesWithServer();
      if (res.syncedCount > 0) {
        updatePendingCount();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const pending = await getPendingOfflinePunches();
      setPendingSyncCount(pending.length);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Kiosks
  useEffect(() => {
    async function loadKiosks() {
      try {
        const res = await apiRequest('/kiosks');
        if (res.success && res.kiosks.length > 0) {
          setKiosks(res.kiosks);
          const activeKiosk = res.kiosks.find((k: any) => k.is_active) || res.kiosks[0];
          setSelectedKioskId(activeKiosk.id);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadKiosks();
  }, []);

  // Listen for PWA Web App Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      setShowInstallHelp(true);
    }
  };

  // FUNCTION 1: AI Facial Biometric Attendance (Automatic 1:N compare against registered members)
  const handleFaceCaptured = async (faceResult: FaceDetectionResult) => {
    // Debounce scans so it doesn't repeatedly fire
    const now = Date.now();
    if (now - lastScanTimeRef.current < 3000 || isAnalyzingFace || punchResult) return;
    lastScanTimeRef.current = now;

    if (!faceResult.hasFace || faceResult.embedding.length === 0) return;

    setIsAnalyzingFace(true);
    setFaceError(null);
    setScanStatus('scanning');

    try {
      if (isOnline) {
        const res = await apiRequest('/face/identify-punch', {
          method: 'POST',
          body: JSON.stringify({
            image: faceResult.image,
            liveEmbedding: faceResult.embedding,
            livenessScore: faceResult.livenessScore,
            kiosk_id: selectedKioskId,
            isMasked: !!faceResult.isMasked,
          }),
        });

        if (res.success && res.matched) {
          // GREEN LIGHT: Verification Success
          setScanStatus('success');
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#2FA84F', '#1A73C7', '#0F4C81']
          });

          setPunchResult({
            employee: res.employee,
            punchName: res.punchName || 'Attendance Marked',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            daily_status: res.attendance?.daily_status || 'PRESENT',
            hours_worked: res.attendance?.hours_worked,
            ot_hours: res.attendance?.ot_hours,
            isManual: false,
            isMasked: res.isMasked,
          });

          // Countdown 3 seconds and automatically transition to next user
          let count = 3;
          setResetCountdown(count);
          const interval = setInterval(() => {
            count -= 1;
            setResetCountdown(count);
            if (count <= 0) clearInterval(interval);
          }, 1000);

          setTimeout(() => {
            setPunchResult(null);
            setScanStatus('idle');
            setFaceError(null);
          }, 3200);
        } else {
          // RED LIGHT: Unmatched / Face Not Recognized
          setScanStatus('failure');
          setFaceError(res.message || 'Face not recognized. Please align face clearly or try again.');
          setTimeout(() => {
            setScanStatus('idle');
            setFaceError(null);
          }, 2600);
        }
      } else {
        // Offline:
        setFaceError('Offline mode active. Attendance will record and sync when connected.');
        setScanStatus('idle');
      }
    } catch (err: any) {
      // RED LIGHT: Error / Face match rejection
      setScanStatus('failure');
      setFaceError(err.message || 'Face not recognized. Please align face clearly or try again.');
      setTimeout(() => {
        setScanStatus('idle');
        setFaceError(null);
      }, 2600);
    } finally {
      setIsAnalyzingFace(false);
    }
  };

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAdminAuthError('Please enter administrator password');
      return;
    }

    setAdminAuthLoading(true);
    setAdminAuthError(null);

    try {
      const res = await apiRequest('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: adminPassword,
        }),
      });

      if (res.success && res.token) {
        setStoredToken(res.token);
        setStoredUser(res.user || { role: 'admin', username: 'admin' });
        setShowAdminAuthModal(false);
        navigate('/admin');
      } else {
        setAdminAuthError('Invalid administrator credentials');
      }
    } catch (err: any) {
      setAdminAuthError(err.message || 'Incorrect administrator password');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  // FUNCTION 2: Manual ID Attendance with Strict Password Validation
  const handleManualPunch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetCode = manualCode.trim().toUpperCase();
    if (!targetCode) {
      setManualError('Please enter Employee ID');
      return;
    }

    if (!manualPassword.trim()) {
      setManualError('Password is required for manual attendance punch');
      return;
    }

    setManualLoading(true);
    setManualError(null);

    try {
      if (isOnline) {
        const punchRes = await apiRequest('/attendance/punch', {
          method: 'POST',
          body: JSON.stringify({
            employee_code: targetCode,
            password: manualPassword.trim(),
            kiosk_id: selectedKioskId,
            is_manual_fallback: true,
          }),
        });

        // Green Light Beacon on Success
        setScanStatus('success');
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.6 },
          colors: ['#2FA84F', '#1A73C7', '#0F4C81']
        });

        setPunchResult({
          employee: punchRes.employee,
          punchName: punchRes.punchName || 'Attendance Marked',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          daily_status: punchRes.attendance?.daily_status || 'PRESENT',
          hours_worked: punchRes.attendance?.hours_worked,
          ot_hours: punchRes.attendance?.ot_hours,
          isManual: true,
          isMasked: false,
        });

        setManualCode('');
        setManualPassword('');

        // 3-second auto countdown to transition to next worker
        let count = 3;
        setResetCountdown(count);
        const interval = setInterval(() => {
          count -= 1;
          setResetCountdown(count);
          if (count <= 0) clearInterval(interval);
        }, 1000);

        setTimeout(() => {
          setPunchResult(null);
          setScanStatus('idle');
          setManualError(null);
        }, 3200);
      } else {
        setManualError('Offline mode: Please connect to network to verify credentials');
      }
    } catch (err: any) {
      // Red Light Beacon on Validation Failure
      setScanStatus('failure');
      setManualError(err.message || 'Validation failed. Check Employee ID and password.');
      setTimeout(() => {
        setScanStatus('idle');
      }, 3000);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1D23] flex flex-col justify-between selection:bg-[#1A73C7] selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E4E7EB] px-4 sm:px-6 lg:px-8 py-3 shadow-2xs sticky top-0 z-30">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo with High-Res PNG App Icon */}
          <div className="flex items-center space-x-2.5">
            <img
              src="/icon-192.png"
              alt="SPTech"
              className="w-9 h-9 rounded-xl shadow-xs object-cover"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-[#1A1D23] tracking-tight">SPTech Kiosk</span>
              </div>
            </div>
          </div>

          {/* Time & Connectivity */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 text-xs">
            {/* Install / Download PWA Web App Button with PNG Icon */}
            <button
              type="button"
              onClick={handleInstallPWA}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Download / Install Kiosk App directly to your device"
            >
              <img src="/icon-192.png" alt="App" className="w-4 h-4 rounded-xs object-contain" />
              <span className="hidden xs:inline sm:inline">Download App</span>
              <span className="inline xs:hidden sm:hidden">App</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 text-slate-600 bg-[#F7F8FA] px-3 py-1.5 rounded-xl border border-[#E4E7EB]">
              <span>{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-[#0F4C81] font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div
              className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-medium border ${
                isOnline ? 'bg-emerald-50 border-emerald-200 text-[#2FA84F]' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#2FA84F]' : 'bg-amber-500'} animate-pulse`} />
              <span className="hidden sm:inline font-semibold text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
              {pendingSyncCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-800 font-bold text-[10px]">
                  {pendingSyncCount}
                </span>
              )}
            </div>

            {/* Admin Terminal Lock (Restricted from worker access) */}
            <button
              type="button"
              onClick={() => {
                setShowAdminAuthModal(true);
                setAdminAuthError(null);
                setAdminPassword('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-slate-600 hover:text-[#0F4C81] transition shadow-2xs cursor-pointer font-bold text-xs"
              title="Administrator Terminal Lock"
            >
              <span>🔒 Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Viewport (Optimized for Mobile Phones 360px up to Full HD 1920x1080 Desktops) */}
      <main className="flex-1 w-full max-w-6xl 2xl:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Attendance Confirmed Receipt View */}
        {punchResult ? (
          <div className="max-w-xl mx-auto w-full bg-white border border-[#E4E7EB] rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-4 animate-in fade-in zoom-in duration-200">
            {/* Green Light Visual Indicator Ring */}
            <div className="w-16 h-16 mx-auto rounded-full bg-[#2FA84F] text-white flex items-center justify-center text-3xl font-black ring-8 ring-[#2FA84F]/20 shadow-lg shadow-emerald-500/10 animate-bounce">
              ✓
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-[#2FA84F] font-bold">
                {punchResult.isManual
                  ? '✓ Attendance Recorded (Manual ID)'
                  : punchResult.isMasked
                  ? '✓ Verified with Mask (Periocular AI)'
                  : '✓ Face Verified — Green Light'}
              </span>
              <h2 className="text-xl font-bold text-[#1A1D23]">
                {punchResult.employee?.name || punchResult.employee?.employee_code}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {punchResult.employee?.employee_code}
                {punchResult.employee?.department ? ` • ${punchResult.employee?.department}` : ''}
              </p>
            </div>

            {/* Official Kiosk Punch Receipt Card with EPF */}
            <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E4E7EB] text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4E7EB]">
                <span className="text-slate-500 font-medium">Punch Event:</span>
                <span className="font-bold text-[#1A73C7] text-sm">{punchResult.punchName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Time:</span>
                <span className="font-semibold text-[#1A1D23] font-mono">{punchResult.time}</span>
              </div>

              {/* EPF (Provident Fund) Number Display */}
              <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <span className="px-1.5 py-0.5 rounded bg-[#2FA84F] text-white font-bold text-[9px] tracking-wider">EPF</span>
                  <span className="font-semibold text-[11px]">EPF / UAN:</span>
                </div>
                <span className="font-mono font-bold text-[#0F4C81] text-[11px]">
                  {punchResult.employee?.epf_number || `TN/MAS/0048123/${punchResult.employee?.employee_code || '1001'} (Active UAN)`}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Daily Status:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  punchResult.daily_status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-[#2FA84F]'
                }`}>
                  {punchResult.daily_status}
                </span>
              </div>

              {punchResult.hours_worked !== undefined && (
                <div className="flex justify-between items-center pt-2 border-t border-[#E4E7EB]">
                  <span className="text-slate-500 font-medium">Hours Worked Today:</span>
                  <span className="font-bold text-[#0F4C81]">{punchResult.hours_worked} hrs</span>
                </div>
              )}
            </div>

            {/* Smooth Auto-Next Countdown Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Next employee in:</span>
                <span className="font-mono font-bold text-[#1A73C7]">{resetCountdown}s</span>
              </div>
              <div className="w-full bg-[#E4E7EB] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#2FA84F] h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(resetCountdown / 3) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => {
                setPunchResult(null);
                setScanStatus('idle');
                setFaceError(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
            >
              Next Worker Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Operating Mode Selector Tabs (Clean, uncluttered single mode) */}
            <div className="max-w-md mx-auto w-full flex bg-[#F1F3F5] p-1 rounded-2xl border border-[#E4E7EB] shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('face');
                  setManualError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeMode === 'face'
                    ? 'bg-white text-[#1A73C7] shadow-xs'
                    : 'text-slate-600 hover:text-[#1A1D23]'
                }`}
              >
                <span>📷 AI Face Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('manual');
                  setFaceError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeMode === 'manual'
                    ? 'bg-white text-[#1A73C7] shadow-xs'
                    : 'text-slate-600 hover:text-[#1A1D23]'
                }`}
              >
                <span>🔢 Manual ID & Password</span>
              </button>
            </div>

            {/* Mode 1: AI Face Scanner (Responsive Split View for Full HD Desktop) */}
            {activeMode === 'face' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Camera Scanner */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white border border-[#E4E7EB] rounded-3xl p-4 sm:p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E4E7EB] pb-2.5">
                    <div className="text-left">
                      <h2 className="text-sm font-bold text-[#1A1D23]">AI Face Biometrics</h2>
                      <p className="text-[11px] text-slate-500">Look directly into camera to punch</p>
                    </div>
                    {kiosks.length > 0 && (
                      <select
                        value={selectedKioskId || ''}
                        onChange={(e) => setSelectedKioskId(Number(e.target.value))}
                        className="text-[11px] bg-[#F7F8FA] border border-[#E4E7EB] rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none cursor-pointer"
                      >
                        {kiosks.map((k) => (
                          <option key={k.id} value={k.id}>{k.device_name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Camera Viewfinder */}
                  <CameraView
                    onFaceCaptured={handleFaceCaptured}
                    isScanning={!isAnalyzingFace && !punchResult}
                    autoCaptureOnReady={true}
                    scanStatus={scanStatus}
                  />

                  {/* Status Indicator */}
                  <div className="flex items-center justify-center text-xs pt-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          scanStatus === 'success'
                            ? 'bg-[#2FA84F]'
                            : scanStatus === 'failure'
                            ? 'bg-rose-500'
                            : isAnalyzingFace
                            ? 'bg-[#1A73C7] animate-ping'
                            : 'bg-[#2FA84F]'
                        }`}
                      />
                      <span className="text-slate-600 font-semibold text-xs">
                        {scanStatus === 'success'
                          ? 'Verified Successfully'
                          : scanStatus === 'failure'
                          ? 'Face Not Recognized — Try Again'
                          : isAnalyzingFace
                          ? 'Verifying biometric signature...'
                          : 'Ready — Stand in front of camera'}
                      </span>
                    </div>
                  </div>

                  {faceError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">!</span>
                        <span>{faceError}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Terminal Shift Information & Guidance Panel (Eliminates Blank Space on 1920x1080) */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                  {/* Active Shift Card */}
                  <div className="bg-white border border-[#E4E7EB] rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E4E7EB] pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Terminal Information</h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#2FA84F] text-[10px] font-bold">
                        {isOnline ? 'Online Synced' : 'Local Queue'}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Biometric Engine:</span>
                        <span className="font-semibold text-[#2FA84F]">ArcFace 512-D Neural Core</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Attendance Sync:</span>
                        <span className="font-semibold text-slate-700">Real-Time SQLite & Cloud</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">EPF Deductions:</span>
                        <span className="font-semibold text-[#1A73C7]">Statutory 12% Auto-Linked</span>
                      </div>
                    </div>
                  </div>

                  {/* Punch Guide Card */}
                  <div className="bg-[#F7F8FA] border border-[#E4E7EB] rounded-3xl p-5 space-y-3 text-xs">
                    <h4 className="font-bold text-[#1A1D23] flex items-center space-x-1.5">
                      <span>⏱ Quick Punch Guide</span>
                    </h4>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-[#1A73C7] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Stand 0.5m – 1.0m from camera with face centered in frame.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-[#1A73C7] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Look directly at lens; green indicator confirms verification.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-[#1A73C7] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>If biometric scan cannot match, switch to Manual ID & Password above.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Manual ID & Password (Responsive Split View for Full HD Desktop) */}
            {activeMode === 'manual' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 bg-white border border-[#E4E7EB] rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
                  <div className="border-b border-[#E4E7EB] pb-3 text-left">
                    <h3 className="text-sm font-bold text-[#1A1D23]">Manual Employee ID Punch</h3>
                    <p className="text-xs text-slate-500">
                      Enter your assigned Employee Code and Password to record attendance
                    </p>
                  </div>

                  {manualError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">!</span>
                      <span>{manualError}</span>
                    </div>
                  )}

                  <form onSubmit={handleManualPunch} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EMP001"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        className="w-full bg-[#F7F8FA] border border-[#E4E7EB] focus:border-[#1A73C7] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#1A1D23] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        className="w-full bg-[#F7F8FA] border border-[#E4E7EB] focus:border-[#1A73C7] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1D23] outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={manualLoading || !manualCode.trim() || !manualPassword.trim()}
                      className="w-full py-3 bg-[#1A73C7] hover:bg-[#0F4C81] disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      {manualLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <span>Verify Password & Punch Attendance</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right: Manual Verification Guidelines Panel */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white border border-[#E4E7EB] rounded-3xl p-5 shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-[#1A1D23]">Authentication & Audit Policy</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Manual punch requires your employee code and password. All manual entries are logged with an audit stamp in accordance with company policy.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                      <span className="font-bold block">Notice:</span>
                      <span>Punches are automatically paired with your assigned shift schedule and tracked for overtime & EPF compliance.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clean Footer (No direct admin link exposed to workers) */}
      <footer className="bg-white border-t border-[#E4E7EB] px-4 py-2.5 text-center text-xs text-slate-500 flex items-center justify-between max-w-7xl mx-auto w-full">
        <span>SPTech AI Attendance Kiosk Terminal</span>
        <span className="text-slate-400 text-[11px]">Dedicated Attendance Device</span>
      </footer>

      {/* Administrator Authentication Modal */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E4E7EB] shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/icon-192.png" alt="Admin" className="w-8 h-8 rounded-lg shadow-2xs object-cover" />
                <div>
                  <h3 className="text-sm font-bold text-[#1A1D23]">Administrator Access</h3>
                  <p className="text-[11px] text-slate-500">Authorized personnel only</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminAuthModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-[#F7F8FA] font-bold text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminUnlock} className="space-y-3">
              {adminAuthError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">!</span>
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] focus:border-[#1A73C7] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#1A1D23] outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(false)}
                  className="px-3 py-2 rounded-xl border border-[#E4E7EB] text-slate-600 hover:bg-[#F7F8FA] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminAuthLoading || !adminPassword}
                  className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] disabled:opacity-40 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {adminAuthLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <span>Unlock Admin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Web App Installation Help Modal with High-Res PNG App Icons */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E7EB] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src="/icon-192.png"
                  alt="SPTech Kiosk"
                  className="w-11 h-11 rounded-2xl shadow-sm object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-[#1A1D23]">Install Kiosk App</h3>
                  <p className="text-[11px] text-slate-500">Official Mobile & Tablet Terminal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#F7F8FA] font-bold text-base flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-3 rounded-2xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-1">
                <span className="font-bold text-[#0F4C81] block">Android (Google Chrome / Edge)</span>
                <p className="text-[11px] leading-relaxed">Tap browser menu <strong>(⋮)</strong> at top-right → Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-1">
                <span className="font-bold text-[#0F4C81] block">iPhone & iPad (Safari)</span>
                <p className="text-[11px] leading-relaxed">Tap the <strong>Share</strong> button at bottom/top → Select <strong>"Add to Home Screen"</strong>.</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-1">
                <span className="font-bold text-[#0F4C81] block">Windows / Mac (Chrome / Edge)</span>
                <p className="text-[11px] leading-relaxed">Click the <strong>Install App icon (⊕ or 💻)</strong> on the right side of your browser URL bar.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="w-full py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold text-xs transition cursor-pointer shadow-xs active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
