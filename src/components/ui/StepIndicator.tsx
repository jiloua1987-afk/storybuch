"use client";
import { motion } from "framer-motion";
import { clsx } from "clsx";

const STEPS = [
  { label: "Geschichte", icon: "✍️" },
  { label: "Bilder", icon: "📸" },
  { label: "Stil", icon: "🎨" },
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
                    ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-200"
                    : done
                    ? "bg-brand-100 border-brand-300 text-brand-600"
                    : "bg-white border-gray-200 text-gray-400"
                )}
              >
                {done ? "✓" : step.icon}
              </div>
              <span className={clsx("text-xs font-medium hidden md:block", active ? "text-brand-700" : "text-gray-500")}>
                {step.label}
              </span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  "w-6 md:w-10 h-0.5 mx-1 transition-all",
                  i < currentStep ? "bg-brand-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
