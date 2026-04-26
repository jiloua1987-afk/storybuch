"use client";
import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  status?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, status, showLabel = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-2 text-sm text-[#8B7355]">
          <span>{status || "Wird erstellt…"}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-[#E8D9C0] rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#C9963A]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
