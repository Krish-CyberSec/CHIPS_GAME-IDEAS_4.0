import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className="arcade-card max-h-[90vh] w-full max-w-xl overflow-y-auto bg-panel p-6 shadow-violet">
      <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-bold">{title}</h2><button className="arcade-icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
      <div className="mt-5">{children}</div>
    </div>
  </div>;
}
