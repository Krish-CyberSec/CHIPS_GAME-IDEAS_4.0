import { useState } from 'react';
import { Activity, ArrowUpRight, Camera, Download, RotateCcw, Settings2, ShieldCheck, SquarePause, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionTitle } from '../components/SectionTitle';
import { localGameConfiguration, localResultRepository } from '../services/storage';
import { gameStore, useGameStore } from '../store/gameStore';

export function AdminPage() {
  const { settings } = useGameStore();
  const [config, setConfig] = useState(localGameConfiguration.read());
  const [results, setResults] = useState(() => localResultRepository.all());
  const roundDuration = config.roundDurationSeconds;
  const spawnRate = config.spawnRateMs;
  const sensitivity = settings.faceSensitivity || 1.0;

  const updateConfiguration = (patch: Partial<typeof config>) => {
    const updated = { ...config, ...patch };
    localGameConfiguration.save(updated);
    setConfig(updated);
  };

  const exportCsv = () => {
    const header = 'id,nickname,score,capturedChips,goldenChips,bombPenalties,bestCombo,eligibleOpportunities,accuracy,createdAt\n';
    const rows = results.map((result) => `${result.id},"${result.nickname.replace(/"/g, '""')}",${result.score},${result.capturedChips},${result.goldenChips},${result.bombPenalties},${result.bestCombo},${result.eligibleOpportunities},${result.accuracy ?? ''},${result.createdAt}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `krmu-chip-bite-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    if (window.confirm('Reset local leaderboard entries? This action cannot be undone.')) {
      localResultRepository.clear();
      setResults([]);
    }
  };

  const average = results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_.75fr] lg:items-end">
        <div>
          <div className="eyebrow">operator console · 05</div>
          <h1 className="font-podium mt-5 text-[clamp(3.6rem,8vw,8rem)] uppercase leading-[.86] tracking-[-.05em] text-[#231f1c] dark:text-white">
            Run<br />the stall.
          </h1>
        </div>
        <div className="border-l border-[#231f1c]/15 pl-6 dark:border-white/20 lg:mb-2 lg:pl-10">
          <p className="font-inter text-base leading-8 text-[#5c534c] dark:text-white/55">
            A focused control room for KRMU event operators. Tune the round, adjust face detection sensitivity, export local scores, and manage the photo booth.
          </p>
          <div className="mt-6 flex items-center gap-3 border border-gold/20 bg-gold/10 p-4 font-inter text-xs leading-5 text-gold">
            <ShieldCheck size={18} className="shrink-0" />
            Local operator mode is active. Target input validation handles multi-person crowd lines cleanly.
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
        <div className="arcade-card p-6">
          <Users className="text-[#d97746] dark:text-cyan" size={22} />
          <div className="font-podium mt-6 text-4xl">{results.length}</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">
            completed local rounds
          </div>
        </div>
        <div className="arcade-card p-6">
          <Trophy className="text-gold" size={22} />
          <div className="font-podium mt-6 text-4xl">
            {results.length ? Math.max(...results.map((result) => result.score)).toLocaleString() : 0}
          </div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">
            highest score
          </div>
        </div>
        <div className="arcade-card p-6">
          <Activity className="text-violet" size={22} />
          <div className="font-podium mt-6 text-4xl">{average.toLocaleString()}</div>
          <div className="mt-1 font-inter text-xs uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">
            average score
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="arcade-card p-6 sm:p-8">
          <div className="flex items-start justify-between border-b border-[#231f1c]/10 pb-6 dark:border-white/10">
            <div>
              <div className="eyebrow">round direction</div>
              <h2 className="font-podium mt-2 text-3xl uppercase">Game configuration.</h2>
            </div>
            <Settings2 className="text-[#d97746] dark:text-cyan" />
          </div>

          <div className="mt-8 space-y-8">
            <label className="block">
              <div className="mb-3 flex justify-between gap-4 font-inter text-sm text-[#5c534c] dark:text-white/65">
                <span>Round duration</span>
                <strong className="font-podium text-xl text-[#d97746] dark:text-cyan">{roundDuration}s</strong>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                value={roundDuration}
                onChange={(event) => updateConfiguration({ roundDurationSeconds: Number(event.target.value) })}
                className="w-full accent-[#d97746] dark:accent-cyan"
              />
              <div className="mt-2 flex justify-between font-inter text-[.62rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/30">
                <span>Fast showcase (20s)</span>
                <span>Long session (90s)</span>
              </div>
            </label>

            <label className="block">
              <div className="mb-3 flex justify-between gap-4 font-inter text-sm text-[#5c534c] dark:text-white/65">
                <span>Spawn interval</span>
                <strong className="font-podium text-xl text-[#d97746] dark:text-cyan">{spawnRate}ms</strong>
              </div>
              <input
                type="range"
                min="350"
                max="1200"
                step="10"
                value={spawnRate}
                onChange={(event) => updateConfiguration({ spawnRateMs: Number(event.target.value) })}
                className="w-full accent-[#d97746] dark:accent-cyan"
              />
              <div className="mt-2 flex justify-between font-inter text-[.62rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/30">
                <span>High pressure (350ms)</span>
                <span>Easy warm-up (1200ms)</span>
              </div>
            </label>

            <label className="block">
              <div className="mb-3 flex justify-between gap-4 font-inter text-sm text-[#5c534c] dark:text-white/65">
                <span>Face & Bite Sensitivity</span>
                <strong className="font-podium text-xl text-[#d97746] dark:text-cyan">{sensitivity.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={sensitivity}
                onChange={(event) => gameStore.updateSettings({ faceSensitivity: Number(event.target.value) })}
                className="w-full accent-[#d97746] dark:accent-cyan"
              />
              <div className="mt-2 flex justify-between font-inter text-[.62rem] uppercase tracking-[.12em] text-[#8c827a] dark:text-white/30">
                <span>Low (0.6x)</span>
                <span>Standard (1.0x)</span>
                <span>High (1.8x)</span>
              </div>
            </label>

            <div className="border border-[#231f1c]/10 bg-[#231f1c]/[0.02] p-5 font-inter text-sm leading-7 text-[#5c534c] dark:border-white/10 dark:bg-white/[.03] dark:text-white/50">
              Target validation automatically identifies and isolates the primary target player when groups of students stand together in front of the stall camera.
            </div>
          </div>
        </section>

        <section className="arcade-card p-6 sm:p-8">
          <div className="eyebrow">data desk & activity</div>
          <h2 className="font-podium mt-2 text-3xl uppercase">Keep the board clean.</h2>
          <p className="mt-4 font-inter text-sm leading-7 text-[#5c534c] dark:text-white/50">
            Export results after a session, manage the photograph booth, and reset the local board before a new event block begins.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              to="/photograph"
              className="arcade-button-primary inline-flex w-full items-center justify-start gap-3"
            >
              <Camera size={17} /> Open Souvenir Photo Studio
            </Link>

            <button
              type="button"
              className="arcade-button-secondary inline-flex w-full items-center justify-start gap-3"
              onClick={exportCsv}
            >
              <Download size={17} /> Export results as CSV
            </button>

            <button
              type="button"
              className="inline-flex w-full items-center justify-start gap-3 border border-coral/30 px-4 py-3.5 font-inter text-xs font-bold uppercase tracking-[.15em] text-coral transition hover:bg-coral/10"
              onClick={reset}
            >
              <RotateCcw size={17} /> Reset local leaderboard
            </button>
          </div>

          <div className="mt-8 border-t border-[#231f1c]/10 pt-6 dark:border-white/10">
            <div className="flex items-center gap-3 font-inter text-xs font-bold uppercase tracking-[.15em] text-[#5c534c] dark:text-white/55">
              <SquarePause size={17} className="text-gold" /> Operator checklist
            </div>
            <ul className="mt-4 space-y-3 font-inter text-sm leading-6 text-[#8c827a] dark:text-white/45">
              <li>Confirm the webcam sits at face height and has adequate stall lighting.</li>
              <li>Encourage players to take a victory souvenir picture in the Photograph Menu!</li>
              <li>Run a closed/open-mouth calibration before opening the round.</li>
              <li>Export CSV before clearing local results.</li>
            </ul>
          </div>
        </section>
      </div>

      <section className="mt-12 border-t border-[#231f1c]/10 pt-8 dark:border-white/10">
        <SectionTitle
          eyebrow="connected operations"
          title="When the API is enabled."
          detail="The browser keeps working locally when the backend is unavailable. For an event deployment, protect operator routes with JWT, configure SQL Server persistence, and verify the health endpoint before opening the doors."
        />
        <div className="flex flex-wrap gap-3">
          <Link
            to="/leaderboard"
            className="arcade-button-secondary inline-flex items-center gap-2"
          >
            Open live board <ArrowUpRight size={16} />
          </Link>
          <Link
            to="/photograph"
            className="arcade-button-secondary inline-flex items-center gap-2"
          >
            Souvenir Photo Studio <ArrowUpRight size={16} />
          </Link>
          <Link
            to="/how-to-play"
            className="arcade-button-secondary inline-flex items-center gap-2"
          >
            Review player flow <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
