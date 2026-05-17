"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePosterStore } from "@/store/posterStore";
import ProgressBar from "@/components/ui/ProgressBar";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || "";

export default function PosterStep3Generate() {
  const { setStep, project, updateProject } = usePosterStore();
  const [stepLabel, setStepLabel] = useState("Wird vorbereitet…");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; done: boolean }[]>([]);
  const running = useRef(false);

  useEffect(() => {
    if (!running.current) { running.current = true; runGeneration(); }
  }, []);

  function addLog(text: string, isDone = false) {
    setLog((prev) => [...prev, { text, done: isDone }]);
  }

  async function post(path: string, body: object): Promise<any> {
    const url = RAILWAY_URL ? `${RAILWAY_URL}${path}` : path;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function runGeneration() {
    if (!project) { setError("Kein Projekt gefunden."); return; }

    try {
      // Step 1: Charaktere beschreiben
      setStepLabel("Charaktere werden analysiert…");
      setProgress(10);
      addLog("Charaktere werden analysiert…");

      const charNames = project.characters.map(c => c.name);
      const { characters } = await post("/api/poster/describe-characters", {
        characterNames: charNames,
        referenceImageUrls: project.referenceImageUrls,
        referenceImages: project.referenceImages,
      });
      addLog(`${characters.length} Charaktere erkannt`, true);
      setProgress(25);

      // Step 2: Struktur generieren
      setStepLabel("Szene wird geplant…");
      addLog("Szene wird geplant…");

      const structure = await post("/api/poster/structure", {
        moment: project.moment,
        characters,
        language: project.language || "de",
        tone: "humorvoll",
        comicStyle: project.comicStyle,
        category: project.category,
      });
      addLog(`${structure.panels?.length || 2} Panels geplant`, true);
      setProgress(45);

      // Step 3: Bild generieren
      setStepLabel("Poster wird illustriert…");
      addLog("Poster wird illustriert… (ca. 60 Sekunden)");

      const result = await post("/api/poster/generate", {
        structure,
        characters,
        comicStyle: project.comicStyle,
        referenceImages: project.referenceImages,
        referenceImageUrls: project.referenceImageUrls,
        projectId: project.id,
        orientation: project.orientation,
      });

      addLog("Poster fertig!", true);
      setProgress(100);

      updateProject({
        imageUrl: result.imageUrl,
        panels: result.panels || structure.panels,
        title: project.title || structure.title,
        characters,
        status: "preview",
      });

      setStepLabel("Dein Poster ist fertig!");
      setDone(true);
      setTimeout(() => setStep(3), 1200);

    } catch (err: any) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-16">
        <div className="text-5xl">⚠️</div>
        <h2 className="font-display text-2xl text-gray-900">Fehler bei der Generierung</h2>
        <p className="text-sm bg-red-50 border border-red-100 rounded-xl p-4 text-red-700">{error}</p>
        <button onClick={() => { setError(null); running.current = false; runGeneration(); }}
          className="bg-brand-600 text-white px-6 py-3 rounded-xl hover:bg-brand-700 transition-colors">
          Nochmal versuchen
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center space-y-8 py-10">
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-semibold text-gray-900">Dein Poster wird erstellt</h2>
        <p className="text-gray-600 text-sm">Charaktere analysieren, Szene planen, illustrieren — ca. 90 Sekunden.</p>
      </div>

      <motion.div animate={{ rotate: done ? 0 : [0, -3, 3, -3, 0] }}
        transition={{ repeat: done ? 0 : Infinity, duration: 2.5 }} className="text-7xl">
        {done ? "🎉" : "🎨"}
      </motion.div>

      <ProgressBar progress={progress} status={stepLabel} />

      <div className="space-y-1.5 text-left max-h-48 overflow-y-auto">
        <AnimatePresence>
          {log.map((entry, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 text-sm ${entry.done ? "text-gray-400" : "text-gray-900 font-medium"}`}>
              <span className="w-4 text-center flex-shrink-0">{entry.done ? "✓" : "·"}</span>
              <span>{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-brand-500 font-medium">
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
