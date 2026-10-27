import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Download, Image as ImageIcon, RefreshCw, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

type FilterType = 'warm' | 'cyber' | 'normal' | 'arcade';
type FrameTheme = 'krmu-ai' | 'chip-champion' | 'pose-quest';

export function PhotographPage() {
  const { profile, currentResult } = useGameStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [visitorName, setVisitorName] = useState(profile.nickname === 'Guest Biter' ? '' : profile.nickname);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('warm');
  const [theme, setTheme] = useState<FrameTheme>('krmu-ai');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [recentSnaps, setRecentSnaps] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize webcam
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      ?.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setCameraError(err instanceof Error ? err.message : 'Please grant webcam permissions to take photos.');
      });

    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Re-attach stream when returning from preview
  useEffect(() => {
    if (videoRef.current && stream && !capturedPhoto) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream, capturedPhoto]);

  // Capture photo
  const takeSnapshot = () => {
    if (countdown !== null) return;
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          renderComposite();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const renderComposite = () => {
    const video = videoRef.current;
    if (!video) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Filters
    if (filter === 'cyber') ctx.filter = 'contrast(1.1) saturate(1.25) hue-rotate(-10deg)';
    else if (filter === 'warm') ctx.filter = 'sepia(0.18) saturate(1.1) contrast(1.05)';
    else if (filter === 'arcade') ctx.filter = 'grayscale(0.3) contrast(1.3) brightness(1.05)';
    else ctx.filter = 'none';

    // Draw mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.filter = 'none';

    // Top Header Banner
    const gradTop = ctx.createLinearGradient(0, 0, 0, 115);
    gradTop.addColorStop(0, 'rgba(17, 13, 11, 0.90)');
    gradTop.addColorStop(1, 'rgba(17, 13, 11, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, canvas.width, 115);

    // Bottom Banner
    const gradBot = ctx.createLinearGradient(0, canvas.height - 145, 0, canvas.height);
    gradBot.addColorStop(0, 'rgba(17, 13, 11, 0)');
    gradBot.addColorStop(0.3, 'rgba(17, 13, 11, 0.88)');
    gradBot.addColorStop(1, 'rgba(17, 13, 11, 0.98)');
    ctx.fillStyle = gradBot;
    ctx.fillRect(0, canvas.height - 145, canvas.width, 145);

    // Accent line
    ctx.fillStyle = theme === 'krmu-ai' ? '#50e3ff' : theme === 'chip-champion' ? '#ffd166' : '#d97746';
    ctx.fillRect(0, canvas.height - 5, canvas.width, 5);

    // Title & event branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Anton", "Space Grotesk", sans-serif';
    ctx.fillText('CHIP BITE CHALLENGE', 40, 52);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.fillText('K.R. MANGALAM UNIVERSITY  •  CENTRE OF EXCELLENCE IN ARTIFICIAL INTELLIGENCE', 40, 78);

    // Player name
    const displayName = visitorName.trim() || 'AI EXPLORER';
    ctx.fillStyle = theme === 'krmu-ai' ? '#50e3ff' : '#ffd166';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('EVENT SOUVENIR', 40, canvas.height - 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Anton", "Space Grotesk", sans-serif';
    ctx.fillText(displayName.toUpperCase(), 40, canvas.height - 35);

    // Right details
    ctx.textAlign = 'right';
    if (currentResult) {
      ctx.fillStyle = '#d97746';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText('BEST GAME SCORE', canvas.width - 40, canvas.height - 75);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px "Anton", sans-serif';
      ctx.fillText(`${currentResult.score} PTS`, canvas.width - 40, canvas.height - 35);
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText('OCTOBER 2026', canvas.width - 40, canvas.height - 75);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Anton", sans-serif';
      ctx.fillText('AI BOOTH SOUVENIR', canvas.width - 40, canvas.height - 35);
    }
    ctx.textAlign = 'left';

    // Logos
    const krmu = new Image();
    krmu.crossOrigin = 'anonymous';
    krmu.src = '/krmu-logo.png';

    const coe = new Image();
    coe.crossOrigin = 'anonymous';
    coe.src = '/krmu-coe-logo.png';

    let count = 0;
    const finalize = () => {
      try {
        if (krmu.width) {
          const w = 160;
          const h = (krmu.height / krmu.width) * w;
          ctx.drawImage(krmu, canvas.width - 310, 26, w, h);
        }
        if (coe.width) {
          const w = 95;
          const h = (coe.height / coe.width) * w;
          ctx.drawImage(coe, canvas.width - 125, 20, w, h);
        }
      } catch {
        // Fallback
      }
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedPhoto(dataUrl);
      setRecentSnaps((prev) => [dataUrl, ...prev.slice(0, 3)]);
    };

    krmu.onload = () => { count++; if (count === 2) finalize(); };
    coe.onload = () => { count++; if (count === 2) finalize(); };
    setTimeout(() => { if (!capturedPhoto) finalize(); }, 150);
  };

  const downloadSnap = () => {
    if (!capturedPhoto) return;
    const link = document.createElement('a');
    link.download = `krmu-photo-souvenir-${(visitorName || 'player').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.href = capturedPhoto;
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-18">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-[#8c827a] hover:text-[#231f1c] dark:text-white/45 dark:hover:text-white transition"
      >
        <ArrowLeft size={15} /> Back to home
      </Link>

      {/* Header Title */}
      <div className="mt-8 flex flex-col justify-between gap-6 border-b border-[#231f1c]/10 pb-8 dark:border-white/10 lg:flex-row lg:items-end">
        <div>
          <div className="eyebrow">photograph menu · activity studio</div>
          <h1 className="font-podium mt-4 text-[clamp(2.8rem,7vw,6.5rem)] uppercase leading-[.88] tracking-[-.04em] text-[#231f1c] dark:text-white">
            Photo<br />Studio.
          </h1>
          <p className="mt-4 max-w-xl font-inter text-base text-[#5c534c] dark:text-white/60">
            Capture your commemorative event souvenir photo card featuring your face, official KRMU & Centre of Excellence in AI branding, and arcade game achievements.
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
        {/* Camera / Photo Stage */}
        <div className="overflow-hidden rounded-xl border border-[#231f1c]/20 bg-black shadow-xl dark:border-white/20">
          <div className="relative aspect-video w-full overflow-hidden">
            {flash && <div className="absolute inset-0 z-40 bg-white" />}

            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                <div className="animate-ping font-podium text-9xl text-[#ffd166]">{countdown}</div>
              </div>
            )}

            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured Souvenir" className="h-full w-full object-contain" />
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

                {/* Live Overlays */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <div className="rounded bg-black/60 px-3.5 py-1.5 backdrop-blur-sm">
                      <div className="font-podium text-sm uppercase text-white">Chip Bite Challenge</div>
                      <div className="font-inter text-[0.55rem] uppercase tracking-widest text-white/60">
                        Photo Studio Live
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded bg-white/95 px-3 py-1 shadow">
                      <img src="/krmu-logo.png" alt="KRMU" className="h-4.5 w-auto object-contain" />
                      <span className="h-3 w-px bg-black/20" />
                      <img src="/krmu-coe-logo.png" alt="CoE AI" className="h-4.5 w-auto object-contain" />
                    </div>
                  </div>

                  <div className="flex items-end justify-between rounded-lg bg-black/70 p-4 backdrop-blur-md">
                    <div>
                      <div className="font-inter text-[0.6rem] font-bold uppercase tracking-widest text-[#ffd166]">
                        Event Visitor
                      </div>
                      <div className="font-podium text-2xl uppercase text-white">
                        {visitorName.trim() || 'AI Explorer'}
                      </div>
                    </div>
                    {currentResult && (
                      <div className="text-right">
                        <div className="font-inter text-[0.6rem] font-bold uppercase tracking-widest text-[#d97746]">
                          Score
                        </div>
                        <div className="font-podium text-2xl uppercase text-white">{currentResult.score} PTS</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white">
                <Camera size={44} className="text-[#ff7b7b]" />
                <div className="font-podium mt-4 text-2xl uppercase">Camera required</div>
                <p className="mt-2 max-w-sm font-inter text-sm text-white/60">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#17152c] p-5 text-white">
            <div className="flex items-center gap-2">
              <span className="font-inter text-xs uppercase tracking-wider text-white/50">Filter:</span>
              {(['warm', 'cyber', 'normal', 'arcade'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded px-3 py-1 font-inter text-xs font-semibold uppercase tracking-wider transition ${
                    filter === f ? 'bg-white text-black' : 'border border-white/20 text-white/70 hover:border-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setCapturedPhoto(null); setCountdown(null); }}
                    className="arcade-button-secondary inline-flex items-center gap-2"
                  >
                    <RefreshCw size={15} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={downloadSnap}
                    className="arcade-button-primary inline-flex items-center gap-2"
                  >
                    {downloaded ? <Check size={16} /> : <Download size={16} />}
                    {downloaded ? 'Saved PNG!' : 'Download Souvenir'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={Boolean(cameraError) || countdown !== null}
                  className="arcade-button-primary inline-flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  {countdown !== null ? `Snapping in ${countdown}s…` : '3-2-1 Snap Photo'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Studio Controls Desk */}
        <aside className="space-y-6">
          <div className="arcade-card p-6">
            <div className="eyebrow">souvenir configuration</div>
            <h2 className="font-podium mt-2 text-2xl uppercase">Personalize card</h2>

            <div className="mt-5">
              <label htmlFor="photo-name" className="font-inter text-xs font-bold uppercase tracking-wider text-[#8c827a] dark:text-white/60">
                Name on Card
              </label>
              <input
                id="photo-name"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                maxLength={24}
                placeholder="Enter your name"
                className="mt-2 w-full border border-[#231f1c]/15 bg-[#231f1c]/5 px-4 py-3 font-inter outline-none transition focus:border-[#d97746] dark:border-white/20 dark:bg-white/[0.04] dark:focus:border-cyan"
              />
            </div>

            <div className="mt-6">
              <label className="font-inter text-xs font-bold uppercase tracking-wider text-[#8c827a] dark:text-white/60">
                Frame Theme
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { id: 'krmu-ai', label: 'KRMU AI' },
                  { id: 'chip-champion', label: 'Champion' },
                  { id: 'pose-quest', label: 'PoseQuest' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id as FrameTheme)}
                    className={`rounded border p-2.5 text-center font-inter text-xs font-bold uppercase tracking-wider transition ${
                      theme === id
                        ? 'border-[#d97746] bg-[#d97746]/10 text-[#d97746] dark:border-cyan dark:bg-cyan/10 dark:text-cyan'
                        : 'border-[#231f1c]/15 text-[#5c534c] hover:border-[#231f1c] dark:border-white/15 dark:text-white/60 dark:hover:border-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-[#231f1c]/10 pt-5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-[#d97746] dark:text-cyan" />
                <div className="font-inter text-xs leading-5 text-[#5c534c] dark:text-white/60">
                  Multiple users supported. Center yourself in the frame to capture clean souvenir photos.
                </div>
              </div>
            </div>
          </div>

          {/* Recent Souvenirs */}
          {recentSnaps.length > 0 && (
            <div className="arcade-card p-6">
              <div className="flex items-center justify-between">
                <div className="eyebrow">session gallery</div>
                <ImageIcon size={16} className="text-[#8c827a] dark:text-white/40" />
              </div>
              <h3 className="font-podium mt-2 text-xl uppercase">Recent Snaps</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {recentSnaps.map((snap, i) => (
                  <img
                    key={i}
                    src={snap}
                    alt={`Snap ${i + 1}`}
                    className="aspect-video w-full cursor-pointer rounded border border-[#231f1c]/15 object-cover transition hover:scale-105 dark:border-white/20"
                    onClick={() => setCapturedPhoto(snap)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Partner Notice */}
          <div className="border border-[#d97746]/25 bg-[#d97746]/10 p-5 dark:border-cyan/25 dark:bg-cyan/10">
            <div className="flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-wider text-[#d97746] dark:text-cyan">
              <Sparkles size={16} /> Official Event Photo Booth
            </div>
            <p className="mt-2 font-inter text-xs leading-5 text-[#5c534c] dark:text-white/60">
              Organized by the Centre of Excellence in Artificial Intelligence, K.R. Mangalam University. Download and share your photos directly!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
