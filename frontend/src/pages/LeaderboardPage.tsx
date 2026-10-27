import { Crown, LoaderCircle, Medal, RefreshCw, Trophy, Users, Zap, AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiLeaderboardRepository, localResultRepository } from '../services/storage';
import { useGameStore } from '../store/gameStore';
import { formatScore } from '../utils/validation';

type BoardRow = {
  id: string;
  nickname: string;
  score: number;
  bestCombo: number;
  capturedChips: number;
  createdAt: string;
  profilePicture?: string | null;
  isDemo?: boolean;
};

export function LeaderboardPage() {
  const { profile } = useGameStore();
  const [tab, setTab] = useState<'daily' | 'all'>('daily');
  const [includeDemo, setIncludeDemo] = useState(false);
  const [remoteRows, setRemoteRows] = useState<BoardRow[] | null>(null);
  const [remoteError, setRemoteError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLocalFallback, setShowLocalFallback] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const handleTabChange = (nextTab: 'daily' | 'all') => {
    setIsLoading(true);
    setTab(nextTab);
  };

  const retry = () => {
    setIsLoading(true);
    setFetchTrigger((v) => v + 1);
  };

  useEffect(() => {
    let active = true;

    apiLeaderboardRepository.list(tab === 'daily', includeDemo)
      .then((rows) => {
        if (!active) return;
        setRemoteError('');
        setShowLocalFallback(false);
        setRemoteRows(
          rows
            ? rows.map((row) => ({
                id: row.id,
                nickname: row.nickname,
                score: row.score,
                bestCombo: row.bestCombo,
                capturedChips: row.capturedChips,
                createdAt: row.createdAtUtc,
                profilePicture: row.profilePicture,
                isDemo: row.isDemo,
              }))
            : null
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setRemoteRows(null);
          setRemoteError(error instanceof Error ? error.message : 'Connected leaderboard is unavailable.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tab, includeDemo, fetchTrigger]);

  const isConnected = Boolean(remoteRows !== null && !remoteError);

  const results = useMemo<BoardRow[]>(() => {
    if (isConnected && remoteRows) {
      return remoteRows;
    }
    if (showLocalFallback || !import.meta.env.VITE_API_BASE_URL) {
      return tab === 'daily'
        ? localResultRepository.daily(includeDemo)
        : localResultRepository.all(includeDemo);
    }
    return [];
  }, [isConnected, remoteRows, showLocalFallback, tab, includeDemo]);

  const podium = results.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <div className="eyebrow">the arena remembers · 03</div>
          <h1 className="font-podium mt-5 text-[clamp(3.6rem,8vw,8rem)] uppercase leading-[.86] tracking-[-.05em] text-white">
            The<br />podium.
          </h1>
        </div>
        <div className="border-l border-white/20 pl-6 lg:mb-2 lg:pl-10">
          <p className="font-inter text-base leading-8 text-white/55">
            Every clean bite, golden chase, and bomb dodged leaves a mark. Compare your run with the names already in the arena.
          </p>
          <Link className="mt-6 inline-flex items-center gap-3 border-b border-cyan pb-2 font-inter text-xs font-bold uppercase tracking-[.18em] text-cyan" to="/setup">
            Claim a place <Zap size={15} />
          </Link>
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-3 border-y border-white/10 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`px-4 py-3 font-inter text-xs font-bold uppercase tracking-[.16em] transition ${
              tab === 'daily' ? 'bg-white text-black' : 'border border-white/15 text-white/55 hover:border-white hover:text-white'
            }`}
            onClick={() => handleTabChange('daily')}
          >
            Today
          </button>
          <button
            className={`px-4 py-3 font-inter text-xs font-bold uppercase tracking-[.16em] transition ${
              tab === 'all' ? 'bg-white text-black' : 'border border-white/15 text-white/55 hover:border-white hover:text-white'
            }`}
            onClick={() => handleTabChange('all')}
          >
            All time
          </button>
          <label className="ml-2 flex items-center gap-2 cursor-pointer border border-white/10 px-3 py-2.5 font-inter text-[.65rem] uppercase tracking-[.12em] text-white/50 hover:border-white/20 hover:text-white transition">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => {
                setIsLoading(true);
                setIncludeDemo(e.target.checked);
              }}
              className="accent-cyan rounded"
            />
            <span>Include demo</span>
          </label>
        </div>

        <div className="ml-auto flex items-center gap-4 font-inter text-xs uppercase tracking-[.15em] text-white/35">
          <span className="hidden sm:inline">
            {isConnected ? (
              <span className="text-cyan font-semibold">● Connected server board</span>
            ) : showLocalFallback ? (
              <span className="text-amber-400 font-semibold">● Local browser board</span>
            ) : (
              <span>Connecting...</span>
            )}
          </span>
          <button
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-white/60 transition hover:border-white hover:text-white disabled:opacity-40"
            onClick={retry}
            disabled={isLoading}
            aria-label="Refresh leaderboard"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Error and Fallback notification */}
      {remoteError && (
        <div className="mt-6 border border-coral/30 bg-coral/10 p-5 font-inter text-sm text-coral flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <strong>Server Connection Failed:</strong> {remoteError}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={retry}
              className="border border-coral px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-coral/30 hover:bg-coral/50 transition"
            >
              Retry Connection
            </button>
            {!showLocalFallback && (
              <button
                onClick={() => setShowLocalFallback(true)}
                className="border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70 hover:text-white transition"
              >
                View Local Scores
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-16 py-20 text-center">
          <LoaderCircle size={38} className="mx-auto animate-spin text-cyan" />
          <h2 className="font-podium mt-4 text-2xl uppercase text-white">Fetching leaderboard...</h2>
          <p className="mt-2 font-inter text-xs uppercase tracking-[.14em] text-white/40">Synchronizing records with arena server</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {podium.length > 0 && (
            <div className={`mt-12 grid gap-4 ${podium.length === 1 ? 'max-w-md mx-auto' : podium.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
              {podium.map((result, index) => (
                <article
                  className={`relative border p-7 text-center transition hover:-translate-y-1 ${
                    index === 0
                      ? 'border-gold/40 bg-gold/[.08] shadow-[0_0_30px_rgba(255,224,120,0.15)] md:-translate-y-5'
                      : index === 1
                        ? 'border-slate-300/40 bg-slate-400/[.05]'
                        : 'border-amber-600/40 bg-amber-700/[.05]'
                  }`}
                  key={result.id}
                >
                  <div className="absolute left-5 top-5 font-mono text-xs text-white/30">0{index + 1}</div>
                  <div className="relative mx-auto h-20 w-20">
                    {result.profilePicture ? (
                      <img
                        src={result.profilePicture}
                        alt={`${result.nickname}'s avatar`}
                        className={`h-full w-full rounded-full object-cover border-2 ${
                          index === 0
                            ? 'border-gold shadow-[0_0_15px_#ffe078]'
                            : index === 1
                              ? 'border-slate-300 shadow-[0_0_12px_#cbd5e1]'
                              : 'border-amber-600 shadow-[0_0_12px_#d97706]'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full ${
                          index === 0
                            ? 'bg-gold text-black shadow-[0_0_15px_#ffe078]'
                            : index === 1
                              ? 'bg-slate-300 text-black shadow-[0_0_12px_#cbd5e1]'
                              : 'bg-amber-600 text-white shadow-[0_0_12px_#d97706]'
                        }`}
                      >
                        {index === 0 ? <Crown size={36} /> : <Medal size={30} />}
                      </div>
                    )}
                    {result.profilePicture && (
                      <div
                        className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-black ${
                          index === 0 ? 'bg-gold text-black' : index === 1 ? 'bg-slate-300 text-black' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {index === 0 ? <Crown size={14} /> : <Medal size={14} />}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 font-inter text-xs uppercase tracking-[.18em] text-white/40">
                    Rank #{index + 1} {index === 0 ? '· Champion' : ''}
                  </div>
                  <h2 className="font-podium mt-2 text-2xl uppercase text-white truncate flex items-center justify-center gap-2">
                    <span>{result.nickname}</span>
                    {result.isDemo && (
                      <span className="border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[.55rem] text-amber-400">
                        DEMO
                      </span>
                    )}
                  </h2>
                  <div className="font-score mt-4 text-4xl text-cyan">{formatScore(result.score)}</div>
                  <div className="mt-2 font-inter text-xs uppercase tracking-[.12em] text-white/40">
                    {result.bestCombo} combo · {result.capturedChips} bites
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Results Table & Sidebar */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
            <section className="overflow-hidden border border-white/10 bg-black/20">
              <div className="grid grid-cols-[50px_1fr_110px_100px] gap-3 border-b border-white/10 px-5 py-4 font-inter text-[.62rem] font-bold uppercase tracking-[.18em] text-white/35">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
                <span className="text-right">Combo</span>
              </div>

              {results.length ? (
                results.map((result, index) => (
                  <div
                    className={`grid grid-cols-[50px_1fr_110px_100px] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-0 ${
                      result.nickname === profile.nickname ? 'bg-cyan/[.06]' : ''
                    }`}
                    key={result.id}
                  >
                    <span className={`font-podium text-xl ${index < 3 ? 'text-gold' : 'text-white/35'}`}>
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      {result.profilePicture ? (
                        <img
                          src={result.profilePicture}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover border border-cyan/40 shrink-0"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 text-xs font-bold uppercase shrink-0">
                          {result.nickname.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-podium uppercase text-white flex items-center gap-2">
                          <span className="truncate">{result.nickname}</span>
                          {result.isDemo && (
                            <span className="border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[.55rem] text-amber-400">
                              DEMO
                            </span>
                          )}
                          {result.nickname === profile.nickname && (
                            <span className="bg-cyan/15 px-2 py-0.5 font-inter text-[.55rem] tracking-[.12em] text-cyan">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-inter text-xs text-white/30">
                          {new Date(result.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className="font-score text-xl text-cyan">{formatScore(result.score)}</span>
                    <span className="text-right font-inter text-sm text-white/50">×{result.bestCombo}</span>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center">
                  <Trophy className="mx-auto text-gold" size={42} />
                  <h2 className="font-podium mt-5 text-3xl uppercase text-white">The podium is empty.</h2>
                  <p className="mt-3 font-inter text-sm text-white/45">
                    {isConnected
                      ? 'No server records recorded for this timeframe yet. Play the first round and claim #1!'
                      : 'Play the first round to put a name on the board.'}
                  </p>
                  <Link
                    to="/setup"
                    className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-3 font-inter text-xs font-bold uppercase tracking-[.18em] text-black hover:bg-cyan transition"
                  >
                    Start a round <Zap size={14} />
                  </Link>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="border border-white/10 bg-white/[.03] p-6">
                <Users className="text-cyan" size={22} />
                <h2 className="font-podium mt-5 text-2xl uppercase text-white">How ranking works</h2>
                <p className="mt-3 font-inter text-sm leading-7 text-white/50">
                  Scores sort from highest to lowest. Ties favor the earlier completed run, followed by peak combo and total chips captured.
                </p>
                <div className="mt-4 border-t border-white/10 pt-4 font-inter text-xs text-white/40 leading-5">
                  Connected mode reads from the authoritative backend API. Offline rounds remain provisional in local browser storage.
                </div>
              </div>

              <div className="border border-white/10 bg-black/20 p-6">
                <div className="eyebrow">your current mark</div>
                <div className="font-podium mt-3 text-4xl uppercase text-cyan">
                  {profile.bestScore ? formatScore(profile.bestScore) : '—'}
                </div>
                <p className="mt-2 font-inter text-sm text-white/45">
                  {profile.totalRounds} rounds · best combo ×{profile.bestCombo}
                </p>
                <Link to="/profile" className="mt-6 inline-flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-[.15em] text-white/65 hover:text-white">
                  View profile ↗
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
