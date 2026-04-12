"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";

export default function Step4Generate() {
  const { setStep, project, updateProject, setGenerationProgress } = useBookStore();
  const [stepLabel, setStepLabel] = useState("Wird vorbereitet…");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; done: boolean }[]>([]);

  useEffect(() => { runGeneration(); }, []);

  function addLog(text: string, done = false) {
    setLog((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.done) return [...prev.slice(0, -1), { text, done }];
      return [...prev, { text, done }];
    });
  }

  async function runGeneration() {
    try {
      // Step 1: Story-Struktur
      setStepLabel("Geschichte wird analysiert…");
      setProgress(8);
      addLog("Geschichte wird analysiert…");

      const structRes = await fetch("/api/generate/comic-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyInput:        project?.storyInput || "",
          guidedAnswers:     project?.guidedAnswers || {},
          tone:              project?.tone || "humorvoll",
          comicStyle:        project?.comicStyle || "emotional",
          mustHaveSentences: project?.mustHaveSentences || "",
          language:          project?.language || "de",
          category:          project?.guidedAnswers?.category || "familie",
          numPages:          4,
        }),
      });

      if (!structRes.ok) {
        const e = await structRes.json().catch(() => ({}));
        throw new Error(`Struktur-Fehler: ${e.error || structRes.statusText}`);
      }

      const { pages, characters } = await structRes.json();
      if (!pages?.length) throw new Error("Keine Seiten generiert.");

      addLog(`${pages.length} Seiten geplant`, true);
      setProgress(15);

      // Step 2: Cover
      setStepLabel("Cover wird erstellt…");
      addLog("Cover wird erstellt…");
      setProgress(20);

      let coverImageUrl = "";
      try {
        const coverRes = await fetch("/api/generate/comic-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:            project?.title || "Mein Comic",
            characters,
            category:         project?.guidedAnswers?.category || "familie",
            illustrationStyle: project?.illustrationStyle || "comic",
            location:         project?.guidedAnswers?.ort || project?.guidedAnswers?.location || "",
          }),
        });
        if (coverRes.ok) {
          const d = await coverRes.json();
          coverImageUrl = d.coverImageUrl || "";
        }
      } catch { /* Cover optional */ }

      addLog("Cover erstellt", true);
      setProgress(25);

      // Step 3: Seiten einzeln generieren
      const generatedPages: any[] = [];
      const progressPerPage = 70 / pages.length;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setStepLabel(`Seite ${i + 1} von ${pages.length} wird illustriert…`);
        addLog(`Seite ${i + 1}: "${page.title}"…`);

        try {
          const pageRes = await fetch("/api/generate/comic-page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page,
              characters,
              illustrationStyle: project?.illustrationStyle || "comic",
              comicStyle:        project?.comicStyle || "emotional",
              category:          project?.guidedAnswers?.category || "familie",
            }),
          });

          const pageData = pageRes.ok ? await pageRes.json() : {};
          generatedPages.push({ ...page, imageUrl: pageData.imageUrl || "" });
          addLog(`Seite ${i + 1}: "${page.title}"`, true);
        } catch {
          generatedPages.push({ ...page, imageUrl: "" });
          addLog(`Seite ${i + 1}: Fehler – übersprungen`, true);
        }

        setProgress(25 + (i + 1) * progressPerPage);
      }

      // Finalisieren
      setStepLabel("Comic wird finalisiert…");
      setProgress(98);

      const chapters = generatedPages.map((p: any) => ({
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
        characters: characters.map((c: any, i: number) => ({ id: `c${i}`, name: c.name, role: "Hauptfigur" })),
        chapters,
        coverImageUrl: coverImageUrl || undefined,
        status: "preview",
        createdAt: project?.createdAt || new Date().toISOString(),
      });

      setProgress(100);
      setStepLabel("Dein Comic ist fertig!");
      addLog("Comic fertig!", true);
      setDone(true);
      setTimeout(() => setStep(4), 1200);

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
        <p className="text-gray-500 text-sm">Jede Seite wird einzeln illustriert – das dauert ca. 2–3 Minuten.</p>
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
