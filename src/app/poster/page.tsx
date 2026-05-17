"use client";
import { useEffect } from "react";
import { usePosterStore } from "@/store/posterStore";
import Navbar from "@/components/Navbar";
import PosterStep1Basics from "@/components/poster/PosterStep1Basics";
import PosterStep2Moment from "@/components/poster/PosterStep2Moment";
import PosterStep3Generate from "@/components/poster/PosterStep3Generate";
import PosterStep4Preview from "@/components/poster/PosterStep4Preview";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  PosterStep1Basics,
  PosterStep2Moment,
  PosterStep3Generate,
  PosterStep4Preview,
];

const STEP_LABELS = ["Grundlagen", "Moment", "Erstellen", "Vorschau"];

export default function PosterPage() {
  const { currentStep, project, resetProject } = usePosterStore();

  // If stuck on generation step (e.g. previous run failed/aborted), reset to start
  useEffect(() => {
    if (currentStep === 2 && project?.status !== "preview") {
      console.log("Poster: stuck on generation step, resetting...");
      resetProject();
    }
  }, []);

  const StepComponent = STEPS[currentStep] ?? PosterStep1Basics;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === currentStep
                    ? "bg-brand-600 text-white"
                    : i < currentStep
                    ? "bg-brand-100 text-brand-600"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  <span>{i < currentStep ? "✓" : i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-6 h-0.5 ${i < currentStep ? "bg-brand-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
