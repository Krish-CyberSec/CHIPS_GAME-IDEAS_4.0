import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Download, RefreshCw, Sparkles, X } from 'lucide-react';
import type { GameResult } from '../types';
import { formatScore } from '../utils/validation';

interface PhotoStudioModalProps {
  open: boolean;
  onClose: () => void;
  result?: GameResult | null;
  nickname?: string;
}

type FilterMode = 'normal' | 'warm' | 'cyber' | 'arcade';

export function PhotoStudioModal({ open, onClose, result, nickname }: PhotoStudioModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterMode>('warm');
  const [cameraError, setCameraError] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const playerName = nickname || result?.nickname || 'Player';
  const scoreText = result ? formatScore(result.score) : 'EVENT VISITOR';

  // Start webcam when modal opens
  useEffect(() => {
    if (!open) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCapturedDataUrl(null);
      setCountdown(null);
      return;
    }

    let isMounted = true;
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        setCameraError('');
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setCameraError(err instanceof Error ? err.message : 'Webcam access is required for photo souvenir.');
      });

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [open]);

  // Connect stream to video element when ready
  useEffect(() => {
    if (videoRef.current && stream && !capturedDataUrl) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream, capturedDataUrl]);

  // Handle countdown trigger
  const triggerCapture = () => {
    if (countdown !== null) return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          snapPhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture canvas image with composite branding
  const snapPhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply filter styles
    if (filter === 'cyber') {
      ctx.filter = 'contrast(1.1) saturate(1.25) hue-rotate(-10deg)';
    } else if (filter === 'warm') {
      ctx.filter = 'sepia(0.18) saturate(1.1) contrast(1.05)';
    } else if (filter === 'arcade') {
      ctx.filter = 'grayscale(0.3) contrast(1.3) brightness(1.05)';
    } else {
      ctx.filter = 'none';
    }

    // Draw mirrored video frame
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Reset filter for graphics overlays
    ctx.filter = 'none';

    // Top Header Banner
    const gradientTop = ctx.createLinearGradient(0, 0, 0, 110);
    gradientTop.addColorStop(0, 'rgba(17, 13, 11, 0.88)');
    gradientTop.addColorStop(1, 'rgba(17, 13, 11, 0)');
    ctx.fillStyle = gradientTop;
    ctx.fillRect(0, 0, canvas.width, 110);

    // Bottom Banner
    const gradientBottom = ctx.createLinearGradient(0, canvas.height - 140, 0, canvas.height);
    gradientBottom.addColorStop(0, 'rgba(17, 13, 11, 0)');
    gradientBottom.addColorStop(0.35, 'rgba(17, 13, 11, 0.85)');
    gradientBottom.addColorStop(1, 'rgba(17, 13, 11, 0.96)');
    ctx.fillStyle = gradientBottom;
    ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

    // Accent Line
    ctx.fillStyle = '#d97746';
    ctx.fillRect(0, canvas.height - 4, canvas.width, 4);

    // Watermark / Event text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Anton", "Space Grotesk", sans-serif';
    ctx.fillText('CHIP BITE CHALLENGE', 40, 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('K.R. MANGALAM UNIVERSITY  •  CENTRE OF EXCELLENCE IN AI', 40, 75);

    // Bottom Player Details
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText('PLAYER SOUVENIR', 40, canvas.height - 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Anton", "Space Grotesk", sans-serif';
    ctx.fillText(playerName.toUpperCase(), 40, canvas.height - 35);

    // Right Score box
    if (result) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d97746';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText('FINAL SCORE', canvas.width - 40, canvas.height - 75);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Anton", "Space Grotesk", sans-serif';
      ctx.fillText(`${scoreText} PTS`, canvas.width - 40, canvas.height - 35);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '600 13px "Inter", sans-serif';
      ctx.fillText(`COMBO ×${result.bestCombo}  •  BITES: ${result.capturedChips}`, canvas.width - 40, canvas.height - 15);
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Anton", sans-serif';
      ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), canvas.width - 40, canvas.height - 40);
      ctx.textAlign = 'left';
    }

    // Stamp KRMU & CoE AI Logos onto top-right of canvas
    const krmuImg = new Image();
    krmuImg.crossOrigin = 'anonymous';
    krmuImg.src = '/krmu-logo.png';

    const coeImg = new Image();
    coeImg.crossOrigin = 'anonymous';
    coeImg.src = '/krmu-coe-logo.png';

    let loadedCount = 0;
    const finalizeCanvas = () => {
      try {
        if (krmuImg.width) {
          const krmuW = 160;
          const krmuH = (krmuImg.height / krmuImg.width) * krmuW;
          ctx.drawImage(krmuImg, canvas.width - 320, 26, krmuW, krmuH);
        }
        if (coeImg.width) {
          const coeW = 100;
          const coeH = (coeImg.height / coeImg.width) * coeW;
          ctx.drawImage(coeImg, canvas.width - 130, 20, coeW, coeH);
        }
      } catch {
        // Fallback gracefully if logo image load was restricted
      }
      setCapturedDataUrl(canvas.toDataURL('image/png'));
    };

    krmuImg.onload = () => { loadedCount++; if (loadedCount === 2) finalizeCanvas(); };
    coeImg.onload = () => { loadedCount++; if (loadedCount === 2) finalizeCanvas(); };
    setTimeout(() => { if (!capturedDataUrl) finalizeCanvas(); }, 150);
  };

  // Download snapshot as PNG
  const downloadPhoto = () => {
    if (!capturedDataUrl) return;
    const link = document.createElement('a');
    link.download = `krmu-chip-bite-${playerName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.href = capturedDataUrl;
    link.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const retakePhoto = () => {
    setCapturedDataUrl(null);
    setCountdown(null);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photograph Studio"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md transition-all duration-300"
    >
      <div className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#231f1c]/20 bg-[#faf8f5] text-[#231f1c] shadow-2xl dark:border-white/20 dark:bg-[#110d0b] dark:text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#231f1c]/10 bg-[#f4efe9] px-6 py-4 dark:border-white/10 dark:bg-black/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#d97746]/40 bg-[#d97746]/10 text-[#d97746]">
              <Camera size={19} />
            </div>
            <div>
              <div className="font-podium text-lg uppercase tracking-wide">Photograph Menu · Souvenir Studio</div>
              <div className="font-inter text-[0.62rem] uppercase tracking-[0.16em] text-[#8c827a] dark:text-white/45">
                K.R. Mangalam University · Centre of Excellence in AI
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-[#8c827a] hover:bg-[#231f1c]/10 hover:text-[#231f1c] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close studio"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {flash && <div className="absolute inset-0 z-40 bg-white transition-opacity duration-200" />}

          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-xs">
              <div className="animate-ping font-podium text-9xl text-[#ffd166]">{countdown}</div>
            </div>
          )}

          {capturedDataUrl ? (
            <img src={capturedDataUrl} alt="Captured Souvenir" className="h-full w-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full scale-x-[-1] object-cover ${
                  filter === 'cyber'
                    ? 'contrast-[1.1] saturate-[1.25] hue-rotate-[-10deg]'
                    : filter === 'warm'
                    ? 'sepia-[0.18] saturate-[1.1] contrast-[1.05]'
                    : filter === 'arcade'
                    ? 'grayscale-[0.3] contrast-[1.3] brightness-[1.05]'
                    : ''
                }`}
              />

              {/* Live Preview Overlay Frame */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
                {/* Top Overlay Branding */}
                <div className="flex items-start justify-between">
                  <div className="rounded bg-black/60 px-3.5 py-2 backdrop-blur-sm">
                    <div className="font-podium text-sm uppercase tracking-wide text-white">Chip Bite Challenge</div>
                    <div className="font-inter text-[0.58rem] uppercase tracking-[0.18em] text-white/60">
                      Live Souvenir Frame
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded bg-white/95 px-3 py-1.5 shadow backdrop-blur-sm">
                    <img src="/krmu-logo.png" alt="KRMU" className="h-5 w-auto object-contain" />
                    <span className="h-3.5 w-px bg-black/20" />
                    <img src="/krmu-coe-logo.png" alt="CoE AI" className="h-5 w-auto object-contain" />
                  </div>
                </div>

                {/* Bottom Overlay Card */}
                <div className="flex items-end justify-between rounded-lg bg-black/70 p-4 backdrop-blur-md">
                  <div>
                    <div className="font-inter text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#ffd166]">
                      Target Player
                    </div>
                    <div className="font-podium text-2xl uppercase tracking-wide text-white">{playerName}</div>
                  </div>
                  {result && (
                    <div className="text-right">
                      <div className="font-inter text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#d97746]">
                        Round Score
                      </div>
                      <div className="font-podium text-3xl uppercase text-white">{scoreText} PTS</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center text-white">
              <Camera size={44} className="text-[#ff7b7b]" />
              <div className="font-podium mt-4 text-2xl uppercase">Camera unavailable</div>
              <p className="mt-2 max-w-sm font-inter text-sm text-white/60">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Studio Controls Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#231f1c]/10 bg-[#f4efe9] p-5 dark:border-white/10 dark:bg-black/50">
          {/* Filters Selector */}
          {!capturedDataUrl && (
            <div className="flex items-center gap-2">
              <span className="font-inter text-xs font-bold uppercase tracking-wider text-[#8c827a] dark:text-white/40">
                Filter:
              </span>
              {(['warm', 'normal', 'cyber', 'arcade'] as FilterMode[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded px-3 py-1.5 font-inter text-xs font-semibold uppercase tracking-wider transition ${
                    filter === f
                      ? 'bg-[#231f1c] text-[#faf8f5] dark:bg-white dark:text-black shadow-sm'
                      : 'border border-[#231f1c]/15 text-[#5c534c] hover:border-[#231f1c] dark:border-white/20 dark:text-white/60 dark:hover:border-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-3">
            {capturedDataUrl ? (
              <>
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="arcade-button-secondary inline-flex items-center gap-2"
                >
                  <RefreshCw size={15} /> Retake
                </button>
                <button
                  type="button"
                  onClick={downloadPhoto}
                  className="arcade-button-primary inline-flex items-center gap-2"
                >
                  {copied ? <Check size={16} /> : <Download size={16} />}
                  {copied ? 'Downloaded!' : 'Download Souvenir Card'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={triggerCapture}
                disabled={Boolean(cameraError) || countdown !== null}
                className="arcade-button-primary inline-flex items-center gap-2"
              >
                <Sparkles size={16} />
                {countdown !== null ? `Snapping in ${countdown}s…` : '3-2-1 Snap Souvenir Photo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
