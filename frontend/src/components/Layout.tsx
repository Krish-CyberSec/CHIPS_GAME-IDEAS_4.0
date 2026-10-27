import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { gameStore, useGameStore } from '../store/gameStore';

const backgroundVideo = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4';
const primaryItems = [
  { to: '/how-to-play', label: 'How to play' },
  { to: '/leaderboard', label: 'Leaderboard' },
];
const secondaryItems = [
  { to: '/profile', label: 'Profile' },
  { to: '/admin', label: 'Operator' },
];

export function Layout() {
  const { settings } = useGameStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const immersiveGame = location.pathname === '/game';
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [menuOpen]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncVideo = () => { if (query.matches) videoRef.current?.pause(); else void videoRef.current?.play().catch(() => undefined); };
    syncVideo();
    query.addEventListener?.('change', syncVideo);
    return () => query.removeEventListener?.('change', syncVideo);
  }, []);

  if (location.pathname === '/') return <main><Outlet /></main>;
  const closeMenu = () => { setMenuOpen(false); window.setTimeout(() => menuButtonRef.current?.focus(), 0); };

  const isLight = settings.theme === 'light';

  return <div className="cinematic-shell relative min-h-[100svh] overflow-hidden bg-[var(--bg-shell)] text-[var(--text-main)] transition-colors duration-200">
    <video ref={videoRef} className="pointer-events-none absolute inset-0 h-full min-h-full w-full object-cover opacity-[.10]" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src={backgroundVideo} type="video/mp4" /></video>
    <div className="pointer-events-none absolute inset-0 bg-[var(--video-overlay)]" aria-hidden="true" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 dark:from-black/80 dark:to-black/85" aria-hidden="true" />
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 sm:px-10 lg:px-16 lg:py-6">
        <Link to="/" aria-label="Go to Chip Bite Challenge home"><Logo /></Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {primaryItems.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] transition ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`}>{label}</NavLink>)}
          <Link className="font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:text-white" to="/#about">About</Link>
          {secondaryItems.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] transition ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`}>{label}</NavLink>)}
          <Link className="group ml-2 inline-flex items-center gap-3 border border-white/35 px-4 py-3 font-inter text-[0.67rem] font-bold uppercase tracking-[0.2em] transition hover:border-white hover:bg-white hover:text-black" to="/setup">Play now <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          
          <div className="flex items-center gap-3 border-l border-white/15 pl-5">
            <button className="text-white/65 transition hover:text-white" aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => gameStore.toggleTheme()}>
              {isLight ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="text-white/65 transition hover:text-white" aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}>
              {settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
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
          <Link to="/" aria-label="Go home" onClick={closeMenu}><Logo /></Link>
          <button ref={closeButtonRef} type="button" className="inline-flex h-10 w-10 items-center justify-center border border-white/25 text-white" aria-label="Close navigation menu" onClick={closeMenu}>
            <X size={21} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-6" aria-label="Mobile navigation">
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/how-to-play" onClick={closeMenu}>How to play</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/leaderboard" onClick={closeMenu}>Leaderboard</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/profile" onClick={closeMenu}>Profile</Link>
          <Link className="font-podium text-4xl uppercase tracking-tight text-white transition hover:text-white/55" to="/#about" onClick={closeMenu}>About</Link>
          <Link className="mt-3 inline-flex w-fit items-center gap-3 border border-white/45 px-5 py-4 font-inter text-sm font-bold uppercase tracking-[0.2em] transition hover:bg-white hover:text-black" to="/setup" onClick={closeMenu}>Play now <ArrowUpRight size={18} /></Link>
        </nav>
        <div className="flex items-center justify-between font-inter text-[0.62rem] uppercase tracking-[0.2em] text-white/35">
          <span>Chip Bite Challenge</span>
          <span>Camera stays local</span>
        </div>
      </div>
    </div>

    <main className="relative z-10"><Outlet /></main>
    {!immersiveGame && <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--header-bg)] px-6 py-10 sm:px-10 lg:px-16"><div className="mx-auto grid max-w-[1600px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><Logo /><p className="mt-5 max-w-xs font-inter text-sm leading-6 text-white/45">A cinematic, camera-powered arcade challenge built for quick rounds, loud reactions, and one more try.</p></div><div><div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/35">Explore</div><div className="mt-4 space-y-3 font-inter text-sm text-white/60"><Link className="block hover:text-white" to="/how-to-play">How to play</Link><Link className="block hover:text-white" to="/leaderboard">Leaderboard</Link><Link className="block hover:text-white" to="/profile">Player profile</Link></div></div><div><div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/35">Enter the arena</div><div className="mt-4 space-y-3 font-inter text-sm text-white/60"><Link className="block hover:text-white" to="/setup">Start a round</Link><Link className="block hover:text-white" to="/setup">Camera setup</Link><Link className="block hover:text-white" to="/admin">Operator console</Link></div></div><div><div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/35">Privacy</div><p className="mt-4 font-inter text-sm leading-6 text-white/45">Face landmarks and camera frames stay in your browser. Only completed result summaries can be sent to the configured API.</p></div></div><div className="mx-auto mt-10 flex max-w-[1600px] flex-col gap-2 border-t border-[var(--border-subtle)] pt-5 font-inter text-[0.62rem] uppercase tracking-[0.16em] text-white/30 sm:flex-row sm:justify-between"><span>Chip Bite Challenge · 45-second arcade rounds</span><span>Built for fast, friendly competition</span></div></footer>}
  </div>;
}
