export function StatCard({ label, value, detail, accent = 'cyan' }: { label: string; value: string | number; detail?: string; accent?: 'cyan' | 'gold' | 'coral' | 'violet' }) {
  const accentClass = { cyan: 'text-cyan', gold: 'text-gold', coral: 'text-coral', violet: 'text-violet' }[accent];
  return <div className="group border border-white/10 bg-black/20 p-5 transition hover:border-white/30 hover:bg-white/[.05]">
    <div className="font-inter text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</div>
    <div className={`font-podium mt-3 text-3xl uppercase tracking-wide ${accentClass}`}>{value}</div>
    {detail && <div className="mt-2 font-inter text-xs leading-5 text-white/45">{detail}</div>}
  </div>;
}
