import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Download, RefreshCw, Sparkles, Trophy, X } from 'lucide-react';
import type { GameResult } from '../types';
import { formatScore } from '../utils/validation';

interface PhotoStudioModalProps {
  open: boolean;
  onClose: () => void;
  result?: GameResult | null;
  nickname?: string;
}

type FilterMode = 'warm' | 'normal' | 'cyber' | 'arcade';

const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export function PhotoStudioModal({ open, onClose, result, nickname }: PhotoStudioModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterMode>('warm');
  const [cameraError, setCameraError] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const playerName = nickname || result?.nickname || 'Player';
  const scoreText = result ? formatScore(result.score) : 'EVENT VISITOR';

  // Check for top-3 podium status
  const verifiedRank = result?.verifiedRank?.bestRank ?? (result?.verifiedRank?.allTimeRank ?? result?.verifiedRank?.dailyRank ?? null);
  const isTopThree = verifiedRank !== null && verifiedRank >= 1 && verifiedRank <= 3;
  const rankLabel = verifiedRank === 1 ? '1ST PLACE CHAMPION' : verifiedRank === 2 ? '2ND PLACE PODIUM' : verifiedRank === 3 ? '3RD PLACE PODIUM' : null;

  // Clean up timer and media stream
  const cleanupStream = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  // Start webcam when modal opens
  useEffect(() => {
    if (!open) {
      cleanupStream();
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
        streamRef.current = mediaStream;
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
      cleanupStream();
    };
  }, [open]);

  // Connect stream to video element when returning from preview
  useEffect(() => {
    if (videoRef.current && stream && !capturedDataUrl) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream, capturedDataUrl]);

  // Handle countdown trigger
  const triggerCapture = () => {
    if (countdown !== null || isCapturing) return;
    setCountdown(3);
    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          void snapPhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture canvas image with composite branding and aspect-ratio crop fix
  const snapPhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

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

    // Aspect-ratio cover crop math to avoid face squishing
    const videoW = video.videoWidth || 1280;
    const videoH = video.videoHeight || 720;
    const targetAspect = canvas.width / canvas.height;
    const videoAspect = videoW / videoH;

    let sx = 0;
    let sy = 0;
    let sWidth = videoW;
    let sHeight = videoH;

    if (videoAspect > targetAspect) {
      // Source video is wider than 16:9 - crop horizontally
      sWidth = videoH * targetAspect;
      sx = (videoW - sWidth) / 2;
    } else {
      // Source video is taller than 16:9 - crop vertically
      sHeight = videoW / targetAspect;
      sy = (videoH - sHeight) / 2;
    }

    // Draw horizontally-mirrored video frame
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Reset filter for graphic overlay elements
    ctx.filter = 'none';

    // Top Header Gradient Banner
    const gradientTop = ctx.createLinearGradient(0, 0, 0, 120);
    gradientTop.addColorStop(0, 'rgba(15, 12, 10, 0.92)');
    gradientTop.addColorStop(0.7, 'rgba(15, 12, 10, 0.65)');
    gradientTop.addColorStop(1, 'rgba(15, 12, 10, 0)');
    ctx.fillStyle = gradientTop;
    ctx.fillRect(0, 0, canvas.width, 120);

    // Bottom Footer Gradient Banner
    const gradientBottom = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
    gradientBottom.addColorStop(0, 'rgba(15, 12, 10, 0)');
    gradientBottom.addColorStop(0.3, 'rgba(15, 12, 10, 0.82)');
    gradientBottom.addColorStop(1, 'rgba(15, 12, 10, 0.97)');
    ctx.fillStyle = gradientBottom;
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

    // Accent Bottom Strip Line
    const accentColor = isTopThree ? (verifiedRank === 1 ? '#ffd166' : verifiedRank === 2 ? '#e0e0e0' : '#cd7f32') : '#d97746';
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, canvas.height - 5, canvas.width, 5);

    // Event & Studio Branding Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Bebas Neue", "Space Grotesk", sans-serif';
    ctx.fillText('CHIP BITE CHALLENGE', 40, 48);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.fillText('K.R. MANGALAM UNIVERSITY  •  CENTRE OF EXCELLENCE IN AI', 40, 72);

    // Bottom Left: Player Profile & Podium Achievement
    if (rankLabel) {
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText(`★ ${rankLabel} ★`, 40, canvas.height - 82);
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText('OFFICIAL PLAYER SOUVENIR', 40, canvas.height - 82);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Bebas Neue", "Space Grotesk", sans-serif';
    ctx.fillText(playerName.toUpperCase(), 40, canvas.height - 38);

    // Bottom Right: Score & Match Performance
    if (result) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d97746';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText('FINAL SCORE', canvas.width - 40, canvas.height - 82);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Bebas Neue", "Space Grotesk", sans-serif';
      ctx.fillText(`${scoreText} PTS`, canvas.width - 40, canvas.height - 38);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '600 12px "Inter", sans-serif';
      ctx.fillText(
        `COMBO ×${result.bestCombo}  •  BITES: ${result.capturedChips}${verifiedRank ? `  •  RANK #${verifiedRank}` : ''}`,
        canvas.width - 40,
        canvas.height - 18
      );
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Bebas Neue", "Space Grotesk", sans-serif';
      ctx.fillText(
        new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        canvas.width - 40,
        canvas.height - 40
      );
      ctx.textAlign = 'left';
    }

    // Preload logos reliably before finalizing canvas
    try {
      const [krmuImg, coeImg] = await Promise.all([
        loadImage('/krmu-logo.png'),
        loadImage('/krmu-coe-logo.png'),
      ]);

      if (krmuImg && krmuImg.width > 0) {
        const krmuW = 150;
        const krmuH = (krmuImg.height / krmuImg.width) * krmuW;
        ctx.drawImage(krmuImg, canvas.width - 300, 24, krmuW, krmuH);
      }

      if (coeImg && coeImg.width > 0) {
        const coeW = 95;
        const coeH = (coeImg.height / coeImg.width) * coeW;
        ctx.drawImage(coeImg, canvas.width - 120, 20, coeW, coeH);
      }
    } catch {
      // Gracefully continue if logos failed to load
    }

    setCapturedDataUrl(canvas.toDataURL('image/png'));
    setIsCapturing(false);
  };

  // Download snapshot as PNG
  const downloadPhoto = () => {
    if (!capturedDataUrl) return;
    const link = document.createElement('a');
    const safeName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeScore = result ? `${result.score}pts-` : '';
    link.download = `krmu-chip-bite-${safeName}-${safeScore}${Date.now()}.png`;
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
      <div className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#231f1c]/20 bg-[#faf8f5] text-[#231f1c] shadow-2xl dark:border-white/20 dark:bg-[#110d0b] dark:text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#231f1c]/10 bg-[#f4efe9] px-6 py-4 dark:border-white/10 dark:bg-black/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#d97746]/40 bg-[#d97746]/10 text-[#d97746]">
              <Camera size={19} />
            </div>
            <div>
              <div className="font-podium text-lg uppercase tracking-wide">Photograph Menu • Souvenir Studio</div>
              <div className="font-inter text-[0.62rem] uppercase tracking-[0.16em] text-[#8c827a] dark:text-white/45">
                K.R. Mangalam University • Centre of Excellence in AI
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
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs">
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
                <div className="flex items-end justify-between rounded-lg bg-black/75 p-4 backdrop-blur-md">
                  <div>
                    {rankLabel ? (
                      <div className="flex items-center gap-1.5 font-inter text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#ffd166]">
                        <Trophy size={13} /> {rankLabel}
                      </div>
                    ) : (
                      <div className="font-inter text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#ffd166]">
                        Target Player
                      </div>
                    )}
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
                disabled={Boolean(cameraError) || countdown !== null || isCapturing}
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
