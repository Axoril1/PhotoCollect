import { Loader2 } from "lucide-react";

export function PageTransitionLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-8 space-y-3">
      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      <span className="text-xs font-semibold text-slate-400">Loading module...</span>
    </div>
  );
}

export default PageTransitionLoader;
