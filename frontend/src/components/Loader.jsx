import { LogoMark } from "@/components/BrandFooter";

export const Loader = () => (
  <div data-testid="app-loader" className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#C0C7D0]">
    <LogoMark className="w-12 h-12 flicker" />
    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#C0C7D0] to-transparent animate-pulse" />
  </div>
);
