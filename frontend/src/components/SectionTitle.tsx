export function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return <div className="mb-8 max-w-3xl border-l border-white/30 pl-5 sm:pl-7">
    <div className="eyebrow">{eyebrow}</div>
    <h2 className="font-podium mt-3 text-4xl uppercase leading-[.95] tracking-[-.025em] text-white sm:text-6xl">{title}</h2>
    {detail && <p className="mt-4 max-w-2xl font-inter text-sm leading-7 text-white/55 sm:text-base">{detail}</p>}
  </div>;
}
