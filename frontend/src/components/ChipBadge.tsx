import type { ChipKind } from '../types';

const chipStyles: Record<ChipKind, string> = {
  normal: 'bg-[#eeb24b] text-ink', golden: 'bg-[#ffd96a] text-ink', speed: 'bg-cyan text-ink', frozen: 'bg-sky-200 text-ink', combo: 'bg-violet text-white', bomb: 'bg-[#19151d] text-white', mystery: 'bg-lime-300 text-ink',
};
const chipLabels: Record<ChipKind, string> = { normal: 'BITE', golden: 'GOLD', speed: '2X', frozen: 'ICE', combo: 'COMBO', bomb: '!', mystery: '?' };

export function ChipBadge({ kind, size = 'md' }: { kind: ChipKind; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-10 w-12 text-[0.5rem]' : size === 'lg' ? 'h-24 w-28 text-sm' : 'h-16 w-20 text-[0.58rem]';
  return <div className={`relative flex rotate-[-6deg] items-center justify-center border-2 border-white/40 font-black shadow-lg ${chipStyles[kind]} ${sizeClass}`} style={{ clipPath: 'polygon(12% 22%, 31% 9%, 51% 14%, 72% 7%, 91% 26%, 84% 48%, 94% 70%, 72% 91%, 51% 84%, 29% 94%, 9% 73%, 16% 49%)' }} aria-label={`${kind} chip`}>
    <span className="relative z-10">{chipLabels[kind]}</span>
    {kind !== 'bomb' && <><span className="absolute left-[24%] top-[22%] h-2 w-5 rounded-full bg-white/35 blur-[1px]" /><span className="absolute bottom-[20%] right-[22%] h-1.5 w-1.5 rounded-full bg-[#8c511f]/50" /></>}
    {kind === 'bomb' && <span className="absolute -right-1 -top-2 h-4 w-2 rotate-45 rounded-full bg-gold" />}
  </div>;
}
