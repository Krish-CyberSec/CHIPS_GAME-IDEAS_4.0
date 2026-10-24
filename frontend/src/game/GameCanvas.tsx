import { useEffect, useRef } from 'react';
import type { GameConfiguration, GameResult, MouthTrackingState } from '../types';
import { GameEngine, type GameHud } from './GameEngine';

interface Props { nickname: string; tracking: MouthTrackingState; gameConfig: GameConfiguration; paused?: boolean; onHud: (hud: GameHud) => void; onTracking: (tracking: boolean) => void; onFinish: (result: GameResult) => void; onReady?: () => void; }

export function GameCanvas({ nickname, tracking, gameConfig, paused = false, onHud, onTracking, onFinish, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new GameEngine());
  const inputRef = useRef<MouthTrackingState>(tracking);
  const startedRef = useRef(false);
  useEffect(() => { inputRef.current = tracking; }, [tracking]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = engineRef.current;
    engine.start(host, { nickname, gameConfig, inputProvider: { getState: () => inputRef.current }, callbacks: { onHud, onTracking, onFinish } });
    startedRef.current = true;
    onReady?.();
    return () => { startedRef.current = false; engine.destroy(); };
  }, [gameConfig, nickname, onFinish, onHud, onReady, onTracking]);

  useEffect(() => { if (startedRef.current) engineRef.current.setPaused(paused); }, [paused]);

  return <div ref={hostRef} className="h-full min-h-0 w-full overflow-hidden" aria-label="Chip Bite Challenge camera game canvas" />;
}
