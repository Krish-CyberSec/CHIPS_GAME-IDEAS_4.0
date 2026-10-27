import { Zap } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Chip Bite Challenge">
      <div className="flex h-10 w-10 items-center justify-center border border-[#231f1c]/20 bg-[#231f1c]/5 text-[#d97746] dark:border-white/35 dark:bg-white/10 dark:text-white transition-colors duration-200">
        <Zap size={19} strokeWidth={2.3} />
      </div>
      {!compact && (
        <div className="font-podium text-xl font-bold uppercase leading-none tracking-[0.08em] text-[#231f1c] dark:text-white transition-colors duration-200 sm:text-2xl">
          Chip Bite <span className="text-[#8c827a] dark:text-white/50">Challenge</span>
        </div>
      )}
    </div>
  );
}
