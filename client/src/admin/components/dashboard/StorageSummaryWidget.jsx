import { HardDrive, Cloud, FileImage, Cpu, Wifi } from "lucide-react";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";

export function StorageSummaryWidget({ data, isLoading = false, isError = false }) {
  if (isLoading) {
    return <SkeletonWidget height="h-48" />;
  }

  if (isError) {
    return <EmptyWidget title="Storage Metrics Unavailable" message="Could not fetch Cloudflare R2 storage usage statistics." />;
  }

  const storage = data || {
    totalUsed: "—",
    imagesStored: "—",
    avgImageSize: "—",
    bandwidth: "—",
    compressionRatio: "—",
  };

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
            Storage & Bandwidth Overview
          </h4>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Cloudflare R2
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Total Used</span>
          </div>
          <span className="text-lg font-bold text-white mt-1 block">{storage.totalUsed}</span>
        </div>

        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-1.5 text-sky-400">
            <FileImage className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Images Stored</span>
          </div>
          <span className="text-lg font-bold text-white mt-1 block">{storage.imagesStored}</span>
        </div>

        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Avg File Size</span>
          </div>
          <span className="text-lg font-bold text-white mt-1 block">{storage.avgImageSize}</span>
        </div>

        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Bandwidth</span>
          </div>
          <span className="text-lg font-bold text-white mt-1 block">{storage.bandwidth}</span>
        </div>

        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-purple-400">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Compression</span>
          </div>
          <span className="text-lg font-bold text-white mt-1 block">{storage.compressionRatio}</span>
        </div>
      </div>
    </div>
  );
}

export default StorageSummaryWidget;
