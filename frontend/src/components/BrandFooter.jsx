export const LogoMark = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    <path d="M6 24c5-8 11-12 18-12s13 4 18 12c-5 8-11 12-18 12S11 32 6 24Z" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M24 20.5v3.5l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const BrandFooter = () => (
  <footer
    data-testid="brand-footer"
    dir="ltr"
    className="fixed bottom-0 inset-x-0 z-50 h-11 flex items-center justify-center gap-3 border-t border-white/10 bg-[#08090B]/90 backdrop-blur-md"
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C0C7D0]/50 to-transparent" />
    <LogoMark className="w-5 h-5 text-[#C0C7D0]" />
    <span data-testid="brand-footer-logo" className="font-brand font-bold tracking-[0.45em] text-sm sm:text-base silver-text select-none">
      THE UNKNOWN
    </span>
  </footer>
);
