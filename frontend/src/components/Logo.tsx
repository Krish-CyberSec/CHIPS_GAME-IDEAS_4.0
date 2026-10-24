import { Zap } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3" aria-label="Chip Bite Challenge">
    <div className="flex h-10 w-10 items-center justify-center border border-white/35 bg-white/10 text-white">
      <Zap size={19} strokeWidth={2.3} />
    </div>
    {!compact && <div className="font-podium text-xl font-bold uppercase leading-none tracking-[0.08em] text-white sm:text-2xl">Chip Bite <span className="text-white/50">Challenge</span></div>}
  </div>;
}
