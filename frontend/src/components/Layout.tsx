import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { KrmuBranding } from './KrmuBranding';
import { gameStore, useGameStore } from '../store/gameStore';

const backgroundVideo = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4';
const primaryItems = [
  { to: '/how-to-play', label: 'How to play' },
  { to: '/photograph', label: 'Photograph' },
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncVideo = () => {
      if (query.matches) videoRef.current?.pause();
      else void videoRef.current?.play().catch(() => undefined);
    };
    syncVideo();
    query.addEventListener?.('change', syncVideo);
    return () => query.removeEventListener?.('change', syncVideo);
  }, []);

  if (location.pathname === '/') return <main><Outlet /></main>;
  const closeMenu = () => {
    setMenuOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  const isLight = settings.theme === 'light';

  return (
    <div className="cinematic-shell relative min-h-[100svh] overflow-hidden bg-[#faf8f5] text-[#231f1c] dark:bg-[#090817] dark:text-white transition-colors duration-200">
      {/* Background cinematic video */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 h-full min-h-full w-full object-cover opacity-20 dark:opacity-10 transition-opacity duration-300"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Layered overlays for internal pages */}
      <div className="pointer-events-none absolute inset-0 bg-[#faf8f5]/65 dark:bg-[#090817]/70" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#faf8f5]/40 to-[#faf8f5]/90 dark:from-transparent dark:via-black/25 dark:to-black/85" aria-hidden="true" />

      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[#231f1c]/10 bg-[#faf8f5]/85 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-black/40 sm:px-10 lg:px-16 lg:py-6 transition-colors duration-200">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link to="/" aria-label="Go to Chip Bite Challenge home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {primaryItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? 'text-[#231f1c] dark:text-white font-bold'
                      : 'text-[#5c534c] hover:text-[#231f1c] dark:text-white/55 dark:hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {secondaryItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-inter text-[0.67rem] font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? 'text-[#231f1c] dark:text-white font-bold'
                      : 'text-[#5c534c] hover:text-[#231f1c] dark:text-white/55 dark:hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              className="group ml-2 inline-flex items-center gap-3 border border-[#231f1c]/25 bg-transparent px-4 py-3 font-inter text-[0.67rem] font-bold uppercase tracking-[0.2em] text-[#231f1c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#231f1c] hover:bg-[#231f1c] hover:text-[#faf8f5] dark:border-white/35 dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
              to="/setup"
            >
              Play now <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <div className="flex items-center gap-3 border-l border-[#231f1c]/15 pl-5 dark:border-white/15">
              <button
                className="text-[#5c534c] hover:text-[#231f1c] dark:text-white/65 dark:hover:text-white transition"
                aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => gameStore.toggleTheme()}
              >
                {isLight ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              <button
                className="text-[#5c534c] hover:text-[#231f1c] dark:text-white/65 dark:hover:text-white transition"
                aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
                onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}
              >
                {settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
            </div>
          </nav>
          <div className="flex items-center gap-3 md:hidden">
            <button
              className="text-[#5c534c] hover:text-[#231f1c] dark:text-white/70 dark:hover:text-white transition"
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              onClick={() => gameStore.toggleTheme()}
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="text-[#5c534c] hover:text-[#231f1c] dark:text-white/70 dark:hover:text-white transition"
              aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
              onClick={() => gameStore.updateSettings({ soundEnabled: !settings.soundEnabled })}
            >
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-[#231f1c]/20 text-[#231f1c] transition hover:bg-[#231f1c] hover:text-[#faf8f5] dark:border-white/25 dark:text-white dark:hover:bg-white dark:hover:text-black"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={`fixed inset-0 z-50 bg-[#faf8f5]/98 text-[#231f1c] backdrop-blur-md transition-[opacity,visibility] duration-500 dark:bg-black/95 dark:text-white md:hidden ${menuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col px-6 py-5 sm:px-10">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Go home" onClick={closeMenu}>
              <Logo />
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-[#231f1c]/20 text-[#231f1c] transition hover:bg-[#231f1c] hover:text-[#faf8f5] dark:border-white/25 dark:text-white dark:hover:bg-white dark:hover:text-black"
              aria-label="Close navigation menu"
              onClick={closeMenu}
            >
              <X size={21} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-6" aria-label="Mobile navigation">
            <Link className="font-podium text-4xl uppercase tracking-tight text-[#231f1c] transition hover:text-[#231f1c]/60 dark:text-white dark:hover:text-white/55" to="/how-to-play" onClick={closeMenu}>
              How to play
            </Link>
            <Link className="font-podium text-4xl uppercase tracking-tight text-[#231f1c] transition hover:text-[#231f1c]/60 dark:text-white dark:hover:text-white/55" to="/photograph" onClick={closeMenu}>
              Photograph Studio
            </Link>
            <Link className="font-podium text-4xl uppercase tracking-tight text-[#231f1c] transition hover:text-[#231f1c]/60 dark:text-white dark:hover:text-white/55" to="/leaderboard" onClick={closeMenu}>
              Leaderboard
            </Link>
            <Link className="font-podium text-4xl uppercase tracking-tight text-[#231f1c] transition hover:text-[#231f1c]/60 dark:text-white dark:hover:text-white/55" to="/profile" onClick={closeMenu}>
              Profile
            </Link>
            <Link className="font-podium text-4xl uppercase tracking-tight text-[#231f1c] transition hover:text-[#231f1c]/60 dark:text-white dark:hover:text-white/55" to="/admin" onClick={closeMenu}>
              Operator
            </Link>
            <Link className="mt-3 inline-flex w-fit items-center gap-3 border border-[#231f1c]/35 px-5 py-4 font-inter text-sm font-bold uppercase tracking-[0.2em] text-[#231f1c] transition hover:bg-[#231f1c] hover:text-[#faf8f5] dark:border-white/45 dark:text-white dark:hover:bg-white dark:hover:text-black" to="/setup" onClick={closeMenu}>
              Play now <ArrowUpRight size={18} />
            </Link>
          </nav>
          <div className="flex items-center justify-between font-inter text-[0.62rem] uppercase tracking-[0.2em] text-[#8c827a] dark:text-white/35">
            <span>KRMU · Centre of Excellence in AI</span>
            <span>Camera stays local</span>
          </div>
        </div>
      </div>

      <main className="relative z-10">
        <Outlet />
      </main>

      {!immersiveGame && (
        <footer className="relative z-10 border-t border-[#dcd4cb] bg-[#ede6de]/80 backdrop-blur-md px-6 py-10 dark:border-white/10 dark:bg-black/60 sm:px-10 lg:px-16 transition-colors duration-200">
          <div className="mx-auto grid max-w-[1600px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-xs font-inter text-sm leading-6 text-[#5c534c] dark:text-white/45">
                A cinematic, camera-powered arcade challenge built for quick rounds, loud reactions, and one more try.
              </p>
              <div className="mt-6">
                <KrmuBranding variant="footer" />
              </div>
            </div>
            <div>
              <div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#8c827a] dark:text-white/35">Explore</div>
              <div className="mt-4 space-y-3 font-inter text-sm text-[#5c534c] dark:text-white/60">
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/how-to-play">How to play</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/photograph">Photograph Studio</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/leaderboard">Leaderboard</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/profile">Player profile</Link>
              </div>
            </div>
            <div>
              <div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#8c827a] dark:text-white/35">Enter the arena</div>
              <div className="mt-4 space-y-3 font-inter text-sm text-[#5c534c] dark:text-white/60">
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/setup">Start a round</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/photograph">Photo booth</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/setup">Camera setup</Link>
                <Link className="block hover:text-[#231f1c] dark:hover:text-white transition" to="/admin">Operator console</Link>
              </div>
            </div>
            <div>
              <div className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#8c827a] dark:text-white/35">Privacy & Security</div>
              <p className="mt-4 font-inter text-sm leading-6 text-[#5c534c] dark:text-white/45">
                Face landmarks and camera frames stay in your browser. Target validation ensures only the primary player is tracked.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-[1600px] flex-col gap-2 border-t border-[#dcd4cb] pt-5 font-inter text-[0.62rem] uppercase tracking-[0.16em] text-[#8c827a] dark:border-white/10 dark:text-white/30 sm:flex-row sm:justify-between">
            <span>Chip Bite Challenge · K.R. Mangalam University · Centre of Excellence in AI</span>
            <span>Built for fast, friendly competition</span>
          </div>
        </footer>
      )}
    </div>
  );
}
