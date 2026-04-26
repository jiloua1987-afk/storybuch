"use client";
import { motion } from "framer-motion";
import { clsx } from "clsx";

const STEPS = [
  { label: "Geschichte", icon: "✍️" },
  { label: "Bilder", icon: "📸" },
  { label: "Widmung", icon: "💌" },
  { label: "Generieren", icon: "✨" },
  { label: "Vorschau", icon: "📖" },
  { label: "Bestellen", icon: "🚀" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: active ? 1.1 : 1 }}
              className={clsx(
                "flex flex-col items-center gap-1 cursor-default",
                active ? "opacity-100" : done ? "opacity-80" : "opacity-40"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all",
                  active
                    ? "bg-[#1A1410] border-[#1A1410] text-white"
                    : done
                    ? "bg-[#C9963A] border-[#C9963A] text-white"
                    : "bg-white border-[#E8D9C0] text-[#B8A89A]"
                )}
              >
                {done ? "✓" : step.icon}
              </div>
              <span className={clsx("text-xs font-medium hidden md:block", active ? "text-[#1A1410]" : "text-[#8B7355]")}>
                {step.label}
              </span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  "w-6 md:w-10 h-0.5 mx-1 transition-all",
                  i < currentStep ? "bg-[#C9963A]" : "bg-[#E8D9C0]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
