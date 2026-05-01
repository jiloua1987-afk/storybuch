"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  DRY_RUN_DELAY, MOCK_CHARACTERS, MOCK_PAGES,
  MOCK_COVER_URL, getMockPageUrl, MOCK_ENDING,
} from "@/lib/dryRunData";

// Dry-run mode: set NEXT_PUBLIC_DRY_RUN=true to test without API costs
const DRY_RUN = process.env.NEXT_PUBLIC_DRY_RUN === "true";
const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || "";

export default function Step4Generate() {
  const { setStep, project, updateProject } = useBookStore();
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

  async function post(url: string, body: object): Promise<any> {
    // Use Railway for image generation, Vercel for structure
    const fullUrl = url.startsWith("/api/comic") && RAILWAY_URL
      ? `${RAILWAY_URL}${url}`
      : url;
    const res = await fetch(fullUrl, {
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
    if (DRY_RUN) return runDryGeneration();

    try {
      // ── Step 1: Story-Struktur + Ending parallel ────────────────────────────
      setStepLabel("Geschichte wird analysiert…");
      setProgress(5);
      addLog("Geschichte wird analysiert…");

      const [{ pages, characters }, endData] = await Promise.all([
        post("/api/comic/structure", {
          storyInput:           project?.storyInput || "",
          guidedAnswers:        project?.guidedAnswers || {},
          tone:                 project?.tone || "humorvoll",
          comicStyle:           project?.comicStyle || "emotional",
          mustHaveSentences:    project?.mustHaveSentences || "",
          language:             project?.language || "de",
          category:             project?.guidedAnswers?.category || "familie",
          numPages:             project?.numPages || 5,
          referenceImages:      project?.referenceImages || [],
          referenceImageUrls:   project?.referenceImageUrls || [],
        }),
        post("/api/comic/ending", {
          storyInput:     project?.storyInput || "",
          guidedAnswers:  project?.guidedAnswers || {},
          tone:           project?.tone || "humorvoll",
          language:       project?.language || "de",
          dedication:     project?.guidedAnswers?.dedication || project?.dedication || "",
          dedicationFrom: project?.dedicationFrom || "",
        }).catch(() => null),
      ]);

      if (!pages?.length) throw new Error("Keine Seiten generiert.");
      addLog(`${pages.length} Seiten geplant`, true);
      setProgress(15);

      // Ending sofort speichern wenn vorhanden
      if (endData?.endingText) {
        updateProject({
          endingData: {
            endingText: endData.endingText,
            dedication: endData.dedication || "",
            dedicationFrom: endData.dedicationFrom || "",
          },
        });
        addLog("Abschlussseite fertig", true);
      }

      // ── Step 2: Cover zuerst — sequenziell abwarten ────────────────────────
      // Cover muss fertig sein bevor Seiten starten, damit alle Seiten
      // das Cover als Stil-Referenz nutzen können → konsistenter Stil
      setStepLabel("Cover wird erstellt…");
      setProgress(20);
      addLog("Cover wird erstellt…");

      let coverImageUrl = "";
      try {
        const coverData = await post("/api/comic/cover", {
          title:                project?.title || "Mein Comic",
          characters,
          category:             project?.guidedAnswers?.category || "familie",
          location:             project?.guidedAnswers?.ort || project?.guidedAnswers?.location || "",
          referenceImages:      project?.referenceImages || [],
          referenceImageUrls:   project?.referenceImageUrls || [],
          projectId:            project?.id || `proj-${Date.now()}`,
        });
        coverImageUrl = coverData.coverImageUrl || "";
        if (coverImageUrl) updateProject({ coverImageUrl });
        addLog("Cover fertig", true);
      } catch {
        addLog("Cover übersprungen", true);
      }
      setProgress(30);

      // ── Step 3: Alle Seiten parallel mit Cover als Referenz ─────────────────
      setStepLabel("Seiten werden illustriert…");
      pages.forEach((_: any, i: number) => addLog(`Seite ${i + 1}: "${pages[i].title}"…`));

      const chapters: any[] = new Array(pages.length).fill(null);
      const BATCH_SIZE = 3;
      const progressPerPage = 60 / pages.length;

      for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_SIZE) {
        const batch = pages.slice(batchStart, Math.min(batchStart + BATCH_SIZE, pages.length));

        await Promise.all(batch.map(async (page: any, batchIdx: number) => {
          const i = batchStart + batchIdx;
          try {
            const pageData = await post("/api/comic/page", {
              page,
              characters,
              comicStyle:           project?.comicStyle || "emotional",
              category:             project?.guidedAnswers?.category || "familie",
              referenceImages:      project?.referenceImages || [],
              referenceImageUrls:   project?.referenceImageUrls || [],
              coverImageUrl,
              projectId:            project?.id || "",
            });

            chapters[i] = {
              id:             page.id || `page-${i}`,
              title:          page.title,
              content:        page.panels?.map((p: any) => p.dialog || "").filter(Boolean).join(" ") || "",
              imageUrl:       pageData.imageUrl || "",
              imagePrompt:    "",
              panels:         pageData.panels || page.panels || [],
              panelPositions: pageData.panelPositions || null,
            };
            addLog(`Seite ${i + 1} fertig`, true);
          } catch {
            chapters[i] = { id: page.id || `page-${i}`, title: page.title, content: "", imageUrl: "", imagePrompt: "" };
            addLog(`Seite ${i + 1}: Fehler`, true);
          }

          setProgress(30 + (chapters.filter(Boolean).length / pages.length) * progressPerPage);
          updateProject({ chapters: chapters.filter((c): c is NonNullable<typeof c> => c !== null) });
        }));
      }

      // ── Finalisieren ────────────────────────────────────────────────────────
      const finalChapters = chapters.filter(Boolean);
      updateProject({
        id:           project?.id || `proj-${Date.now()}`,
        title:        project?.title || "Mein Comic",
        storyInput:   project?.storyInput || "",
        guidedAnswers: project?.guidedAnswers || { characters: "", location: "", timeframe: "", specialMoments: "" },
        tone:         project?.tone || "humorvoll",
        design:       "kinderbuch",
        characters:   characters.map((c: any, i: number) => ({ id: `c${i}`, name: c.name, role: "Hauptfigur" })),
        chapters:     finalChapters,
        coverImageUrl: coverImageUrl || undefined,
        status:       "preview",
        createdAt:    project?.createdAt || new Date().toISOString(),
      });

      setProgress(100);
      setStepLabel("Dein Comic ist fertig!");
      setDone(true);
      setTimeout(() => setStep(4), 1200);

    } catch (err: any) {
      setError(err.message);
    }
  }

  // ── Dry-Run Mode (no API calls) ───────────────────────────────────────────
  async function runDryGeneration() {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      // Step 1: Structure
      setStepLabel("🧪 DRY RUN — Geschichte wird analysiert…");
      setProgress(5);
      addLog("🧪 DRY RUN MODUS — keine API-Kosten");
      await wait(DRY_RUN_DELAY);

      const pages = MOCK_PAGES;
      const characters = MOCK_CHARACTERS;
      addLog(`${pages.length} Seiten geplant`, true);
      setProgress(15);

      // Step 2: Cover
      setStepLabel("Cover wird erstellt…");
      addLog("Cover wird erstellt…");
      setProgress(18);
      await wait(DRY_RUN_DELAY);
      const coverImageUrl = MOCK_COVER_URL;
      updateProject({ coverImageUrl });
      addLog("Cover fertig", true);
      setProgress(22);

      // Step 3: Pages
      const chapters: any[] = [];
      const progressPerPage = 65 / pages.length;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setStepLabel(`Seite ${i + 1} von ${pages.length}: "${page.title}"…`);
        addLog(`Seite ${i + 1}: "${page.title}"…`);
        setProgress(22 + i * progressPerPage);
        await wait(DRY_RUN_DELAY);

        const chapter = {
          id: page.id,
          title: page.title,
          content: page.panels.map((p) => p.dialog || "").filter(Boolean).join(" "),
          imageUrl: getMockPageUrl(i),
          imagePrompt: "",
          panels: page.panels,
        };
        chapters.push(chapter);
        updateProject({ chapters: [...chapters] });
        addLog(`Seite ${i + 1} fertig`, true);
        setProgress(22 + (i + 1) * progressPerPage);
      }

      // Step 4: Ending
      setStepLabel("Abschlussseite wird erstellt…");
      addLog("Abschlussseite wird erstellt…");
      setProgress(90);
      await wait(DRY_RUN_DELAY);
      updateProject({ endingData: MOCK_ENDING });
      addLog("Abschlussseite fertig", true);

      // Finalize
      updateProject({
        id: project?.id || `dry-${Date.now()}`,
        title: project?.title || "Sardinien-Abenteuer",
        storyInput: project?.storyInput || "Dry run test story",
        guidedAnswers: project?.guidedAnswers || { characters: "", location: "Sardinien", timeframe: "Sommer 2025", specialMoments: "" },
        tone: project?.tone || "humorvoll",
        design: "kinderbuch",
        characters: characters.map((c, i) => ({ id: `c${i}`, name: c.name, role: "Hauptfigur" })),
        chapters,
        coverImageUrl,
        status: "preview",
        createdAt: project?.createdAt || new Date().toISOString(),
      });

      setProgress(100);
      setStepLabel("🧪 DRY RUN fertig!");
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
        <button onClick={() => { setError(null); running.current = false; runGeneration(); }}
          className="bg-[#1A1410] text-white px-6 py-3 rounded-xl hover:bg-[#2D2620] transition-colors">
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
        <p className="text-gray-500 text-sm">Alle Seiten werden gleichzeitig illustriert – ca. 60–90 Sekunden.</p>
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
              className={`flex items-center gap-2 text-sm ${entry.done ? "text-gray-400" : "text-[#1A1410] font-medium"}`}>
              <span className="w-4 text-center flex-shrink-0">{entry.done ? "✓" : "·"}</span>
              <span>{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#C9963A] font-medium">
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
