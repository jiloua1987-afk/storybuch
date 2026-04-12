"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";

export default function Step4Generate() {
  const { setStep, project, updateProject } = useBookStore();
  const [stepLabel, setStepLabel] = useState("Wird vorbereitet…");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; done: boolean }[]>([]);
  const stateRef = useRef<{
    pages: any[];
    characters: any[];
    coverImageUrl: string;
    chapters: any[];
  }>({ pages: [], characters: [], coverImageUrl: "", chapters: [] });

  useEffect(() => { runGeneration(); }, []);

  function addLog(text: string, isDone = false) {
    setLog((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.done && last.text.startsWith(text.split(":")[0])) {
        return [...prev.slice(0, -1), { text, done: isDone }];
      }
      return [...prev, { text, done: isDone }];
    });
  }

  async function runGeneration() {
    try {
      addLog("Verbinde mit Server…");

      const res = await fetch("/api/generate/comic-stream", {
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
          category:          project?.guidedAnswers?.category || "familie",
          numPages:          4,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const eventMatch = part.match(/^event: (.+)$/m);
          const dataMatch = part.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          switch (event) {
            case "progress":
              setStepLabel(data.label);
              setProgress(data.progress);
              addLog(data.label, data.step?.endsWith("_done") || data.step?.endsWith("_error"));
              break;

            case "structure":
              stateRef.current.pages = data.pages;
              stateRef.current.characters = data.characters;
              break;

            case "cover":
              stateRef.current.coverImageUrl = data.coverImageUrl || "";
              // Update project with cover immediately
              updateProject({ coverImageUrl: data.coverImageUrl || undefined });
              break;

            case "page": {
              const chapter = {
                id: data.pageId || `page-${data.pageIndex}`,
                title: data.title,
                content: "",
                imageUrl: data.imageUrl || "",
                imagePrompt: "",
              };
              stateRef.current.chapters[data.pageIndex] = chapter;

              // Update project chapters progressively
              const currentChapters = [...stateRef.current.chapters].filter(Boolean);
              updateProject({ chapters: currentChapters });
              addLog(`Seite ${data.pageIndex + 1}: "${data.title}"`, true);
              break;
            }

            case "done":
              // Final update
              updateProject({
                id: project?.id || `proj-${Date.now()}`,
                title: project?.title || "Mein Comic",
                storyInput: project?.storyInput || "",
                guidedAnswers: project?.guidedAnswers || { characters: "", location: "", timeframe: "", specialMoments: "" },
                tone: project?.tone || "humorvoll",
                design: "kinderbuch",
                characters: stateRef.current.characters.map((c: any, i: number) => ({
                  id: `c${i}`, name: c.name, role: "Hauptfigur",
                })),
                chapters: stateRef.current.chapters.filter(Boolean),
                coverImageUrl: stateRef.current.coverImageUrl || undefined,
                status: "preview",
                createdAt: project?.createdAt || new Date().toISOString(),
              });
              setProgress(100);
              setStepLabel("Dein Comic ist fertig!");
              setDone(true);
              setTimeout(() => setStep(4), 1200);
              break;

            case "error":
              throw new Error(data.message);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-16">
        <div className="text-5xl">⚠️</div>
        <h2 className="font-display text-2xl text-[#1f1a2e]">Fehler bei der Generierung</h2>
        <p className="text-sm bg-red-50 border border-red-100 rounded-xl p-4 text-red-700">{error}</p>
        <button onClick={() => { setError(null); runGeneration(); }}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors">
          Nochmal versuchen
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center space-y-8 py-10">
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-semibold text-[#1f1a2e]">Dein Comic wird erstellt</h2>
        <p className="text-gray-500 text-sm">Jede Seite wird einzeln illustriert – ca. 2–3 Minuten.</p>
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
              className={`flex items-center gap-2 text-sm ${entry.done ? "text-gray-400" : "text-purple-700 font-medium"}`}>
              <span className="w-4 text-center flex-shrink-0">{entry.done ? "✓" : "·"}</span>
              <span>{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-purple-600 font-medium">
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
