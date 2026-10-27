import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
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

  const isLight = settings.theme === 'light';

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

  return <div className="cinematic-shell relative min-h-[100svh] overflow-hidden bg-[var(--bg-shell)] text-[var(--text-main)] transition-colors duration-200">
    <video ref={backgroundVideoRef} className="absolute inset-0 h-full min-h-[100svh] w-full object-cover" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
      <source src={backgroundVideo} type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-[var(--video-overlay)]" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-shell)] via-transparent to-[var(--header-bg)]" aria-hidden="true" />

    <header className="relative z-30 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 sm:px-10 lg:px-16 lg:py-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Landing navigation">
          <Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white" to="/how-to-play">How to play</Link>
          <Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white" to="/leaderboard">Leaderboard</Link>
          <Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white" to="/profile">Profile</Link>
          <Link className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white" to="/admin">Operator</Link>
          
          <div className="flex items-center gap-3 border-l border-white/20 pl-6">
            <button className="text-white/60 transition hover:text-white" aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => gameStore.toggleTheme()}>
              {isLight ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="text-white/60 transition hover:text-white" aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}>
              {settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
          <Link className="group inline-flex items-center gap-3 border border-white/40 px-5 py-3 font-inter text-xs font-bold uppercase tracking-[0.2em] transition hover:border-white hover:bg-white hover:text-black" to="/setup">
            Play now <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <button className="text-white/70" aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => gameStore.toggleTheme()}>
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="text-white/70" aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}>
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button ref={menuButtonRef} type="button" className="inline-flex h-10 w-10 items-center justify-center border border-white/25 text-white" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
        </div>
      </div>
    </header>

    <div role="dialog" aria-modal="true" aria-label="Site navigation" className={`fixed inset-0 z-50 bg-[var(--dialog-bg)] backdrop-blur-sm transition-[opacity,visibility] duration-500 md:hidden ${menuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`} aria-hidden={!menuOpen}>
      <div className="flex h-full flex-col px-6 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <button ref={closeButtonRef} type="button" className="inline-flex h-10 w-10 items-center justify-center border border-white/25 text-white" aria-label="Close navigation menu" onClick={closeMenu}>
            <X size={21} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-6" aria-label="Mobile navigation">
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/how-to-play" onClick={closeMenu}>How to play</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/leaderboard" onClick={closeMenu}>Leaderboard</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/profile" onClick={closeMenu}>Profile</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/admin" onClick={closeMenu}>Operator</Link>
          <Link className="mt-3 inline-flex w-fit items-center gap-3 border border-white/45 px-5 py-4 font-inter text-sm font-bold uppercase tracking-[0.2em] transition hover:bg-white hover:text-black" to="/setup" onClick={closeMenu}>Play now <ArrowUpRight size={18} /></Link>
        </nav>
        <div className="flex items-center justify-between font-inter text-[0.62rem] uppercase tracking-[0.2em] text-white/35">
          <span>Chip Bite Challenge</span>
          <span>Camera stays local</span>
        </div>
      </div>
    </div>

    <section className="relative z-10 mx-auto flex min-h-[calc(100svh-90px)] max-w-[1600px] flex-col justify-between px-6 pb-12 pt-16 sm:px-10 sm:pb-16 sm:pt-24 lg:px-16 lg:pb-20 lg:pt-28">
      <div className="max-w-4xl">
        <div className="eyebrow cbc-stagger-1 inline-flex items-center gap-2">
          <span>Physical webcam arcade</span>
          <span className="text-white/30">/</span>
          <span>Camera only</span>
        </div>
        <h1 className="font-podium cbc-stagger-2 mt-6 text-[clamp(4.2rem,11vw,11.5rem)] uppercase leading-[.84] tracking-[-.045em] text-white">
          Bite.<br />Score.<br />Repeat.
        </h1>
        <p className="cbc-stagger-3 mt-8 max-w-xl font-inter text-base font-normal leading-8 text-white/65 sm:text-lg">
          No controllers. No keys. Stand in front of your camera, position your head under falling chips, and open wide. 45 seconds of pure arcade bite racing.
        </p>
        <div className="cbc-stagger-4 mt-10 flex flex-wrap items-center gap-4">
          <Link className="group inline-flex items-center gap-3 bg-white px-7 py-5 font-inter text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:bg-white/85" to="/setup">
            Play now <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link className="inline-flex items-center gap-3 border border-white/25 px-7 py-5 font-inter text-xs font-bold uppercase tracking-[0.22em] text-white/80 transition hover:border-white hover:text-white" to="/how-to-play">
            How it works
          </Link>
        </div>
      </div>

      <div className="cbc-fade-up mt-16 grid grid-cols-2 gap-px border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-4">
        {[
          ['45s', 'Round duration'],
          ['100%', 'Camera control'],
          ['Local', 'Browser vision'],
          ['Podium', 'Daily rankings'],
        ].map(([stat, label]) => (
          <div key={label} className="bg-[var(--card-bg)] p-5 backdrop-blur-sm sm:p-7">
            <div className="font-podium text-2xl uppercase tracking-wide text-white sm:text-3xl">{stat}</div>
            <div className="mt-1 font-inter text-[0.62rem] uppercase tracking-[0.18em] text-white/40">{label}</div>
          </div>
        ))}
      </div>
    </section>

    <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--header-bg)] px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 font-inter text-[0.65rem] uppercase tracking-[0.18em] text-white/35 sm:flex-row">
        <span>Chip Bite Challenge · Browser Webcam Game</span>
        <div className="flex gap-6">
          <Link to="/how-to-play" className="hover:text-white">Rules</Link>
          <Link to="/leaderboard" className="hover:text-white">Podium</Link>
          <Link to="/admin" className="hover:text-white">Kiosk</Link>
        </div>
      </div>
    </footer>
  </div>;
}
