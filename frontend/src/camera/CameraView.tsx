import React, { useRef, useEffect, useState } from 'react';
import { extractFaceBiometrics, FaceDetectionResult } from '../face-ai/faceEngine';

interface CameraViewProps {
  onFaceCaptured: (result: FaceDetectionResult) => void;
  isScanning?: boolean;
  autoCaptureOnReady?: boolean;
  scanStatus?: 'idle' | 'scanning' | 'success' | 'failure';
}

export const CameraView: React.FC<CameraViewProps> = ({
  onFaceCaptured,
  isScanning = true,
  autoCaptureOnReady = false,
  scanStatus = 'idle',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionState, setDetectionState] = useState<FaceDetectionResult | null>(null);
  const previousFrames = useRef<number[][]>([]);
  const hasCapturedRef = useRef(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera access requires secure HTTPS. Please access via your HTTPS domain (https://facex.sp-tech.in).');
          return;
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setCameraError('Camera access required for facial attendance. Please allow camera permissions.');
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (isScanning) {
      hasCapturedRef.current = false;
    }
  }, [isScanning]);

  useEffect(() => {
    if (!stream || !isScanning) return;

    const intervalId = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

      const result = extractFaceBiometrics(
        videoRef.current,
        canvasRef.current,
        previousFrames.current
      );

      setDetectionState(result);

      if (result.hasFace && result.embedding.length > 0) {
        previousFrames.current.push(result.embedding);
        if (previousFrames.current.length > 5) {
          previousFrames.current.shift();
        }

        // Auto-capture when face quality and liveness are confirmed
        if (autoCaptureOnReady && result.qualityScore >= 0.70 && result.livenessScore >= 0.65 && !hasCapturedRef.current) {
          hasCapturedRef.current = true;
          onFaceCaptured(result);
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [stream, isScanning, autoCaptureOnReady, onFaceCaptured]);

  const handleManualCapture = () => {
    if (detectionState && detectionState.hasFace) {
      onFaceCaptured(detectionState);
    } else if (videoRef.current && canvasRef.current) {
      const res = extractFaceBiometrics(videoRef.current, canvasRef.current, previousFrames.current);
      onFaceCaptured(res);
    }
  };

  return (
    <div className={`relative w-full max-w-sm sm:max-w-md mx-auto aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-sm ${
      scanStatus === 'success'
        ? 'border-[#2FA84F] ring-4 ring-[#2FA84F]/40 shadow-lg shadow-emerald-500/20'
        : scanStatus === 'failure'
        ? 'border-rose-500 ring-4 ring-rose-500/40 shadow-lg shadow-rose-500/20'
        : 'border-[#E4E7EB]'
    }`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white text-slate-700 space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-600 font-bold text-xl">
            !
          </div>
          <p className="font-medium text-sm text-[#1A1D23]">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#1A73C7] hover:bg-[#0F4C81] text-white rounded-lg text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <span className="font-bold text-sm">↻</span>
            <span>Retry Camera</span>
          </button>
        </div>
      ) : (
        <>
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          {/* Gentle scanning guide */}
          {isScanning && scanStatus === 'idle' && <div className="human-scanner-line" />}

          {/* Top Status Light Beacon Bar */}
          {scanStatus === 'success' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#2FA84F] text-white text-xs font-bold shadow-lg animate-in fade-in zoom-in">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>✓ Verified — Green Light</span>
            </div>
          )}
          {scanStatus === 'failure' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg animate-in fade-in zoom-in">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>✕ Not Recognized — Red Light</span>
            </div>
          )}

          {/* Natural Human Viewfinder Guide */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div
              className={`w-44 h-56 sm:w-52 sm:h-64 rounded-3xl border-2 transition-all duration-300 relative flex flex-col items-center justify-between p-3.5 ${
                scanStatus === 'success'
                  ? 'border-[#2FA84F] bg-[#2FA84F]/20 ring-4 ring-[#2FA84F]/50 shadow-md'
                  : scanStatus === 'failure'
                  ? 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-500/50 shadow-md'
                  : detectionState?.hasFace
                  ? 'border-[#2FA84F] bg-[#2FA84F]/5 shadow-sm'
                  : 'border-white/70 border-dashed'
              }`}
            >
              {/* Minimalist corner marks */}
              <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-inherit" />
              <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-inherit" />
              <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-inherit" />
              <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-inherit" />

              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs text-white ${
                scanStatus === 'success'
                  ? 'bg-[#2FA84F]'
                  : scanStatus === 'failure'
                  ? 'bg-rose-600'
                  : detectionState?.isMasked
                  ? 'bg-[#1A73C7]/80'
                  : 'bg-black/50'
              }`}>
                {scanStatus === 'success'
                  ? 'Success'
                  : scanStatus === 'failure'
                  ? 'Unmatched Face'
                  : detectionState?.hasFace
                  ? (detectionState?.isMasked ? 'Mask Detected (Periocular AI)' : 'Face Aligned')
                  : 'Fit Face in Frame'}
              </span>

              {detectionState?.hasFace && scanStatus === 'idle' && (
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-white text-xs font-medium shadow-sm ${
                  detectionState?.isMasked ? 'bg-[#1A73C7]' : 'bg-[#2FA84F]'
                }`}>
                  <span className="font-bold text-[10px]">✓</span>
                  <span>{detectionState?.isMasked ? 'Periocular Match Active' : 'Face Detected'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Human-designed Bottom Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  detectionState?.hasFace ? (detectionState.isMasked ? 'bg-[#1A73C7]' : 'bg-[#2FA84F]') : 'bg-amber-400'
                }`}
              />
              <span className="text-[#1A1D23] font-medium text-[11px]">
                {detectionState?.hasFace
                  ? (detectionState.isMasked
                      ? `Quality: ${Math.round((detectionState.qualityScore || 0) * 100)}% (Masked)`
                      : `Quality: ${Math.round((detectionState.qualityScore || 0) * 100)}%`)
                  : 'Ready for employee'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualCapture}
              disabled={!detectionState?.hasFace}
              className="px-3 py-1.5 bg-[#1A73C7] hover:bg-[#0F4C81] disabled:opacity-40 text-white rounded-lg font-medium text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <span>📸</span>
              <span>Capture & Mark</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
