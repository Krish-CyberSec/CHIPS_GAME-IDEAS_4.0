import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, ArrowUpRight, Camera, Check, CheckCircle2, ChevronRight, Eye, Info, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Trash2, User, Volume2, VolumeX, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { gameStore, useGameStore } from '../store/gameStore';
import { useWebcamVision } from '../vision/useWebcamVision';
import { describeVisionError } from '../vision/errors';
import { normalizePhoneNumber, validateEmail, validateNickname, validatePhoneNumber } from '../utils/validation';
import { apiPlayerRepository } from '../services/storage';

const setupSteps = [
  ['01', 'Choose a name', 'Your nickname appears on the local podium and results screen.'],
  ['02', 'Activate the camera', 'Webcam tracking is the only control system in the arena. Your face stays in the browser.'],
  ['03', 'Calibrate, then bite', 'A short calibration learns your comfortable closed and open mouth ranges.'],
];

export function SetupPage() {
  const navigate = useNavigate();
  const { settings, profile } = useGameStore();

  const [nickname, setNickname] = useState(profile.nickname === 'Guest Biter' ? '' : profile.nickname);
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.phoneNumber ?? '');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(profile.profilePicture ?? null);
  const [autoCaptureConsent, setAutoCaptureConsent] = useState(true);

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ nickname?: string; email?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [calibrationPhase, setCalibrationPhase] = useState<'idle' | 'closed' | 'open' | 'done'>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);
  const vision = useWebcamVision(videoRef);
  const startVision = vision.start;
  const stopVision = vision.stop;

  useEffect(() => () => stopVision(), [stopVision]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    try {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - minDim) / 2;
      const sy = (video.videoHeight - minDim) / 2;

      // Mirror horizontally to match mirrored video display
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn('Could not capture frame from webcam:', err);
      return null;
    }
  }, [videoRef]);

  const startCamera = async () => {
    setCameraError('');
    try {
      await startVision();
    } catch (caught) {
      setCameraError(describeVisionError(caught));
    }
  };

  const calibrate = async () => {
    setCameraError('');
    try {
      const result = await vision.startCalibration(setCalibrationPhase);
      gameStore.updateSettings({ calibrationResult: result });
      setCalibrationPhase('done');
      if (autoCaptureConsent) {
        setTimeout(() => {
          captureFrame();
        }, 150);
      }
    } catch (caught) {
      setCalibrationPhase('idle');
      setCameraError(describeVisionError(caught));
    }
  };

  const cameraReady = vision.modelReady && Boolean(vision.calibrationResult);

  const clearForm = () => {
    setNickname('');
    setEmail('');
    setPhone('');
    setCapturedPhoto(null);
    setError('');
    setFieldErrors({});
  };

  const submit = async () => {
    setError('');
    const errors: { nickname?: string; email?: string; phone?: string } = {};

    const nameValidation = validateNickname(nickname);
    if (nameValidation) errors.nickname = nameValidation;

    if (email.trim()) {
      const emailValidation = validateEmail(email);
      if (emailValidation) errors.email = emailValidation;
    }

    let normalizedPhone: string | undefined;
    if (phone.trim()) {
      const phoneValidation = validatePhoneNumber(phone);
      if (phoneValidation) errors.phone = phoneValidation;
      else {
        const norm = normalizePhoneNumber(phone);
        normalizedPhone = norm.normalized || undefined;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please review the highlighted fields before starting.');
      return;
    }

    if (!cameraReady) {
      setError('Enable the camera and complete calibration before entering the arena.');
      return;
    }

    setIsSubmitting(true);
    const cleanName = nickname.trim();

    try {
      // Register with backend if API is configured (safe best-effort)
      await apiPlayerRepository.register({
        nickname: cleanName,
        email: email.trim() || undefined,
        phoneNumber: normalizedPhone,
        profilePicture: capturedPhoto || undefined,
      });
    } catch (err) {
      // Offline fallback: registration continues locally
      console.warn('Backend player registration skipped or failed:', err);
    } finally {
      setIsSubmitting(false);
    }

    // Persist profile with nickname, contact details, and avatar
    gameStore.updateProfile({
      nickname: cleanName,
      email: email.trim() || null,
      phoneNumber: normalizedPhone || null,
      profilePicture: capturedPhoto,
    });
    gameStore.updateSettings({
      mode: 'webcam',
      soundEnabled: settings.soundEnabled,
      soundVolume: settings.soundVolume,
      musicEnabled: settings.musicEnabled,
    });
    navigate('/game');
  };

  const status = vision.message === 'ready'
    ? 'Tracking ready · move naturally'
    : vision.message === 'no-face'
      ? 'Camera live · looking across the full frame'
      : vision.message === 'multiple-faces'
        ? 'One face at a time, please'
        : vision.message === 'tracking-lost'
          ? 'Reacquiring face signal'
          : vision.message.replace('-', ' ');

  const currentOpenness = vision.state.openness;
  const activeThreshold = vision.calibrationResult?.threshold ?? 0.28;
  const isBiteTriggered = vision.state.isOpen;
  const meterPercent = Math.min(100, Math.max(0, (currentOpenness / 0.8) * 100));
  const thresholdPercent = Math.min(100, Math.max(0, (activeThreshold / 0.8) * 100));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-18">
      <Link to="/" className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-white/45 transition hover:text-white">
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="mt-12 grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <div className="eyebrow">player setup · 02</div>
          <h1 className="font-podium mt-5 text-[clamp(3rem,6vw,6.5rem)] uppercase leading-[.88] tracking-[-.04em] text-white">
            Get ready<br />to bite.
          </h1>
          <p className="mt-7 max-w-lg font-inter text-base leading-8 text-white/55">
            Build your player identity, activate the camera, and calibrate your bite. The arena is designed around one precise, physical control system: your face.
          </p>

          <div className="mt-10 space-y-5 border-t border-white/15 pt-6">
            {setupSteps.map(([number, title, copy]) => (
              <div className="flex gap-4" key={number}>
                <span className="font-podium text-2xl text-white/25">{number}</span>
                <div>
                  <h2 className="font-podium text-xl uppercase text-white">{title}</h2>
                  <p className="mt-1 font-inter text-sm leading-6 text-white/45">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 border border-cyan/20 bg-cyan/[.06] p-5">
            <div className="flex items-center gap-3 font-inter text-xs font-bold uppercase tracking-[.16em] text-cyan">
              <ShieldCheck size={17} /> Privacy by default
            </div>
            <p className="mt-3 font-inter text-sm leading-6 text-white/50">
              Camera frames and facial landmarks stay strictly in your browser. The game never uploads video or facial imagery.
            </p>
          </div>
        </div>

        <div className="border border-white/15 bg-black/20 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
            <div>
              <div className="eyebrow">launch sequence</div>
              <h2 className="font-podium mt-2 text-3xl uppercase text-white">Configure your run.</h2>
            </div>
            <Sparkles className="text-gold" size={26} />
          </div>

          {/* Player Registration Section */}
          <div className="mt-7 space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-inter text-xs font-bold uppercase tracking-[.18em] text-white/70">
                Player Registration
              </span>
              <button
                type="button"
                onClick={clearForm}
                className="font-inter text-[.68rem] uppercase tracking-[.14em] text-white/40 hover:text-coral transition"
              >
                Clear form
              </button>
            </div>

            {/* Nickname field */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="nickname" className="font-inter text-xs font-bold uppercase tracking-[.16em] text-white/65">
                  Display nickname <span className="text-cyan">* Required</span>
                </label>
                <span className="font-inter text-[.65rem] uppercase tracking-[.12em] text-white/30">{nickname.length}/18</span>
              </div>
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, nickname: undefined }));
                  setError('');
                }}
                maxLength={18}
                placeholder="e.g. Neon Nibbler"
                className={`mt-2 w-full border bg-white/[.04] px-4 py-3.5 font-inter text-white outline-none transition placeholder:text-white/25 focus:border-cyan ${
                  fieldErrors.nickname ? 'border-coral' : 'border-white/15'
                }`}
              />
              {fieldErrors.nickname && (
                <div className="mt-1.5 flex items-center gap-1.5 font-inter text-xs text-coral">
                  <XCircle size={14} /> {fieldErrors.nickname}
                </div>
              )}
            </div>

            {/* Email field (Optional) */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="font-inter text-xs font-bold uppercase tracking-[.16em] text-white/65">
                  Email address <span className="text-white/40 font-normal">Optional · Tournament verification</span>
                </label>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  setError('');
                }}
                maxLength={256}
                placeholder="e.g. player@example.com"
                className={`mt-2 w-full border bg-white/[.04] px-4 py-3.5 font-inter text-white outline-none transition placeholder:text-white/25 focus:border-cyan ${
                  fieldErrors.email ? 'border-coral' : 'border-white/15'
                }`}
              />
              {fieldErrors.email && (
                <div className="mt-1.5 flex items-center gap-1.5 font-inter text-xs text-coral">
                  <XCircle size={14} /> {fieldErrors.email}
                </div>
              )}
            </div>

            {/* Phone number field (Optional) */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="phone" className="font-inter text-xs font-bold uppercase tracking-[.16em] text-white/65">
                  Phone number <span className="text-white/40 font-normal">Optional · Prize notifications</span>
                </label>
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  setError('');
                }}
                maxLength={30}
                placeholder="e.g. +1 (555) 234-5678"
                className={`mt-2 w-full border bg-white/[.04] px-4 py-3.5 font-inter text-white outline-none transition placeholder:text-white/25 focus:border-cyan ${
                  fieldErrors.phone ? 'border-coral' : 'border-white/15'
                }`}
              />
              {fieldErrors.phone && (
                <div className="mt-1.5 flex items-center gap-1.5 font-inter text-xs text-coral">
                  <XCircle size={14} /> {fieldErrors.phone}
                </div>
              )}
            </div>

            {/* Registration Privacy Notice */}
            <div className="border border-white/10 bg-white/[.02] p-3.5 font-inter text-xs leading-5 text-white/50 flex items-start gap-2.5">
              <Info size={16} className="text-cyan shrink-0 mt-0.5" />
              <div>
                <strong className="text-white/70">Registration &amp; Privacy:</strong> Providing email and phone is optional. Contact information is used exclusively for tournament prize awards and official verification. Personal details are never published on leaderboards and are never stored in browser local storage.
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 border border-coral/30 bg-coral/10 p-3 font-inter text-xs text-coral">
                <XCircle size={16} /> {error}
              </div>
            )}
          </div>

          <div className="mt-8 border border-cyan/25 bg-cyan/[.06] p-5">
            <div className="flex items-center gap-3">
              <Camera className="text-cyan" size={21} />
              <div>
                <div className="font-inter text-xs font-bold uppercase tracking-[.18em] text-cyan">Camera control only</div>
                <div className="font-podium mt-1 text-2xl uppercase text-white">Move + bite</div>
              </div>
              <span className="ml-auto border border-cyan/30 px-3 py-1 font-inter text-[.6rem] font-bold uppercase tracking-[.15em] text-cyan">
                Required
              </span>
            </div>
            <p className="mt-3 font-inter text-sm leading-6 text-white/50">
              Move your head to position the capture ring. Open your mouth once for a bite, then close before the next target. There are no alternate controls in this experience.
            </p>
          </div>

          {/* Audio Controls Section */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="font-inter text-xs font-bold uppercase tracking-[.16em] text-white/60 mb-3">
              Audio Settings
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`flex items-center justify-between border border-white/10 bg-white/[.03] px-4 py-3 font-inter text-xs uppercase tracking-[.12em] transition hover:border-white/30 ${
                  settings.soundEnabled ? 'text-white' : 'text-white/40'
                }`}
                onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}
                aria-label="Toggle sound effects"
              >
                <span className="flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound effects
                </span>
                <span>{settings.soundEnabled ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-between border border-white/10 bg-white/[.03] px-4 py-3 font-inter text-xs uppercase tracking-[.12em] text-white/60 transition hover:border-white/30"
                onClick={() => gameStore.updateSettings({ musicEnabled: !settings.musicEnabled })}
                aria-label="Toggle ambient music"
              >
                <span>Ambient music</span>
                <span>{settings.musicEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="mt-3 border border-white/10 bg-white/[.02] p-3.5">
              <div className="flex items-center justify-between font-inter text-xs uppercase tracking-[.12em] text-white/60">
                <span className="flex items-center gap-2">
                  {settings.soundEnabled && (settings.soundVolume ?? 0.8) > 0 ? (
                    <Volume2 size={15} className="text-cyan" />
                  ) : (
                    <VolumeX size={15} className="text-white/40" />
                  )}
                  Sound Volume
                </span>
                <span className="font-mono text-cyan">
                  {settings.soundEnabled ? `${Math.round((settings.soundVolume ?? 0.8) * 100)}%` : 'Muted'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundEnabled ? (settings.soundVolume ?? 0.8) : 0}
                disabled={!settings.soundEnabled}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  gameStore.updateSettings({ soundVolume: vol });
                  if (vol > 0 && !settings.soundEnabled) {
                    gameStore.updateSettings({ soundEnabled: true, soundVolume: vol });
                  }
                }}
                aria-label="Sound volume slider"
                className="mt-2.5 w-full accent-cyan disabled:opacity-40"
              />
            </div>
          </div>

          {/* Camera Station */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">camera station</div>
                <h2 className="font-podium mt-2 text-2xl uppercase text-white">{status}</h2>
              </div>
              <div className={`h-3 w-3 rounded-full ${vision.state.reliable ? 'bg-cyan shadow-[0_0_12px_#50e3ff]' : 'bg-white/20'}`} />
            </div>

            <div className="relative mt-5 aspect-video overflow-hidden border border-white/15 bg-[#080708]">
              <video ref={videoRef} className="h-full w-full scale-x-[-1] object-contain" playsInline muted />
              <div className="pointer-events-none absolute inset-4 border border-cyan/35">
                <span className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2 border-cyan" />
                <span className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2 border-cyan" />
                <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-cyan" />
                <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-cyan" />
              </div>
              <div className="pointer-events-none absolute inset-[12%] rounded-[32%] border border-dashed border-white/35 bg-cyan/[.025]">
                <div className="absolute -bottom-7 left-0 right-0 text-center font-inter text-[.58rem] uppercase tracking-[.16em] text-white/45">
                  recommended position · full frame remains active
                </div>
              </div>
              {vision.message === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6 text-center font-inter text-sm text-white/65">
                  Allow camera access to activate the mouth tracker.
                </div>
              )}
            </div>
            <p className="mt-3 font-inter text-xs leading-5 text-white/40">
              The dashed frame is a comfort guide, not a hard boundary. Face tracking works anywhere your face is clearly visible inside the camera view.
            </p>

            {vision.modelReady && (
              <div className="mt-4 border border-white/10 bg-white/[.02] p-4">
                <div className="flex items-center justify-between text-xs font-inter uppercase tracking-[.14em]">
                  <span className="text-white/60">Live mouth openness</span>
                  <span className={isBiteTriggered ? 'font-bold text-cyan' : 'text-white/40'}>
                    {isBiteTriggered ? 'Bite triggered' : 'Neutral / Closed'}
                  </span>
                </div>
                <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-75 ${isBiteTriggered ? 'bg-cyan shadow-[0_0_8px_#50e3ff]' : 'bg-white/40'}`}
                    style={{ width: `${meterPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gold shadow-[0_0_4px_#ffe078]"
                    style={{ left: `${thresholdPercent}%` }}
                    title={`Bite threshold: ${activeThreshold.toFixed(3)}`}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-inter text-[.6rem] uppercase tracking-[.12em] text-white/35">
                  <span>Closed</span>
                  <span className="text-gold/80">Threshold ({activeThreshold.toFixed(3)})</span>
                  <span>Open</span>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 border border-white/20 bg-white/[.06] px-4 py-3 font-inter text-xs font-bold uppercase tracking-[.15em] text-white transition hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                onClick={startCamera}
                disabled={vision.message === 'loading-camera' || vision.message === 'loading-model'}
              >
                {vision.message === 'loading-camera' || vision.message === 'loading-model' ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Camera size={17} />
                )}
                {vision.modelReady ? 'Camera ready' : 'Enable camera'}
              </button>

              {vision.modelReady && (
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 border border-white/20 bg-white/[.03] px-4 py-3 font-inter text-xs font-bold uppercase tracking-[.15em] text-white/75 transition hover:border-white hover:text-white disabled:opacity-40"
                  onClick={calibrate}
                  disabled={calibrationPhase === 'closed' || calibrationPhase === 'open'}
                >
                  <RefreshCw size={16} />
                  {calibrationPhase === 'closed'
                    ? 'Keep your mouth closed…'
                    : calibrationPhase === 'open'
                      ? 'Open comfortably…'
                      : calibrationPhase === 'done'
                        ? 'Recalibrate'
                        : 'Calibrate mouth'}
                </button>
              )}

              {cameraError && (
                <div className="border border-coral/25 bg-coral/10 p-3 font-inter text-xs leading-5 text-coral">
                  {cameraError}
                </div>
              )}

              {vision.modelReady && (
                <div className="flex items-center gap-2 font-inter text-xs text-white/45">
                  <CheckCircle2 size={15} className={vision.calibrationResult ? 'text-cyan' : 'text-white/25'} />
                  {vision.calibrationResult
                    ? `Calibration ready · threshold ${vision.calibrationResult.threshold.toFixed(3)}`
                    : 'Calibration required before play'}
                </div>
              )}
            </div>

            {/* Profile Picture Capture & Management */}
            <div className="mt-5 border border-white/10 bg-white/[.02] p-4">
              <div className="flex items-center justify-between">
                <span className="font-inter text-xs font-bold uppercase tracking-[.14em] text-white/70">
                  Player Profile Picture
                </span>
                <label className="flex items-center gap-2 cursor-pointer font-inter text-[.68rem] uppercase tracking-[.12em] text-white/50 hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoCaptureConsent}
                    onChange={(e) => setAutoCaptureConsent(e.target.checked)}
                    className="accent-cyan rounded"
                  />
                  <span>Auto-capture on calibrate</span>
                </label>
              </div>

              {capturedPhoto ? (
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 bg-black/40 p-3.5 border border-white/10">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-cyan shadow-[0_0_15px_rgba(80,227,255,0.25)]">
                    <img
                      src={capturedPhoto}
                      alt="Player profile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="font-inter text-xs font-bold uppercase tracking-[.12em] text-cyan flex items-center justify-center sm:justify-start gap-1.5">
                      <Check size={14} /> Profile Picture Ready
                    </div>
                    <p className="mt-1 font-inter text-[.72rem] text-white/45">
                      Will be featured on podiums, leaderboards, and your end-of-game report.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                      {vision.modelReady && (
                        <button
                          type="button"
                          onClick={captureFrame}
                          className="inline-flex items-center gap-1 border border-white/20 bg-white/[.05] px-2.5 py-1 text-[.65rem] font-bold uppercase tracking-wider text-white hover:border-cyan hover:text-cyan transition"
                        >
                          <RefreshCw size={12} /> Retake
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCapturedPhoto(null)}
                        className="inline-flex items-center gap-1 border border-coral/30 bg-coral/10 px-2.5 py-1 text-[.65rem] font-bold uppercase tracking-wider text-coral hover:bg-coral/20 transition"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3 text-white/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[.02]">
                      <User size={20} className="text-white/30" />
                    </div>
                    <p className="font-inter text-xs leading-5">
                      {vision.modelReady
                        ? 'Ready to capture. Will snap automatically when calibration finishes.'
                        : 'Enable camera above to enable photo capture.'}
                    </p>
                  </div>
                  {vision.modelReady && (
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="shrink-0 border border-white/20 px-3 py-1.5 font-inter text-[.65rem] font-bold uppercase tracking-wider text-white hover:border-cyan hover:text-cyan transition"
                    >
                      Snap Photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 font-inter text-xs text-white/40">
              <Eye size={16} className="text-cyan" /> Your face stays on this device · move freely in frame.
            </div>
            <button
              type="button"
              className="group inline-flex items-center justify-center gap-3 bg-white px-6 py-4 font-inter text-xs font-bold uppercase tracking-[.2em] text-black transition hover:bg-cyan disabled:cursor-not-allowed disabled:opacity-50"
              onClick={submit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> Entering...
                </>
              ) : (
                <>
                  Start game{' '}
                  <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
        <div>
          <div className="font-podium text-2xl uppercase text-white">45 sec</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-white/40">Standard round</div>
        </div>
        <div>
          <div className="font-podium text-2xl uppercase text-white">Score levels</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-white/40">Earn your next level</div>
        </div>
        <div>
          <div className="font-podium text-2xl uppercase text-white">Local first</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-white/40">Privacy by design</div>
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <Link className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-white/45 transition hover:text-white" to="/how-to-play">
          Review the full briefing <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}
