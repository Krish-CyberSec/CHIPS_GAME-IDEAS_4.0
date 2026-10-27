import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Camera, Flame, Home, Medal, Play, Share2, Sparkles, Target, Trophy, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PhotoStudioModal } from '../components/PhotoStudioModal';
import { StatCard } from '../components/StatCard';
import { useGameStore } from '../store/gameStore';
import { formatScore } from '../utils/validation';
import { localResultRepository } from '../services/storage';

export function ResultsPage() {
  const navigate = useNavigate();
  const { currentResult, profile } = useGameStore();
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!currentResult) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:px-10">
        <Trophy className="mx-auto text-gold" size={46} />
        <div className="eyebrow mt-7">no active result</div>
        <h1 className="font-podium mt-4 text-5xl uppercase">No round to show.</h1>
        <p className="mx-auto mt-4 max-w-md font-inter text-sm leading-7 text-[#5c534c] dark:text-white/50">
          Complete a round and the arena will turn your run into a full performance report.
        </p>
        <Link
          to="/setup"
          className="arcade-button-primary mt-8 inline-flex items-center gap-3"
        >
          Play a round <Play size={17} />
        </Link>
      </div>
    );
  }

  const rank = localResultRepository.all().filter((result) => result.score > currentResult.score).length + 1;
  const unlocked = profile.achievements.filter((achievement) => achievement.unlocked && achievement.unlockedAt === currentResult.createdAt);

  const share = async () => {
    const text = `${currentResult.nickname} scored ${formatScore(currentResult.score)} in Chip Bite Challenge!`;
    if (navigator.share) await navigator.share({ title: 'Chip Bite Challenge', text });
    else await navigator.clipboard?.writeText(text);
  };

  const metrics: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: 'Accuracy', value: currentResult.accuracy === null ? 'Unavailable' : `${Math.round(currentResult.accuracy * 100)}%`, Icon: Target },
    { label: 'Bomb penalties', value: currentResult.bombPenalties, Icon: Flame },
    { label: 'Detection system', value: 'Webcam Vision', Icon: Medal },
    { label: 'Round status', value: currentResult.localOnly ? 'Local' : 'Synced', Icon: BadgeCheck },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[.18em] text-[#8c827a] hover:text-[#231f1c] dark:text-white/45 dark:hover:text-white transition"
      >
        <ArrowLeft size={15} /> Home
      </Link>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
        <div>
          <div className="eyebrow">round complete · final report</div>
          <h1 className="font-podium mt-5 text-[clamp(5rem,14vw,13rem)] uppercase leading-[.75] tracking-[-.06em] text-[#231f1c] dark:text-white">
            {formatScore(currentResult.score)}
          </h1>
          <p className="mt-8 max-w-xl font-inter text-base leading-8 text-[#5c534c] dark:text-white/55">
            {currentResult.personalBest ? 'New personal best. The arena noticed.' : 'Solid bite. Your next run is already waiting.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {currentResult.personalBest && (
              <div className="inline-flex items-center gap-2 border border-gold/30 bg-gold/10 px-4 py-2 font-inter text-xs font-bold uppercase tracking-[.15em] text-gold">
                <Trophy size={16} /> Personal best
              </div>
            )}
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="inline-flex items-center gap-2.5 rounded border border-[#d97746] bg-[#d97746]/10 px-4 py-2 font-inter text-xs font-bold uppercase tracking-[.15em] text-[#d97746] transition hover:bg-[#d97746] hover:text-white dark:border-cyan dark:bg-cyan/10 dark:text-cyan dark:hover:bg-cyan dark:hover:text-black"
            >
              <Camera size={16} /> Photograph Studio
            </button>
          </div>
        </div>

        <div className="border-l border-[#231f1c]/15 pl-6 dark:border-white/20 lg:mb-3 lg:pl-10">
          <div className="font-inter text-xs font-bold uppercase tracking-[.2em] text-[#8c827a] dark:text-white/40">
            Podium position
          </div>
          <div className="font-podium mt-3 text-6xl uppercase text-gold">#{rank}</div>
          <p className="mt-2 font-inter text-sm leading-6 text-[#5c534c] dark:text-white/50">
            Compared with local event results stored in this browser.
          </p>
        </div>
      </div>

      {/* Activity Prompt Banner */}
      <div className="mt-10 flex flex-col justify-between gap-4 border border-[#d97746]/25 bg-[#d97746]/10 p-5 sm:flex-row sm:items-center dark:border-cyan/25 dark:bg-cyan/10">
        <div className="flex items-center gap-3">
          <Sparkles className="text-[#d97746] dark:text-cyan" size={22} />
          <div>
            <div className="font-inter text-xs font-bold uppercase tracking-[.16em] text-[#d97746] dark:text-cyan">
              Activity Milestone · Souvenir Studio
            </div>
            <div className="font-inter text-sm text-[#5c534c] dark:text-white/70">
              Pose with your official score card featuring K.R. Mangalam University & Centre of Excellence AI logos!
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPhotoOpen(true)}
          className="arcade-button-primary inline-flex shrink-0 items-center gap-2"
        >
          <Camera size={16} /> Open Photo Studio
        </button>
      </div>

      <div className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Captured chips" value={currentResult.capturedChips} detail={`${currentResult.goldenChips} golden targets`} accent="cyan" />
        <StatCard label="Best combo" value={`×${currentResult.bestCombo}`} detail="Streak strength" accent="violet" />
        <StatCard label="XP earned" value={`+${currentResult.xpEarned}`} detail={`Level ${profile.level}`} accent="coral" />
        <StatCard label="Leaderboard rank" value={`#${rank}`} detail="Local podium position" accent="gold" />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="arcade-card p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-[#231f1c]/10 pb-5 dark:border-white/10">
            <div>
              <div className="eyebrow">performance ledger</div>
              <h2 className="font-podium mt-2 text-3xl uppercase">Round report</h2>
            </div>
            <TrendingUp className="text-[#d97746] dark:text-cyan" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {metrics.map(({ label, value, Icon }) => (
              <div className="flex items-center justify-between border-b border-[#231f1c]/10 pb-4 dark:border-white/10" key={label}>
                <span className="flex items-center gap-3 font-inter text-sm text-[#5c534c] dark:text-white/50">
                  <Icon size={16} className="text-[#d97746] dark:text-cyan" /> {label}
                </span>
                <strong className="font-podium text-lg uppercase">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="font-podium text-2xl">{currentResult.goldenChips}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">Golden bites</div>
            </div>
            <div>
              <div className="font-podium text-2xl">{currentResult.bombPenalties}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">Bomb penalties</div>
            </div>
            <div>
              <div className="font-podium text-2xl">{currentResult.eligibleOpportunities}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.15em] text-[#8c827a] dark:text-white/40">Opportunities</div>
            </div>
          </div>
        </section>

        <section className="arcade-card p-6 sm:p-8">
          <div className="eyebrow">achievement unlocks</div>
          <h2 className="font-podium mt-2 text-3xl uppercase">Badges earned.</h2>
          {unlocked.length ? (
            <div className="mt-7 space-y-3">
              {unlocked.map((achievement) => (
                <div className="flex items-center gap-4 border border-gold/20 bg-gold/10 p-4" key={achievement.id}>
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <div className="font-podium uppercase text-gold">{achievement.title}</div>
                    <div className="mt-1 font-inter text-xs leading-5 text-[#5c534c] dark:text-white/50">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-7 border-t border-[#231f1c]/10 pt-6 dark:border-white/10">
              <p className="font-inter text-sm leading-7 text-[#5c534c] dark:text-white/45">
                The next clean run could unlock your first badge. Keep the combo alive and stay clear of bombs.
              </p>
              <Link to="/how-to-play" className="mt-5 inline-flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-[.16em] text-[#d97746] dark:text-cyan">
                Review the field guide <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Next actions */}
      <section className="mt-12 flex flex-col justify-between gap-6 border-t border-[#231f1c]/15 pt-8 sm:flex-row sm:items-end dark:border-white/15">
        <div>
          <div className="eyebrow">the next attempt</div>
          <h2 className="font-podium mt-3 text-4xl uppercase leading-none sm:text-5xl">
            One more<br />run?
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="arcade-button-primary"
            onClick={() => navigate('/setup')}
          >
            <Play size={16} /> Play again
          </button>
          <button
            type="button"
            className="arcade-button-secondary"
            onClick={() => setPhotoOpen(true)}
          >
            <Camera size={16} /> Take Souvenir Photo
          </button>
          <button
            type="button"
            className="arcade-button-secondary"
            onClick={share}
          >
            <Share2 size={16} /> Share run
          </button>
          <Link
            to="/leaderboard"
            className="arcade-button-secondary"
          >
            <Trophy size={16} /> Leaderboard
          </Link>
          <Link
            to="/"
            className="arcade-button-secondary"
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
