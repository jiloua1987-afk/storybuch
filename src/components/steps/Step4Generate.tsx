"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";

const STEPS = [
  { label: "Geschichte wird analysiert…",       progress: 10 },
  { label: "Comic-Struktur wird erstellt…",      progress: 25 },
  { label: "Seite 1 wird illustriert…",          progress: 40 },
  { label: "Seite 2 wird illustriert…",          progress: 55 },
  { label: "Seite 3 wird illustriert…",          progress: 70 },
  { label: "Seite 4 wird illustriert…",          progress: 85 },
  { label: "Comic wird finalisiert…",            progress: 95 },
  { label: "Dein Comic ist fertig!",             progress: 100 },
];

export default function Step4Generate() {
  const { setStep, project, updateProject, setGenerationProgress } = useBookStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => { runGeneration(); }, []);

  async function runGeneration() {
    try {
      setGenerationProgress(STEPS[0].progress, STEPS[0].label);
      setStepIndex(0);
      setDebugInfo("Verbinde mit API…");

      const res = await fetch("/api/generate/comic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyInput:        project?.storyInput || "",
          guidedAnswers:     project?.guidedAnswers || {},
          tone:              project?.tone || "humorvoll",
          comicStyle:        project?.comicStyle || "emotional",
          mustHaveSentences: project?.mustHaveSentences || "",
          language:          project?.language || "de",
          illustrationStyle: project?.illustrationStyle || "comic",
          characters:        project?.characters || [],
          numPages:          4,
        }),
      });

      setGenerationProgress(STEPS[1].progress, STEPS[1].label);
      setStepIndex(1);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`API Fehler ${res.status}: ${err.error || res.statusText}`);
      }

      const data = await res.json();
      const pages = data.pages || [];

      if (!pages.length) throw new Error("Keine Seiten generiert. Bitte nochmal versuchen.");

      setDebugInfo(`${pages.length} Seiten generiert`);

      // Update progress per page
      pages.forEach((_: any, i: number) => {
        const s = STEPS[2 + i] || STEPS[STEPS.length - 2];
        setGenerationProgress(s.progress, s.label);
        setStepIndex(2 + i);
      });

      // Map pages to chapters format for existing preview
      const chapters = pages.map((p: any) => ({
        id: p.id || `page-${p.pageNumber}`,
        title: p.title || `Seite ${p.pageNumber}`,
        content: p.panels?.map((panel: any) => panel.dialog || "").filter(Boolean).join(" ") || "",
        imageUrl: p.imageUrl,
        imagePrompt: "",
        panels: p.panels || [],
      }));

      updateProject({
        id: project?.id || `proj-${Date.now()}`,
        title: project?.title || "Mein Comic",
        storyInput: project?.storyInput || "",
        guidedAnswers: project?.guidedAnswers || { characters: "", location: "", timeframe: "", specialMoments: "" },
        tone: project?.tone || "humorvoll",
        design: "kinderbuch",
        characters: project?.characters || [],
        chapters,
        status: "preview",
        createdAt: project?.createdAt || new Date().toISOString(),
      });

      setGenerationProgress(100, "Dein Comic ist fertig!");
      setStepIndex(STEPS.length - 1);
      setDone(true);
      setTimeout(() => setStep(4), 1200);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unbekannter Fehler");
    }
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-16">
        <div className="text-5xl">⚠️</div>
        <h2 className="font-display text-2xl text-[#1f1a2e]">Fehler bei der Generierung</h2>
        <p className="text-gray-500 text-sm bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
        <button
          onClick={() => { setError(null); runGeneration(); }}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors"
        >
          Nochmal versuchen
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center space-y-10 py-10"
    >
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-semibold text-[#1f1a2e]">
          Dein Comic wird erstellt
        </h2>
        <p className="text-gray-500">Das dauert ca. 1–2 Minuten – wir illustrieren jede Seite einzeln.</p>
      </div>

      <motion.div
        animate={{ rotate: done ? 0 : [0, -3, 3, -3, 0] }}
        transition={{ repeat: done ? 0 : Infinity, duration: 2.5 }}
        className="text-7xl mx-auto"
      >
        {done ? "🎉" : "🎨"}
      </motion.div>

      <ProgressBar progress={useBookStore.getState().generationProgress} status={useBookStore.getState().generationStatus} />

      <div className="space-y-2 text-left">
        {STEPS.map((s, i) => (
          i <= stepIndex && (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-3 text-sm ${i === stepIndex ? "text-purple-700 font-medium" : "text-gray-400"}`}
            >
              <span className="w-4 text-center">{i < stepIndex ? "✓" : "·"}</span>
              <span>{s.label}</span>
            </motion.div>
          )
        ))}
      </div>

      {debugInfo && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-600">
          {debugInfo}
        </div>
      )}

      {done && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-purple-600 font-medium">
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
