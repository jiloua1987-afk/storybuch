"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";
import { DUMMY_PROJECT } from "@/lib/dummyData";

const GENERATION_STEPS = [
  { progress: 10, status: "Geschichte wird analysiert…", emoji: "🔍" },
  { progress: 25, status: "Kapitelstruktur wird erstellt…", emoji: "📝" },
  { progress: 40, status: "Texte werden verfasst…", emoji: "✍️" },
  { progress: 55, status: "Illustrationen werden generiert…", emoji: "🎨" },
  { progress: 70, status: "Figuren werden konsistent gestaltet…", emoji: "👥" },
  { progress: 82, status: "Layout wird formatiert…", emoji: "📐" },
  { progress: 92, status: "Titelseite wird erstellt…", emoji: "📚" },
  { progress: 100, status: "Dein Buch ist fertig! 🎉", emoji: "🎉" },
];

export default function Step4Generate() {
  const { setStep, project, updateProject, setGenerationProgress, generationProgress, generationStatus } =
    useBookStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < GENERATION_STEPS.length) {
        const s = GENERATION_STEPS[i];
        setGenerationProgress(s.progress, s.status);
        setStepIndex(i);
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
        // Inject dummy data as "generated" result
        updateProject({
          ...DUMMY_PROJECT,
          id: project?.id || "demo",
          title: project?.title || DUMMY_PROJECT.title,
          tone: project?.tone || DUMMY_PROJECT.tone,
          design: project?.design || DUMMY_PROJECT.design,
          status: "preview",
        });
        setTimeout(() => setStep(4), 1200);
      }
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const currentStep = GENERATION_STEPS[stepIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center space-y-10 py-10"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Dein Buch wird erstellt ✨
        </h2>
        <p className="text-gray-500">Die KI arbeitet gerade an deinem persönlichen Meisterwerk.</p>
      </div>

      {/* Animated book icon */}
      <motion.div
        animate={{ rotate: done ? 0 : [0, -5, 5, -5, 0] }}
        transition={{ repeat: done ? 0 : Infinity, duration: 2 }}
        className="text-8xl mx-auto"
      >
        {done ? "🎉" : currentStep?.emoji || "📖"}
      </motion.div>

      <ProgressBar progress={generationProgress} status={generationStatus} />

      {/* Step list */}
      <div className="space-y-2 text-left">
        {GENERATION_STEPS.map((s, i) => (
          <AnimatePresence key={i}>
            {i <= stepIndex && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 text-sm ${
                  i === stepIndex ? "text-brand-700 font-medium" : "text-gray-400"
                }`}
              >
                <span>{i < stepIndex ? "✅" : i === stepIndex ? "⏳" : "○"}</span>
                <span>{s.status}</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-brand-600 font-semibold text-lg"
        >
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
