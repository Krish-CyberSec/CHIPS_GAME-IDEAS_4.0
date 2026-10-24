import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CameraOff, CirclePause, Eye, Maximize2, Minimize2, Play, Sparkles, TimerReset, Volume2, VolumeX, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GameCanvas } from '../game/GameCanvas';
import type { GameResult } from '../types';
import type { GameConfiguration } from '../types';
import { useGameStore, gameStore } from '../store/gameStore';
import { localGameConfiguration, localResultRepository, apiResultRepository } from '../services/storage';
import { useWebcamVision } from '../vision/useWebcamVision';
import { describeVisionError } from '../vision/errors';
import type { GameHud } from '../game/GameEngine';

export function GamePage() {
  const navigate = useNavigate();
  const { profile, settings } = useGameStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const vision = useWebcamVision(videoRef);
  const startVision = vision.start;
  const stopVision = vision.stop;
  const applyCalibration = vision.applyCalibration;
  const [gameConfig] = useState<GameConfiguration>(() => localGameConfiguration.read());
  const [hud, setHud] = useState<GameHud>({ score: 0, combo: 0, multiplier: 1, timeLeft: gameConfig.roundDurationSeconds, level: 1, levelStartScore: 0, nextLevelScore: 120, captured: 0, golden: 0, bombs: 0, missed: 0, activePowerUps: [], status: 'countdown' });
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [cameraVisible, setCameraVisible] = useState(true);
  const [gameInstance, setGameInstance] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (profile.nickname === 'Guest Biter' || !settings.calibrationResult) {
      navigate('/setup', { replace: true });
      return;
    }
    startVision().then(() => { applyCalibration(settings.calibrationResult!); }).catch((caught) => setError(describeVisionError(caught)));
  }, [applyCalibration, navigate, profile.nickname, settings.calibrationResult, startVision]);
  useEffect(() => () => stopVision(), [stopVision]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setPaused((value) => !value); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('blur', pauseWhenHidden);
    return () => { document.removeEventListener('visibilitychange', pauseWhenHidden); window.removeEventListener('blur', pauseWhenHidden); };
  }, []);
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const finish = useCallback(async (result: GameResult) => {
    const saved = gameStore.saveResult(result);
    localResultRepository.save(saved);
    try { if (await apiResultRepository.save(saved)) gameStore.setCurrentResult({ ...saved, localOnly: false }); } catch { /* local result remains safe if API is offline */ }
    navigate('/results');
  }, [navigate]);
  const onHud = useCallback((nextHud: GameHud) => setHud(nextHud), []);
  const onTracking = useCallback((value: boolean) => setTracking(value), []);
  const trackingState = vision.state;
  const activePowerUpLabel = useMemo(() => hud.activePowerUps.map(({ kind, remainingMs }) => `${kind.replace('-', ' ')} ${Math.ceil(remainingMs / 1000)}s`).join(' · '), [hud.activePowerUps]);
  const trackingNotice = vision.message === 'multiple-faces'
    ? 'Keep one face in the camera frame.'
    : vision.message === 'tracking-lost' || !vision.state.detected
      ? 'Move naturally anywhere inside the camera frame.'
      : 'Signal reacquired. Keep moving.';
  const fullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.documentElement.requestFullscreen?.();
  };
  const restart = () => { setPaused(false); setError(''); setTracking(false); setGameInstance((value) => value + 1); };

  return <div className="min-h-[calc(100svh-82px)] bg-[#110d0b] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
    <div className="mx-auto max-w-[1840px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><button className="arcade-icon-button" onClick={() => navigate('/')} aria-label="Exit game"><X size={18} /></button><div><div className="eyebrow">arena live · 06</div><div className="font-podium text-xl uppercase">{profile.nickname}</div></div></div>
        <div className="flex items-center gap-2">
          <div className={`hidden items-center gap-2 border px-3 py-2 text-xs sm:flex ${tracking ? 'border-cyan/20 bg-cyan/10 text-cyan' : 'border-gold/25 bg-gold/10 text-gold'}`}><span className={`h-2 w-2 rounded-full ${tracking ? 'bg-cyan' : 'bg-gold animate-pulse'}`} /> {tracking ? 'Tracking live' : 'Reacquiring face'}</div>
          <button className="arcade-icon-button" onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })} aria-label="Toggle sound">{settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="arcade-icon-button" onClick={fullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <section className="relative overflow-hidden border border-white/10 bg-panel shadow-violet">
          <div className="absolute left-4 right-4 top-4 z-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="bg-ink/75 px-3 py-2 backdrop-blur"><div className="eyebrow">score</div><div className="mono text-xl font-bold text-cyan">{hud.score.toLocaleString()}</div></div>
            <div className="bg-ink/75 px-3 py-2 backdrop-blur"><div className="eyebrow">combo</div><div className="mono text-xl font-bold text-gold">×{hud.combo}</div></div>
            <div className="bg-ink/75 px-3 py-2 backdrop-blur"><div className="eyebrow">level</div><div className="mono text-xl font-bold text-violet">0{hud.level}</div></div>
            <div className="bg-ink/75 px-3 py-2 backdrop-blur"><div className="eyebrow">time</div><div className={`mono text-xl font-bold ${hud.timeLeft <= 10 ? 'text-coral' : 'text-white'}`}>{Math.ceil(hud.timeLeft)}s</div></div>
          </div>
          <div className="relative aspect-video min-h-[420px] overflow-hidden sm:min-h-[540px] xl:min-h-[min(74svh,820px)]">
            <div className="absolute inset-0"><GameCanvas key={gameInstance} nickname={profile.nickname} tracking={trackingState} gameConfig={gameConfig} paused={paused} onHud={onHud} onTracking={onTracking} onFinish={finish} /></div>
            {cameraVisible && <div className="absolute bottom-5 right-5 z-20 overflow-hidden border border-cyan/40 bg-black/70 shadow-glow"><video ref={videoRef} className="pointer-events-none h-28 w-44 object-cover opacity-85 scale-x-[-1] sm:h-32 sm:w-52" playsInline muted /><div className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1 font-inter text-[.58rem] uppercase tracking-[.16em] text-cyan">camera signal · local</div></div>}
            {paused && <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/75 px-6 text-center backdrop-blur-sm"><div><CirclePause className="mx-auto text-gold" size={44} /><h2 className="mt-4 font-podium text-3xl uppercase">Paused</h2><p className="mt-2 text-white/55">Take a breath. The arena is waiting.</p><button className="arcade-button-primary mt-6" onClick={() => setPaused(false)}><Play size={17} /> Resume</button></div></div>}
            {!tracking && hud.status === 'tracking-lost' && !paused && <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/65 px-6 text-center backdrop-blur-sm"><div><Eye className="mx-auto text-gold" size={34} /><div className="eyebrow mt-4">signal check</div><h2 className="mt-2 font-podium text-2xl uppercase">Reacquiring your face</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/60">{trackingNotice} The round is safely paused while the camera finds you again.</p></div></div>}
            {hud.status === 'countdown' && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"><div className="bg-ink/70 px-10 py-8 text-center backdrop-blur"><div className="eyebrow">get ready</div><div className="mt-2 font-podium text-5xl uppercase text-cyan">Bite!</div><p className="mt-2 text-xs uppercase tracking-[.16em] text-white/40">Open, close, reposition</p></div></div>}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <div className="arcade-card p-5"><div className="eyebrow">run status</div><div className="mt-3 flex items-center justify-between"><span className="text-white/55">Level {hud.level} progress</span><strong className="text-2xl text-gold">×{hud.multiplier.toFixed(2)}</strong></div><div className="mt-4 h-2 overflow-hidden bg-white/10"><div className="h-full bg-gradient-to-r from-cyan to-violet transition-all" style={{ width: `${Math.min(100, Math.max(0, (hud.score - hud.levelStartScore) / Math.max(1, hud.nextLevelScore - hud.levelStartScore) * 100))}%` }} /></div><div className="mt-2 flex justify-between text-xs text-white/35"><span>{hud.score} points</span><span>Next level · {hud.nextLevelScore}</span></div><div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-xs text-white/35"><span>{hud.captured} bites</span><span>{hud.missed} missed</span></div></div>
          <div className="arcade-card p-5"><div className="flex items-center justify-between"><div className="eyebrow">active effects</div><Sparkles size={15} className="text-violet" /></div><div className="mt-4 min-h-10 text-sm text-white/65">{activePowerUpLabel || 'Catch a power-up to light this panel.'}</div></div>
          <div className="arcade-card p-5"><div className="eyebrow">field protocol</div><p className="mt-3 text-sm leading-6 text-white/55">The full camera frame is live. Move naturally, open once for a bite, then close before the next target.</p></div>
          <div className="grid grid-cols-2 gap-2"><button className="arcade-button-secondary text-sm" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <CirclePause size={16} />}{paused ? 'Resume' : 'Pause'}</button><button className="arcade-button-secondary text-sm" onClick={restart}><TimerReset size={16} /> Restart</button></div>
          {error && <div className="border border-coral/20 bg-coral/10 p-4 text-xs leading-5 text-coral"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> Webcam unavailable</div><p className="mt-2">{error}</p><button className="mt-3 underline" onClick={() => navigate('/setup')}>Return to camera setup</button></div>}
          <button className="arcade-button-secondary w-full text-sm" onClick={() => setCameraVisible((value) => !value)}><CameraOff size={16} /> {cameraVisible ? 'Hide camera preview' : 'Show camera preview'}</button>
        </aside>
      </div>
    </div>
  </div>;
}
