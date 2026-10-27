import { useRef, useState } from 'react';
import { ArrowUpRight, Award, Camera, Check, Flame, RotateCcw, ShieldCheck, Target, Trash2, Trophy, Upload, UserRound, Zap, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { useGameStore, gameStore } from '../store/gameStore';
import { formatScore } from '../utils/validation';
import { apiPlayerRepository } from '../services/storage';

export function ProfilePage() {
  const { profile } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoMessage, setPhotoMessage] = useState<string>('');

  const nextLevelXp = profile.level * 250;
  const progress = Math.min(100, Math.round((profile.totalXp / Math.max(1, nextLevelXp)) * 100));

  const reset = () => {
    if (window.confirm('Reset your local profile and scores?')) {
      gameStore.resetProfile();
      localStorage.removeItem('cbc-results');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        gameStore.setProfilePicture(dataUrl);
        setPhotoMessage('Profile picture updated successfully!');

        if (profile.id) {
          apiPlayerRepository.updatePicture(profile.id, dataUrl).catch(() => {});
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removePhoto = () => {
    if (window.confirm('Remove your profile picture?')) {
      gameStore.setProfilePicture(null);
      setPhotoMessage('Profile picture removed.');
      if (profile.id) {
        apiPlayerRepository.updatePicture(profile.id, null).catch(() => {});
      }
    }
  };

  const targets: Array<{ complete: boolean; title: string; copy: string; Icon: LucideIcon }> = [
    { complete: profile.bestScore >= 200, title: 'High Scorer', copy: 'Reach 200 points in a round.', Icon: Trophy },
    { complete: profile.bestCombo >= 10, title: 'Combo Master', copy: 'Reach a combo of ten.', Icon: Flame },
    { complete: profile.totalRounds >= 1, title: 'First Bite', copy: 'Complete your first round.', Icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
        <div>
          <div className="eyebrow">player identity · 04</div>
          <h1 className="font-podium mt-5 text-[clamp(3.7rem,8vw,8rem)] uppercase leading-[.86] tracking-[-.05em] text-white">
            Your<br />record.
          </h1>
        </div>
        <div className="border-l border-white/20 pl-6 lg:mb-2 lg:pl-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cyan/60 bg-cyan/10 text-cyan shadow-[0_0_20px_rgba(80,227,255,0.25)]">
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.nickname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={34} />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition text-cyan"
                title="Change profile picture"
                aria-label="Upload photo"
              >
                <Camera size={20} />
              </button>
            </div>

            <div className="flex-1">
              <div className="font-inter text-xs uppercase tracking-[.18em] text-white/40">
                Arena Identity
              </div>
              <div className="font-podium mt-1 text-3xl uppercase text-white flex items-center gap-3">
                <span>{profile.nickname}</span>
                <span className="border border-violet/40 bg-violet/10 px-2.5 py-0.5 font-mono text-xs text-violet font-semibold">
                  LVL {profile.level}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Select profile image"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-white/20 bg-white/[.04] px-3 py-1 font-inter text-[.65rem] font-bold uppercase tracking-wider text-white/80 hover:border-cyan hover:text-cyan transition"
                >
                  <Upload size={12} /> Change photo
                </button>
                {profile.profilePicture && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="inline-flex items-center gap-1.5 border border-coral/30 bg-coral/10 px-3 py-1 font-inter text-[.65rem] font-bold uppercase tracking-wider text-coral hover:bg-coral/20 transition"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {photoMessage && (
            <div className="mt-3 font-inter text-xs text-cyan flex items-center gap-1.5">
              <Check size={14} /> {photoMessage}
            </div>
          )}

          <p className="mt-5 font-inter text-sm leading-7 text-white/50">
            Every round feeds this local and tournament record. Your profile picture is displayed on podiums, leaderboards, and exported reports.
          </p>
        </div>
      </div>

      <div className="mt-16 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Best score" value={formatScore(profile.bestScore)} detail={`${profile.totalRounds} rounds played`} accent="gold" />
        <StatCard label="Player level" value={`LVL ${profile.level}`} detail={`${profile.totalXp} XP earned`} accent="violet" />
        <StatCard label="Best combo" value={`×${profile.bestCombo}`} detail="Personal record" accent="cyan" />
        <StatCard label="Badges" value={profile.achievements.filter((achievement) => achievement.unlocked).length} detail={`of ${profile.achievements.length} unlocked`} accent="coral" />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="border border-white/10 bg-black/20 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">progress signal</div>
              <h2 className="font-podium mt-2 text-3xl uppercase text-white">Level {profile.level} momentum.</h2>
            </div>
            <Zap className="text-violet" />
          </div>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <div className="font-podium text-5xl text-cyan">{progress}%</div>
              <div className="mt-1 font-inter text-xs uppercase tracking-[.16em] text-white/40">toward level {profile.level + 1}</div>
            </div>
            <div className="text-right font-inter text-xs text-white/40">{profile.totalXp} / {nextLevelXp} XP</div>
          </div>
          <div className="mt-4 h-3 overflow-hidden bg-white/10">
            <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border-t border-white/10 pt-4">
              <Flame size={18} className="text-coral" />
              <div className="font-podium mt-3 text-xl uppercase text-white">{profile.bestCombo}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.14em] text-white/40">Peak combo</div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <Target size={18} className="text-cyan" />
              <div className="font-podium mt-3 text-xl uppercase text-white">{profile.totalRounds}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.14em] text-white/40">Rounds logged</div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <Award size={18} className="text-gold" />
              <div className="font-podium mt-3 text-xl uppercase text-white">{formatScore(profile.bestScore)}</div>
              <div className="font-inter text-[.62rem] uppercase tracking-[.14em] text-white/40">Best score</div>
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-white/[.03] p-6 sm:p-8">
          <div className="eyebrow">next targets</div>
          <h2 className="font-podium mt-2 text-3xl uppercase text-white">Keep the signal alive.</h2>
          <div className="mt-7 space-y-4">
            {targets.map(({ complete, title, copy, Icon }) => (
              <div className={`flex items-center gap-4 border p-4 ${complete ? 'border-gold/20 bg-gold/10' : 'border-white/10 bg-black/10'}`} key={title}>
                <Icon size={19} className={complete ? 'text-gold' : 'text-white/35'} />
                <div className="flex-1">
                  <div className="font-podium uppercase text-white">{title}</div>
                  <div className="mt-1 font-inter text-xs text-white/45">{copy}</div>
                </div>
                <span className="font-inter text-[.62rem] uppercase tracking-[.12em] text-white/35">{complete ? 'Cleared' : 'Open'}</span>
              </div>
            ))}
          </div>
          <Link to="/how-to-play" className="mt-7 inline-flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-[.16em] text-cyan">
            Read the field guide <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>

      <section className="mt-12 border border-white/10 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="eyebrow">history log</div>
            <h2 className="font-podium mt-2 text-3xl uppercase text-white">Recent rounds.</h2>
          </div>
          <Link to="/leaderboard" className="font-inter text-xs font-bold uppercase tracking-[.16em] text-white/50 hover:text-white">
            Compare scores ↗
          </Link>
        </div>
        <div className="mt-2">
          {profile.recentResults.length ? (
            profile.recentResults.slice(0, 8).map((result, index) => (
              <div className="grid gap-3 border-b border-white/5 py-5 sm:grid-cols-[50px_1fr_120px_120px] sm:items-center" key={result.id}>
                <div className="font-podium text-xl text-white/25">0{index + 1}</div>
                <div>
                  <div className="font-podium uppercase text-white">Webcam run</div>
                  <div className="mt-1 font-inter text-xs text-white/35">{new Date(result.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-score text-xl text-cyan">{formatScore(result.score)}</div>
                  <div className="font-inter text-[.62rem] uppercase tracking-[.12em] text-white/35">score</div>
                </div>
                <div className="sm:text-right">
                  <div className="font-inter text-sm text-white/60">×{result.bestCombo} combo</div>
                  <div className="font-inter text-[.62rem] uppercase tracking-[.12em] text-white/35">{result.capturedChips} bites</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-14 text-center">
              <Trophy className="mx-auto text-gold" size={38} />
              <p className="mt-4 font-inter text-sm text-white/45">Your recent rounds will appear after your first bite.</p>
              <Link to="/setup" className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-3 font-inter text-xs font-bold uppercase tracking-[.15em] text-black">
                Start a round <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
        <div className="font-inter text-xs leading-5 text-white/35">
          Resetting removes this browser's local profile, results, XP, and badges.
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 border border-coral/30 px-4 py-3 font-inter text-xs font-bold uppercase tracking-[.15em] text-coral transition hover:bg-coral/10"
          onClick={reset}
        >
          <RotateCcw size={15} /> Reset local profile
        </button>
      </section>
    </div>
  );
}
