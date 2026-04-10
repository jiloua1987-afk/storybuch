"use client";
import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0–100
  status?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, status, showLabel = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-2 text-sm text-brand-700">
          <span>{status || "Wird erstellt…"}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-brand-100 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-warm-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
