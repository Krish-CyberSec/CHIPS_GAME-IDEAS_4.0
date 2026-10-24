import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Award, ChevronDown, Crown, Menu, Volume2, VolumeX, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { gameStore, useGameStore } from '../store/gameStore';

const backgroundVideo = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4';

export function HomePage() {
  const { settings } = useGameStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateVideoMotion = () => {
      const video = backgroundVideoRef.current;
      if (!video) return;
      if (query.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    updateVideoMotion();
    query.addEventListener?.('change', updateVideoMotion);
    return () => query.removeEventListener?.('change', updateVideoMotion);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return <div className="cinematic-shell relative min-h-[100svh] overflow-hidden bg-[#110d0b] text-white">
    <video ref={backgroundVideoRef} className="absolute inset-0 h-full min-h-[100svh] w-full object-cover" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
      <source src={backgroundVideo} type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-[#110d0b]/50" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/45" aria-hidden="true" />

    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-black/20 px-6 py-5 backdrop-blur-sm sm:px-10 lg:px-16 lg:py-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <Link to="/" aria-label="Chip Bite Challenge home"><Logo /></Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          <Link className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/how-to-play">How to play</Link>
          <Link className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/leaderboard">Leaderboard</Link>
          <a className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" href="#about">About</a>
          <Link className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/profile">Profile</Link>
          <Link className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/admin">Operator</Link>
          <Link className="group ml-1 inline-flex items-center gap-3 border border-white/35 px-4 py-3 font-inter text-[0.67rem] font-bold uppercase tracking-[0.2em] text-white transition hover:border-white hover:bg-white hover:text-black" to="/setup">Play now <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
          <button className="border-l border-white/15 pl-5 text-white/65 transition hover:text-white" aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}>{settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <button className="text-white/70 transition hover:text-white" aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}>{settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button ref={menuButtonRef} type="button" className="inline-flex h-11 w-11 items-center justify-center border border-white/25 text-white transition hover:bg-white hover:text-black" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>

    <div role="dialog" aria-modal="true" aria-label="Mobile navigation" className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-[opacity,visibility] duration-500 md:hidden ${menuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`} aria-hidden={!menuOpen}>
      <div className="flex h-full flex-col px-6 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Chip Bite Challenge home" onClick={closeMenu}><Logo /></Link>
          <button ref={closeButtonRef} type="button" className="inline-flex h-11 w-11 items-center justify-center border border-white/25 text-white transition hover:bg-white hover:text-black" aria-label="Close navigation menu" onClick={closeMenu}>
            <X size={23} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-7" aria-label="Mobile navigation">
          <Link className={`font-podium text-4xl uppercase tracking-tight text-white transition-[opacity,transform,color] duration-500 hover:text-white/55 sm:text-6xl ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: menuOpen ? '80ms' : '0ms' }} to="/how-to-play" onClick={closeMenu}>How to play</Link>
          <Link className={`font-podium text-4xl uppercase tracking-tight text-white transition-[opacity,transform,color] duration-500 hover:text-white/55 sm:text-6xl ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: menuOpen ? '140ms' : '0ms' }} to="/leaderboard" onClick={closeMenu}>Leaderboard</Link>
          <Link className={`font-podium text-4xl uppercase tracking-tight text-white transition-[opacity,transform,color] duration-500 hover:text-white/55 sm:text-6xl ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: menuOpen ? '200ms' : '0ms' }} to="/profile" onClick={closeMenu}>Profile</Link>
          <a className={`font-podium text-4xl uppercase tracking-tight text-white transition-[opacity,transform,color] duration-500 hover:text-white/55 sm:text-6xl ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: menuOpen ? '260ms' : '0ms' }} href="#about" onClick={closeMenu}>About</a>
          <Link className={`mt-3 inline-flex w-fit items-center gap-3 border border-white/45 px-5 py-4 font-inter text-sm font-bold uppercase tracking-[0.2em] text-white transition-[opacity,transform,background-color,color] duration-500 hover:bg-white hover:text-black ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: menuOpen ? '320ms' : '0ms' }} to="/setup" onClick={closeMenu}>Play now <ArrowUpRight size={18} /></Link>
        </nav>
        <div className="flex items-center justify-between gap-5"><p className="font-inter text-xs uppercase tracking-[0.18em] text-white/40">Camera-powered arcade gameplay</p><span className="font-inter text-[.6rem] uppercase tracking-[.16em] text-white/25">Camera stays local</span></div>
      </div>
    </div>

    <main className="relative z-10">
      <section className="mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-center px-6 pb-10 pt-32 sm:px-10 lg:px-16">
        <div className="max-w-3xl">
          <div className="cbc-fade-up flex items-center gap-3 font-inter text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/65" style={{ animationDelay: '0s' }}>
            <Crown size={15} className="text-white/80" /> The ultimate motion-controlled arcade game
          </div>
          <h1 className="cbc-fade-up mt-6 font-podium text-[clamp(2.8rem,8vw,7rem)] font-bold uppercase leading-[0.92] tracking-[-0.045em] text-white" style={{ animationDelay: '0.2s' }}>
            Open.<br />Bite.<br />Score.
          </h1>
          <p className="cbc-fade-up mt-7 max-w-md font-inter text-base leading-7 text-white/70 sm:text-lg" style={{ animationDelay: '0.4s' }}>
            Catch virtual chips using your facial movements. Dodge bombs, build combos, and chase the highest score.
          </p>
          <div className="cbc-fade-up mt-8 flex flex-wrap items-center gap-5" style={{ animationDelay: '0.6s' }}>
            <Link className="group inline-flex items-center gap-4 bg-white px-6 py-4 font-inter text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white/80" to="/setup">Play now <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
            <a className="inline-flex items-center gap-2 font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" href="#about">Discover the arena <ChevronDown size={15} /></a>
          </div>
          <div className="cbc-fade-up mt-10 hidden items-center gap-3 sm:flex" style={{ animationDelay: '0.6s' }}>
            <Award size={28} strokeWidth={1.4} className="text-white/65" />
            <div className="font-inter text-[0.63rem] font-semibold uppercase leading-5 tracking-[0.18em] text-white/60">Camera-powered<br />Arcade gameplay</div>
          </div>
        </div>

        <div className="cbc-fade-up mt-auto grid max-w-4xl gap-6 border-t border-white/20 pt-6 sm:grid-cols-3 sm:gap-10" style={{ animationDelay: '0.8s' }}>
          <div><div className="font-podium text-2xl uppercase tracking-wide text-white sm:text-3xl">45 seconds</div><div className="mt-1 font-inter text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/50">Round length</div></div>
          <div><div className="font-podium text-2xl uppercase tracking-wide text-white sm:text-3xl">Real-time</div><div className="mt-1 font-inter text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/50">Face tracking</div></div>
          <div><div className="font-podium text-2xl uppercase tracking-wide text-white sm:text-3xl">High score</div><div className="mt-1 font-inter text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/50">Compete to win</div></div>
        </div>
      </section>

      <section id="about" className="border-t border-white/10 bg-black/75 px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div><div className="font-inter text-xs font-semibold uppercase tracking-[0.25em] text-white/45">About the challenge</div><h2 className="mt-4 max-w-xl font-podium text-4xl uppercase leading-none tracking-tight text-white sm:text-6xl">Your face is the controller.</h2></div>
          <div className="grid gap-8 border-l border-white/20 pl-6 sm:grid-cols-2 sm:pl-8"><p className="font-inter text-sm leading-7 text-white/60">Move your head toward falling chips, open your mouth to capture them, and keep the streak alive. Every round is short enough for a rematch and sharp enough for a crowd.</p><p className="font-inter text-sm leading-7 text-white/60">Face tracking runs locally in your browser. The camera is the only controller, so every player learns the same physical bite rhythm.</p></div>
        </div>
        <div className="mx-auto mt-16 flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-6"><Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/how-to-play">How to play <ArrowUpRight size={14} className="ml-1 inline" /></Link><Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/65 transition hover:text-white" to="/leaderboard">View leaderboard <ArrowUpRight size={14} className="ml-1 inline" /></Link><span className="ml-auto font-inter text-[0.62rem] uppercase tracking-[0.2em] text-white/35">Built for the next big bite</span></div>
      </section>
      <footer className="border-t border-white/10 bg-black/60 px-6 py-10 sm:px-10 lg:px-16"><div className="mx-auto grid max-w-[1600px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><Logo /><p className="mt-5 max-w-xs font-inter text-sm leading-6 text-white/45">A cinematic, camera-powered arcade challenge built for quick rounds, loud reactions, and one more try.</p></div><div><div className="font-inter text-[.62rem] font-bold uppercase tracking-[.2em] text-white/35">Explore</div><div className="mt-4 space-y-3 font-inter text-sm text-white/60"><Link className="block hover:text-white" to="/how-to-play">How to play</Link><Link className="block hover:text-white" to="/leaderboard">Leaderboard</Link><Link className="block hover:text-white" to="/profile">Player profile</Link></div></div><div><div className="font-inter text-[.62rem] font-bold uppercase tracking-[.2em] text-white/35">Enter the arena</div><div className="mt-4 space-y-3 font-inter text-sm text-white/60"><Link className="block hover:text-white" to="/setup">Start a round</Link><Link className="block hover:text-white" to="/setup">Camera setup</Link><Link className="block hover:text-white" to="/admin">Operator console</Link></div></div><div><div className="font-inter text-[.62rem] font-bold uppercase tracking-[.2em] text-white/35">Privacy</div><p className="mt-4 font-inter text-sm leading-6 text-white/45">Face landmarks and camera frames stay in your browser. Only completed result summaries can be sent to the configured API.</p></div></div><div className="mx-auto mt-10 flex max-w-[1600px] flex-col gap-2 border-t border-white/10 pt-5 font-inter text-[.62rem] uppercase tracking-[.16em] text-white/30 sm:flex-row sm:justify-between"><span>Chip Bite Challenge · 45-second arcade rounds</span><span>Built for fast, friendly competition</span></div></footer>
    </main>
  </div>;
}
