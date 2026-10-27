interface KrmuBrandingProps {
  variant?: 'header' | 'hero' | 'footer' | 'photo';
  className?: string;
}

export function KrmuBranding({ variant = 'header', className = '' }: KrmuBrandingProps) {
  if (variant === 'photo') {
    return (
      <div className={`flex items-center justify-between gap-4 px-4 py-2 ${className}`}>
        <div className="flex items-center gap-3">
          <img
            src="/krmu-logo.png"
            alt="K.R. Mangalam University"
            className="h-9 w-auto max-w-[160px] object-contain drop-shadow"
          />
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/krmu-coe-logo.png"
            alt="Centre of Excellence in AI"
            className="h-10 w-auto max-w-[120px] object-contain drop-shadow"
          />
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`inline-flex flex-wrap items-center gap-4 border border-[#231f1c]/10 bg-[#231f1c]/[0.03] px-4 py-2 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.04] ${className}`}>
        <span className="font-inter text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#8c827a] dark:text-white/45">
          In partnership with
        </span>
        <div className="flex items-center gap-3.5">
          <img
            src="/krmu-logo.png"
            alt="K.R. Mangalam University"
            className="h-6 w-auto max-w-[140px] object-contain opacity-90 transition-opacity hover:opacity-100 dark:brightness-110"
          />
          <span className="h-4 w-px bg-[#231f1c]/15 dark:bg-white/20" />
          <img
            src="/krmu-coe-logo.png"
            alt="Centre of Excellence in AI"
            className="h-6 w-auto max-w-[90px] object-contain opacity-90 transition-opacity hover:opacity-100 dark:brightness-110"
          />
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="font-inter text-[.62rem] font-bold uppercase tracking-[.2em] text-[#8c827a] dark:text-white/35">
          Academic & Innovation Partner
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <a
            href="https://krmangalam.edu.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-opacity hover:opacity-85"
            aria-label="K.R. Mangalam University"
          >
            <img
              src="/krmu-logo.png"
              alt="K.R. Mangalam University - NAAC A Accredited"
              className="h-8 w-auto max-w-[160px] object-contain dark:brightness-110"
            />
          </a>
          <span className="h-6 w-px bg-[#231f1c]/15 dark:bg-white/20" />
          <div className="flex items-center gap-2">
            <img
              src="/krmu-coe-logo.png"
              alt="Centre of Excellence in Artificial Intelligence"
              className="h-8 w-auto max-w-[100px] object-contain dark:brightness-110"
            />
            <div className="font-inter text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.14em] text-[#5c534c] dark:text-white/60">
              Centre of<br />Excellence in AI
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Header variant
  return (
    <div className={`hidden sm:flex items-center gap-3 border-l border-[#231f1c]/15 pl-4 dark:border-white/15 ${className}`}>
      <img
        src="/krmu-logo.png"
        alt="K.R. Mangalam University"
        className="h-6 w-auto max-w-[130px] object-contain opacity-85 transition-opacity hover:opacity-100 dark:brightness-110"
      />
      <span className="h-3.5 w-px bg-[#231f1c]/15 dark:bg-white/20" />
      <img
        src="/krmu-coe-logo.png"
        alt="Centre of Excellence in AI"
        className="h-6 w-auto max-w-[80px] object-contain opacity-85 transition-opacity hover:opacity-100 dark:brightness-110"
      />
    </div>
  );
}
