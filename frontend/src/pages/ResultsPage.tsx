import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Award, BadgeCheck, Camera, Crown, Download, FileCode, FileSpreadsheet, FileText, Flame, Home, Medal, Play, Printer, Share2, Sparkles, Target, Trophy, TrendingUp, User, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PhotoStudioModal } from '../components/PhotoStudioModal';
import { StatCard } from '../components/StatCard';
import { useGameStore } from '../store/gameStore';
import { formatScore } from '../utils/validation';
import { localResultRepository } from '../services/storage';
import { gameAudio } from '../services/audio';
import { exportCsvReport, exportJsonReport, exportPdfReport, printReport } from '../utils/exportReports';

function WinnerParticles({ theme }: { theme: 'gold' | 'silver' | 'bronze' }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;

  const colors = theme === 'gold'
    ? ['#ffe078', '#ffd166', '#a855f7', '#ffffff']
    : theme === 'silver'
      ? ['#e2e8f0', '#94a3b8', '#38bdf8', '#ffffff']
      : ['#d97706', '#f59e0b', '#fbbf24', '#ffffff'];

  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.7) % 100}%`,
    delay: `${(i * 0.12) % 2.5}s`,
    duration: `${2.8 + ((i * 0.25) % 2.5)}s`,
    color: colors[i % colors.length],
    size: 4 + (i % 6),
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute -top-4 rounded-full opacity-75 animate-fall"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { currentResult, profile } = useGameStore();
  const [photoOpen, setPhotoOpen] = useState(false);

  const celebrationPlayedRef = useRef(false);

  const verified = currentResult?.verifiedRank;
  const isVerifiedTopThree = Boolean(verified && (verified.isTopThreeDaily || verified.isTopThreeAllTime));
  const verifiedRankNum = verified?.bestRank ?? null;
  const isProvisional = Boolean(currentResult?.isProvisional || !verified);

  const localRank = useMemo(() => {
    if (!currentResult) return 1;
    return localResultRepository.all().filter((result) => result.score > currentResult.score).length + 1;
  }, [currentResult]);

  const displayRank = verifiedRankNum ?? localRank;
  const rankBoardContext = verified?.isTopThreeAllTime
    ? 'All-Time Leaderboard'
    : verified?.isTopThreeDaily
      ? 'Daily Leaderboard'
      : 'Local Arena';

  useEffect(() => {
    if (!currentResult || celebrationPlayedRef.current) return;
    celebrationPlayedRef.current = true;

    if (isVerifiedTopThree && verifiedRankNum !== null) {
      if (verifiedRankNum === 1) gameAudio.firstPlace();
      else if (verifiedRankNum === 2) gameAudio.secondPlace();
      else if (verifiedRankNum === 3) gameAudio.thirdPlace();
    } else if (currentResult.personalBest) {
      gameAudio.personalBest();
    }
  }, [currentResult, isVerifiedTopThree, verifiedRankNum]);

  if (!currentResult) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:px-10">
        <Trophy className="mx-auto text-gold" size={46} />
        <div className="eyebrow mt-7">no active result</div>
        <h1 className="font-podium mt-4 text-5xl uppercase text-white">No round to show.</h1>
        <p className="mx-auto mt-4 max-w-md font-inter text-sm leading-7 text-white/50">
          Complete a round and the arena will turn your run into a full performance report.
        </p>
        <Link to="/setup" className="mt-8 inline-flex items-center gap-3 bg-white px-6 py-4 font-inter text-xs font-bold uppercase tracking-[.2em] text-black">
          Play a round <Play size={17} />
        </Link>
      </div>
    );
  }

  const unlocked = profile.achievements.filter(
    (achievement) => achievement.unlocked && achievement.unlockedAt === currentResult.createdAt
  );

  const displayPhoto = currentResult.profilePicture || profile.profilePicture;

  const share = async () => {
    const text = `${currentResult.nickname} scored ${formatScore(currentResult.score)} in Chip Bite Challenge!`;
    if (navigator.share) await navigator.share({ title: 'Chip Bite Challenge', text });
    else await navigator.clipboard?.writeText(text);
  };

  const metrics: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: 'Accuracy', value: currentResult.accuracy === null ? 'Unavailable' : `${Math.round(currentResult.accuracy * 100)}%`, Icon: Target },
    { label: 'Bomb penalties', value: currentResult.bombPenalties, Icon: Flame },
    { label: 'Detection system', value: 'Webcam', Icon: Medal },
    { label: 'Ranking status', value: isProvisional ? 'Provisional (Local)' : 'Verified (Server)', Icon: BadgeCheck },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
      <Link to="/" className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-white/45 transition hover:text-white">
        <ArrowLeft size={15} /> Home
      </Link>

      {/* TOP THREE WINNER CELEBRATION BANNER */}
      {isVerifiedTopThree && verifiedRankNum !== null && (
        <section
          className={`relative mt-8 overflow-hidden border-2 p-6 sm:p-8 ${
            verifiedRankNum === 1
              ? 'border-gold bg-gradient-to-r from-purple-950/80 via-black/80 to-gold/20 shadow-[0_0_50px_rgba(255,224,120,0.35)]'
              : verifiedRankNum === 2
                ? 'border-slate-300 bg-gradient-to-r from-slate-900/80 via-black/80 to-slate-400/20 shadow-[0_0_40px_rgba(203,213,225,0.3)]'
                : 'border-amber-600 bg-gradient-to-r from-amber-950/80 via-black/80 to-amber-700/20 shadow-[0_0_35px_rgba(217,119,6,0.3)]'
          }`}
          aria-live="polite"
        >
          <WinnerParticles theme={verifiedRankNum === 1 ? 'gold' : verifiedRankNum === 2 ? 'silver' : 'bronze'} />

          <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 ${
                verifiedRankNum === 1
                  ? 'border-gold bg-gold/20 text-gold shadow-[0_0_25px_#ffe078]'
                  : verifiedRankNum === 2
                    ? 'border-slate-300 bg-slate-200/20 text-slate-200 shadow-[0_0_20px_#cbd5e1]'
                    : 'border-amber-500 bg-amber-600/20 text-amber-400 shadow-[0_0_20px_#d97706]'
              }`}
            >
              {verifiedRankNum === 1 ? <Crown size={48} /> : verifiedRankNum === 2 ? <Medal size={44} /> : <Award size={44} />}
            </div>

            <div className="flex-1">
              <div
                className={`inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[.2em] ${
                  verifiedRankNum === 1 ? 'text-gold' : verifiedRankNum === 2 ? 'text-slate-300' : 'text-amber-400'
                }`}
              >
                <Sparkles size={14} />
                {verifiedRankNum === 1 ? '★ CHAMPION! NEW #1 ★' : verifiedRankNum === 2 ? '★ SECOND PLACE PODIUM ★' : '★ THIRD PLACE PODIUM ★'}
              </div>

              <h2 className="font-podium mt-2 text-3xl uppercase text-white sm:text-4xl">
                {verifiedRankNum === 1
                  ? 'First-Place Victory!'
                  : verifiedRankNum === 2
                    ? 'Second-Place Achievement!'
                    : 'Third-Place Victory!'}
              </h2>

              <p className="mt-2 font-inter text-sm leading-6 text-white/70">
                Verified Rank #{verifiedRankNum} on the {rankBoardContext} with {formatScore(currentResult.score)} points. The arena salutes a master run.
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <div className="font-inter text-[.65rem] uppercase tracking-[.18em] text-white/40">Verified Rank</div>
              <div
                className={`font-podium text-5xl uppercase ${
                  verifiedRankNum === 1 ? 'text-gold' : verifiedRankNum === 2 ? 'text-slate-300' : 'text-amber-400'
                }`}
              >
                #{verifiedRankNum}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Score Hero */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
        <div>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-cyan shadow-[0_0_15px_rgba(80,227,255,0.25)] shrink-0 bg-cyan/10 flex items-center justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt={currentResult.nickname} className="h-full w-full object-cover" />
              ) : (
                <User size={28} className="text-cyan" />
              )}
            </div>
            <div>
              <div className="font-podium text-2xl uppercase text-white flex items-center gap-2">
                <span>{currentResult.nickname}</span>
                <span className="border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-xs text-violet font-semibold">
                  LVL {profile.level}
                </span>
              </div>
              <div className="font-inter text-xs text-white/40">
                {new Date(currentResult.createdAt).toLocaleString()} · Mode: {currentResult.mode}
              </div>
            </div>
          </div>

          <div className="eyebrow">round complete · final report</div>
          <h1 className="font-score mt-5 text-[clamp(5rem,14vw,13rem)] uppercase leading-[.75] tracking-[-.06em] text-white">
            {formatScore(currentResult.score)}
          </h1>
          <p className="mt-8 max-w-xl font-inter text-base leading-8 text-white/55">
            {currentResult.personalBest
              ? 'New personal best. The arena noticed.'
              : 'Solid bite. Your next run is already waiting.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {currentResult.personalBest && (
              <div className="inline-flex items-center gap-2 border border-gold/30 bg-gold/10 px-4 py-2 font-inter text-xs font-bold uppercase tracking-[.15em] text-gold">
                <Trophy size={16} /> Personal best
              </div>
            )}
            {isVerifiedTopThree && (
              <div
                className={`inline-flex items-center gap-2 border px-4 py-2 font-inter text-xs font-bold uppercase tracking-[.15em] ${
                  verifiedRankNum === 1
                    ? 'border-gold bg-gold/20 text-gold'
                    : verifiedRankNum === 2
                      ? 'border-slate-300 bg-slate-200/20 text-slate-200'
                      : 'border-amber-500 bg-amber-600/20 text-amber-400'
                }`}
              >
                <Crown size={15} /> Top 3 Podium Rank #{verifiedRankNum}
              </div>
            )}
            {isProvisional && (
              <div className="inline-flex items-center gap-2 border border-white/20 bg-white/[.04] px-4 py-2 font-inter text-xs uppercase tracking-[.14em] text-white/60">
                Provisional rank (local only)
              </div>
            )}
          </div>
        </div>

        {/* Podium Position Card */}
        <div className="border-l border-white/20 pl-6 lg:mb-3 lg:pl-10">
          <div className="flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-[.2em] text-white/40">
            Podium position
            {isProvisional ? (
              <span className="border border-gold/30 px-2 py-0.5 text-[.6rem] text-gold">Provisional</span>
            ) : (
              <span className="border border-cyan/40 px-2 py-0.5 text-[.6rem] text-cyan">Verified</span>
            )}
          </div>
          <div className="font-podium mt-3 text-6xl uppercase text-gold">#{displayRank}</div>
          <p className="mt-2 font-inter text-sm leading-6 text-white/50">
            {isProvisional
              ? 'Based on scores stored in this browser. Connect to server API for verified global leaderboard.'
              : `Verified ranking on the ${rankBoardContext}.`}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mt-16 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Captured chips" value={currentResult.capturedChips} detail={`${currentResult.goldenChips} golden targets`} accent="cyan" />
        <StatCard label="Best combo" value={`×${currentResult.bestCombo}`} detail="Streak strength" accent="violet" />
        <StatCard label="XP earned" value={`+${currentResult.xpEarned}`} detail={`Level ${profile.level}`} accent="coral" />
        <StatCard label="Leaderboard rank" value={`#${displayRank}`} detail={isProvisional ? 'Provisional' : 'Verified'} accent="gold" />
      </div>

      {/* Details Grid */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="border border-white/10 bg-black/20 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <div className="eyebrow">performance ledger</div>
              <h2 className="font-podium mt-2 text-3xl uppercase text-white">Round report</h2>
            </div>
            <TrendingUp className="text-cyan" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {metrics.map(({ label, value, Icon }) => (
              <div className="flex items-center justify-between border-b border-white/10 pb-4" key={label}>
                <span className="flex items-center gap-3 font-inter text-sm text-white/50">
                  <Icon size={16} className="text-cyan" /> {label}
                </span>
                <strong className="font-podium text-lg uppercase text-white">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="font-podium text-2xl text-white">{currentResult.goldenChips}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-white/40">Golden bites</div>
            </div>
            <div>
              <div className="font-podium text-2xl text-white">{currentResult.bombPenalties}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-white/40">Bomb penalties</div>
            </div>
            <div>
              <div className="font-podium text-2xl text-white">{currentResult.eligibleOpportunities}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-white/40">Opportunities</div>
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-white/[.03] p-6 sm:p-8">
          <div className="eyebrow">achievement unlocks</div>
          <h2 className="font-podium mt-2 text-3xl uppercase text-white">Badges earned.</h2>
          {unlocked.length ? (
            <div className="mt-7 space-y-3">
              {unlocked.map((achievement) => (
                <div className="flex items-center gap-4 border border-gold/20 bg-gold/10 p-4" key={achievement.id}>
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <div className="font-podium uppercase text-gold">{achievement.title}</div>
                    <div className="mt-1 font-inter text-xs leading-5 text-white/50">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="font-inter text-sm leading-7 text-white/45">
                The next clean run could unlock your first badge. Keep the combo alive and stay clear of bombs.
              </p>
              <Link to="/how-to-play" className="mt-5 inline-flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-[.16em] text-cyan">
                Review the field guide <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Official End-of-Game Report & Data Export */}
      <section className="mt-12 border border-cyan/25 bg-cyan/[.04] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="eyebrow">official arena documentation</div>
            <h2 className="font-podium mt-2 text-3xl uppercase text-white">Export match report.</h2>
            <p className="mt-1 font-inter text-xs text-white/50">
              Download complete certified game statistics including your player photo, exact score, combo streaks, and verified arena rank.
            </p>
          </div>
          <div className="flex items-center gap-2 text-cyan font-mono text-xs">
            <BadgeCheck size={18} /> Verified Export 1.0
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => exportPdfReport(currentResult, profile, verified)}
            className="flex flex-col justify-between border border-white/15 bg-black/40 p-5 text-left transition hover:border-cyan hover:bg-cyan/[.06] group"
          >
            <div className="flex items-center justify-between text-cyan">
              <FileText size={24} />
              <Download size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <div className="font-podium text-xl uppercase text-white">PDF Report</div>
              <div className="mt-1 font-inter text-xs text-white/45">
                Full visual report with player photo and performance certificate.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => exportCsvReport(currentResult, profile, verified)}
            className="flex flex-col justify-between border border-white/15 bg-black/40 p-5 text-left transition hover:border-gold hover:bg-gold/[.06] group"
          >
            <div className="flex items-center justify-between text-gold">
              <FileSpreadsheet size={24} />
              <Download size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <div className="font-podium text-xl uppercase text-white">CSV Stats</div>
              <div className="mt-1 font-inter text-xs text-white/45">
                Tabular metrics formatted for Excel, Sheets, and data tools.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => exportJsonReport(currentResult, profile, verified)}
            className="flex flex-col justify-between border border-white/15 bg-black/40 p-5 text-left transition hover:border-violet hover:bg-violet/[.06] group"
          >
            <div className="flex items-center justify-between text-violet">
              <FileCode size={24} />
              <Download size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <div className="font-podium text-xl uppercase text-white">JSON Record</div>
              <div className="mt-1 font-inter text-xs text-white/45">
                Versioned schema 1.0.0 raw match payload with stable result GUID.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => printReport(currentResult, profile, verified)}
            className="flex flex-col justify-between border border-white/15 bg-black/40 p-5 text-left transition hover:border-white hover:bg-white/[.06] group"
          >
            <div className="flex items-center justify-between text-white/70">
              <Printer size={24} />
              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <div className="font-podium text-xl uppercase text-white">Print View</div>
              <div className="mt-1 font-inter text-xs text-white/45">
                Print directly or save via browser system PDF dialog.
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Action Footer */}
      <section className="mt-12 flex flex-col justify-between gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">the next attempt</div>
          <h2 className="font-podium mt-3 text-4xl uppercase leading-none text-white sm:text-5xl">
            One more<br />run?
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-3 bg-white px-5 py-4 font-inter text-xs font-bold uppercase tracking-[.18em] text-black transition hover:bg-cyan"
            onClick={() => navigate('/setup')}
          >
            <Play size={16} /> Play again
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-3 border border-cyan/40 bg-cyan/10 px-5 py-4 font-inter text-xs font-bold uppercase tracking-[.18em] text-cyan transition hover:bg-cyan hover:text-black"
            onClick={() => setPhotoOpen(true)}
          >
            <Camera size={16} /> Take Souvenir Photo
          </button>
          <button
            className="inline-flex items-center gap-3 border border-white/20 px-5 py-4 font-inter text-xs font-bold uppercase tracking-[.18em] text-white/70 transition hover:border-white hover:text-white"
            onClick={share}
          >
            <Share2 size={16} /> Share run
          </button>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-3 border border-white/20 px-5 py-4 font-inter text-xs font-bold uppercase tracking-[.18em] text-white/70 transition hover:border-white hover:text-white"
          >
            <Trophy size={16} /> Leaderboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-3 border border-white/20 px-5 py-4 font-inter text-xs font-bold uppercase tracking-[.18em] text-white/70 transition hover:border-white hover:text-white"
          >
            <Home size={16} /> Home
          </Link>
        </div>
      </section>

      {/* Souvenir Photo Studio Modal */}
      <PhotoStudioModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        result={currentResult}
        nickname={profile.nickname}
      />
    </div>
  );
}
