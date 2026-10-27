import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Camera, CheckCircle2, ChevronRight, Eye, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Sliders, Users, Volume2, VolumeX, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { gameStore, useGameStore } from '../store/gameStore';
import { useWebcamVision } from '../vision/useWebcamVision';
import { describeVisionError } from '../vision/errors';
import { validateNickname } from '../utils/validation';

const setupSteps = [
  ['01', 'Choose a name', 'Your nickname appears on the local podium and results screen.'],
  ['02', 'Activate the camera', 'Webcam tracking is the only control system in the arena. Your face stays in the browser.'],
  ['03', 'Calibrate & set sensitivity', 'Calibration and sensitivity controls ensure comfortable bite detection for your face.'],
];

export function SetupPage() {
  const navigate = useNavigate();
  const { settings, profile } = useGameStore();
  const [nickname, setNickname] = useState(profile.nickname === 'Guest Biter' ? '' : profile.nickname);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [calibrationPhase, setCalibrationPhase] = useState<'idle' | 'closed' | 'open' | 'done'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const vision = useWebcamVision(videoRef);
  const startVision = vision.start;
  const stopVision = vision.stop;
  const applySensitivity = vision.applySensitivity;

  useEffect(() => () => stopVision(), [stopVision]);

  useEffect(() => {
    applySensitivity(settings.faceSensitivity || 1.0);
  }, [applySensitivity, settings.faceSensitivity]);

  const startCamera = async () => {
    setCameraError('');
    try {
      await startVision();
      applySensitivity(settings.faceSensitivity || 1.0);
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
    } catch (caught) {
      setCalibrationPhase('idle');
      setCameraError(describeVisionError(caught));
    }
  };

  const cameraReady = vision.modelReady && Boolean(vision.calibrationResult);
  const submit = () => {
    const validation = validateNickname(nickname);
    if (validation) {
      setError(validation);
      return;
    }
    if (!cameraReady) {
      setError('Enable the camera and complete calibration before entering the arena.');
      return;
    }
    gameStore.setProfileNickname(nickname.trim());
    gameStore.updateSettings({
      mode: 'webcam',
      soundEnabled: settings.soundEnabled,
      musicEnabled: settings.musicEnabled,
      faceSensitivity: settings.faceSensitivity,
    });
    navigate('/game');
  };

  const status =
    vision.state.hasMultipleFaces
      ? `Target locked · ${vision.state.faceCount} faces detected`
      : vision.message === 'ready'
      ? 'Tracking ready · move naturally'
      : vision.message === 'no-face'
      ? 'Camera live · looking across the full frame'
      : vision.message === 'multiple-faces'
      ? 'Multiple faces · locking primary player'
      : vision.message === 'tracking-lost'
      ? 'Reacquiring face signal'
      : vision.message.replace('-', ' ');

  const currentOpenness = vision.state.openness;
  const activeThreshold = (vision.calibrationResult?.threshold ?? 0.28) / (settings.faceSensitivity || 1.0);
  const isBiteTriggered = vision.state.isOpen;
  const meterPercent = Math.min(100, Math.max(0, (currentOpenness / 0.8) * 100));
  const thresholdPercent = Math.min(100, Math.max(0, (activeThreshold / 0.8) * 100));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-18">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-[#8c827a] hover:text-[#231f1c] dark:text-white/45 dark:hover:text-white transition"
      >
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="mt-12 grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <div className="eyebrow">player setup · 02</div>
          <h1 className="font-podium mt-5 text-[clamp(3rem,6vw,6.5rem)] uppercase leading-[.88] tracking-[-.04em] text-[#231f1c] dark:text-white">
            Get ready<br />to bite.
          </h1>
          <p className="mt-7 max-w-lg font-inter text-base leading-8 text-[#5c534c] dark:text-white/55">
            Build your player identity, activate the camera, and tune your sensitivity. The arena is powered by physical facial movement detection.
          </p>

          <div className="mt-10 space-y-5 border-t border-[#231f1c]/15 pt-6 dark:border-white/15">
            {setupSteps.map(([number, title, copy]) => (
              <div className="flex gap-4" key={number}>
                <span className="font-podium text-2xl text-[#8c827a]/40 dark:text-white/25">{number}</span>
                <div>
                  <h2 className="font-podium text-xl uppercase text-[#231f1c] dark:text-white">{title}</h2>
                  <p className="mt-1 font-inter text-sm leading-6 text-[#5c534c] dark:text-white/45">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 border border-[#d97746]/20 bg-[#d97746]/[0.06] p-5 dark:border-cyan/20 dark:bg-cyan/[0.06]">
            <div className="flex items-center gap-3 font-inter text-xs font-bold uppercase tracking-[.16em] text-[#d97746] dark:text-cyan">
              <ShieldCheck size={17} /> Privacy by default · Local Vision
            </div>
            <p className="mt-3 font-inter text-sm leading-6 text-[#5c534c] dark:text-white/50">
              Camera frames and facial landmarks stay in your browser. Video is never uploaded or saved to remote servers.
            </p>
          </div>
        </div>

        <div className="arcade-card border border-[#231f1c]/15 p-5 sm:p-7 dark:border-white/15">
          <div className="flex items-start justify-between gap-5 border-b border-[#231f1c]/10 pb-6 dark:border-white/10">
            <div>
              <div className="eyebrow">launch sequence</div>
              <h2 className="font-podium mt-2 text-3xl uppercase">Configure your run.</h2>
            </div>
            <Sparkles className="text-gold" size={26} />
          </div>

          <div className="mt-7">
            <label htmlFor="nickname" className="font-inter text-xs font-bold uppercase tracking-[.18em] text-[#5c534c] dark:text-white/65">
              Player nickname
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => { setNickname(event.target.value); setError(''); }}
              maxLength={18}
              placeholder="e.g. Neon Nibbler"
              className="mt-3 w-full border border-[#231f1c]/15 bg-[#231f1c]/[0.03] px-4 py-4 font-inter text-[#231f1c] outline-none transition placeholder:text-[#8c827a]/50 focus:border-[#d97746] dark:border-white/15 dark:bg-white/[.04] dark:text-white dark:placeholder:text-white/25 dark:focus:border-cyan"
            />
            <div className="mt-2 flex justify-between font-inter text-[.65rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/30">
              <span>Safe display name · local profile</span>
              <span>{nickname.length}/18</span>
            </div>
            {error && <div className="mt-3 flex items-center gap-2 font-inter text-sm text-coral"><XCircle size={16} /> {error}</div>}
          </div>

          <div className="mt-8 border border-[#d97746]/25 bg-[#d97746]/[0.06] p-5 dark:border-cyan/25 dark:bg-cyan/[0.06]">
            <div className="flex items-center gap-3">
              <Camera className="text-[#d97746] dark:text-cyan" size={21} />
              <div>
                <div className="font-inter text-xs font-bold uppercase tracking-[.18em] text-[#d97746] dark:text-cyan">
                  Camera control only
                </div>
                <div className="font-podium mt-1 text-2xl uppercase">Move + bite</div>
              </div>
              <span className="ml-auto border border-[#d97746]/30 px-3 py-1 font-inter text-[.6rem] font-bold uppercase tracking-[.15em] text-[#d97746] dark:border-cyan/30 dark:text-cyan">
                Required
              </span>
            </div>
            <p className="mt-3 font-inter text-sm leading-6 text-[#5c534c] dark:text-white/50">
              Move your head to position the capture ring. Open your mouth once for a bite, then close before the next target.
            </p>
          </div>

          {/* Sound Toggles */}
          <div className="mt-8 grid gap-3 border-t border-[#231f1c]/10 pt-6 dark:border-white/10 sm:grid-cols-2">
            <button
              type="button"
              className={`flex items-center justify-between border border-[#231f1c]/10 bg-[#231f1c]/[0.03] px-4 py-3 font-inter text-xs uppercase tracking-[.12em] transition hover:border-[#231f1c]/30 dark:border-white/10 dark:bg-white/[.03] dark:hover:border-white/30 ${
                settings.soundEnabled ? 'text-[#231f1c] dark:text-white font-semibold' : 'text-[#8c827a] dark:text-white/40'
              }`}
              onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}
            >
              <span className="flex items-center gap-2">
                {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound effects
              </span>
              <span>{settings.soundEnabled ? 'On' : 'Off'}</span>
            </button>
            <button
              type="button"
              className={`flex items-center justify-between border border-[#231f1c]/10 bg-[#231f1c]/[0.03] px-4 py-3 font-inter text-xs uppercase tracking-[.12em] transition hover:border-[#231f1c]/30 dark:border-white/10 dark:bg-white/[.03] dark:hover:border-white/30 ${
                settings.musicEnabled ? 'text-[#231f1c] dark:text-white font-semibold' : 'text-[#8c827a] dark:text-white/40'
              }`}
              onClick={() => gameStore.updateSettings({ musicEnabled: !settings.musicEnabled })}
            >
              <span>Ambient music</span>
              <span>{settings.musicEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>

          {/* Camera Viewport & Detection Station */}
          <div className="mt-8 border-t border-[#231f1c]/10 pt-6 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">camera station</div>
                <h2 className="font-podium mt-2 text-2xl uppercase">{status}</h2>
              </div>
              <div className={`h-3 w-3 rounded-full ${vision.state.reliable ? 'bg-cyan shadow-[0_0_12px_#50e3ff]' : 'bg-white/20'}`} />
            </div>

            {/* Target Validation Notice (Multiple Users) */}
            {vision.state.hasMultipleFaces && (
              <div className="mt-3 flex items-center gap-2.5 rounded border border-[#d97746]/40 bg-[#d97746]/10 px-3.5 py-2 font-inter text-xs text-[#d97746] dark:border-cyan/40 dark:bg-cyan/10 dark:text-cyan">
                <Users size={16} className="shrink-0" />
                <span>
                  <strong>Target validated:</strong> {vision.state.faceCount} faces detected — tracking primary centered player only.
                </span>
              </div>
            )}

            <div className="relative mt-5 aspect-video overflow-hidden border border-[#231f1c]/15 bg-[#080708] dark:border-white/15">
              <video ref={videoRef} className="h-full w-full scale-x-[-1] object-contain" playsInline muted />
              <div className="pointer-events-none absolute inset-4 border border-cyan/35">
                <span className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2 border-cyan" />
                <span className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2 border-cyan" />
                <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-cyan" />
                <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-cyan" />
              </div>
              <div className="pointer-events-none absolute inset-[12%] rounded-[32%] border border-dashed border-white/35 bg-cyan/[.025]">
                <div className="absolute -bottom-7 left-0 right-0 text-center font-inter text-[.58rem] uppercase tracking-[.16em] text-white/45">
                  recommended position · target validated
                </div>
              </div>
              {vision.message === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6 text-center font-inter text-sm text-white/65">
                  Allow camera access to activate the mouth tracker.
                </div>
              )}
            </div>
            <p className="mt-3 font-inter text-xs leading-5 text-[#8c827a] dark:text-white/40">
              Face tracking automatically validates the primary player in front of the lens even with bystanders nearby.
            </p>

            {/* Live Openness Meter */}
            {vision.modelReady && (
              <div className="mt-4 border border-[#231f1c]/10 bg-[#231f1c]/[0.02] p-4 dark:border-white/10 dark:bg-white/[.02]">
                <div className="flex items-center justify-between text-xs font-inter uppercase tracking-[.14em]">
                  <span className="text-[#5c534c] dark:text-white/60">Live mouth openness</span>
                  <span className={isBiteTriggered ? 'font-bold text-[#d97746] dark:text-cyan' : 'text-[#8c827a] dark:text-white/40'}>
                    {isBiteTriggered ? 'Bite triggered' : 'Neutral / Closed'}
                  </span>
                </div>
                <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-[#231f1c]/10 dark:bg-white/10">
                  <div
                    className={`h-full transition-all duration-75 ${isBiteTriggered ? 'bg-[#d97746] dark:bg-cyan shadow-[0_0_8px_#d97746]' : 'bg-[#231f1c]/40 dark:bg-white/40'}`}
                    style={{ width: `${meterPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gold shadow-[0_0_4px_#ffe078]"
                    style={{ left: `${thresholdPercent}%` }}
                    title={`Bite threshold: ${activeThreshold.toFixed(3)}`}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-inter text-[.6rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/35">
                  <span>Closed</span>
                  <span className="text-gold">Active Threshold ({activeThreshold.toFixed(3)})</span>
                  <span>Open</span>
                </div>
              </div>
            )}

            {/* Option to Adjust Sensitivity of Face */}
            <div className="mt-4 border border-[#231f1c]/10 bg-[#231f1c]/[0.02] p-4 dark:border-white/10 dark:bg-white/[.02]">
              <div className="flex items-center justify-between text-xs font-inter uppercase tracking-[0.14em]">
                <span className="flex items-center gap-2 font-semibold text-[#5c534c] dark:text-white/70">
                  <Sliders size={14} className="text-[#d97746] dark:text-cyan" />
                  Face & Bite Sensitivity
                </span>
                <span className="font-bold text-[#d97746] dark:text-cyan">
                  {(settings.faceSensitivity || 1.0).toFixed(1)}x{' '}
                  {(settings.faceSensitivity || 1.0) >= 1.3
                    ? '(High · Easy bite)'
                    : (settings.faceSensitivity || 1.0) <= 0.8
                    ? '(Low · Wide bite)'
                    : '(Normal)'}
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={settings.faceSensitivity || 1.0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  gameStore.updateSettings({ faceSensitivity: val });
                  applySensitivity(val);
                }}
                className="mt-2.5 w-full accent-[#d97746] dark:accent-cyan"
              />
              <div className="mt-1.5 flex justify-between font-inter text-[.6rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/35">
                <span>0.6x (Requires wide mouth)</span>
                <span>1.0x (Balanced)</span>
                <span>1.8x (Subtle quick bite)</span>
              </div>
            </div>

            {/* Camera Actions */}
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                className="arcade-button-secondary inline-flex w-full items-center justify-center gap-2"
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
                  className="arcade-button-secondary inline-flex w-full items-center justify-center gap-2"
                  onClick={calibrate}
                  disabled={calibrationPhase === 'closed' || calibrationPhase === 'open'}
                >
                  <RefreshCw size={16} />
                  {calibrationPhase === 'closed'
                    ? 'Keep your mouth closed…'
                    : calibrationPhase === 'open'
                    ? 'Open comfortably…'
                    : calibrationPhase === 'done'
                    ? 'Recalibrate mouth'
                    : 'Calibrate mouth'}
                </button>
              )}

              {cameraError && (
                <div className="border border-coral/25 bg-coral/10 p-3 font-inter text-xs leading-5 text-coral">
                  {cameraError}
                </div>
              )}

              {vision.modelReady && (
                <div className="flex items-center gap-2 font-inter text-xs text-[#8c827a] dark:text-white/45">
                  <CheckCircle2
                    size={15}
                    className={vision.calibrationResult ? 'text-[#d97746] dark:text-cyan' : 'text-[#8c827a]/40 dark:text-white/25'}
                  />
                  {vision.calibrationResult
                    ? `Calibration ready · base threshold ${vision.calibrationResult.threshold.toFixed(3)}`
                    : 'Calibration required before play'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse justify-between gap-4 border-t border-[#231f1c]/10 dark:border-white/10 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 font-inter text-xs text-[#8c827a] dark:text-white/40">
              <Eye size={16} className="text-[#d97746] dark:text-cyan" /> Your face stays on this device · move freely in frame.
            </div>
            <button
              type="button"
              className="arcade-button-primary inline-flex items-center justify-center gap-3"
              onClick={submit}
            >
              Start game <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-4 border-t border-[#231f1c]/10 pt-8 dark:border-white/10 md:grid-cols-3">
        <div>
          <div className="font-podium text-2xl uppercase">45 sec</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-[#8c827a] dark:text-white/40">Standard round</div>
        </div>
        <div>
          <div className="font-podium text-2xl uppercase">Adaptive vision</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-[#8c827a] dark:text-white/40">Target input validation</div>
        </div>
        <div>
          <div className="font-podium text-2xl uppercase">KRMU AI Centre</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.17em] text-[#8c827a] dark:text-white/40">Centre of Excellence</div>
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <Link
          className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-[#8c827a] hover:text-[#231f1c] dark:text-white/45 dark:hover:text-white transition"
          to="/how-to-play"
        >
          Review the full briefing <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}
