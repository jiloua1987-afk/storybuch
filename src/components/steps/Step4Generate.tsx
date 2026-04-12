"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import ProgressBar from "@/components/ui/ProgressBar";
import { DUMMY_PROJECT } from "@/lib/dummyData";

interface ProgressStep {
  label: string;
  progress: number;
}

const STEPS: ProgressStep[] = [
  { label: "Geschichte wird analysiert…",        progress: 8  },
  { label: "Kapitelstruktur wird erstellt…",      progress: 20 },
  { label: "Figuren werden extrahiert…",          progress: 32 },
  { label: "Dialoge werden geschrieben…",         progress: 48 },
  { label: "Illustrationen werden erstellt…",     progress: 65 },
  { label: "Sprechblasen werden hinzugefügt…",    progress: 80 },
  { label: "Layout wird formatiert…",             progress: 92 },
  { label: "Dein Comic ist fertig!",              progress: 100 },
];

export default function Step4Generate() {
  const { setStep, project, updateProject, setGenerationProgress, generationProgress, generationStatus } =
    useBookStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runGeneration();
  }, []);

  async function runGeneration() {
    try {
      // Step 1-2: Buchstruktur + Characters via GPT-4o
      setGenerationProgress(STEPS[0].progress, STEPS[0].label);
      setStepIndex(0);

      const structureRes = await fetch("/api/generate/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyInput: project?.storyInput || "",
          guidedAnswers: project?.guidedAnswers || {},
          tone: project?.tone || "humorvoll",
          language: project?.language || "de",
        }),
      });

      setGenerationProgress(STEPS[1].progress, STEPS[1].label);
      setStepIndex(1);

      let chapters: any[] = [];
      let characters: any[] = [];

      if (structureRes.ok) {
        const data = await structureRes.json();
        chapters = data.chapters || [];
        characters = data.characters || [];
      } else {
        // Fallback to dummy data if no API key / quota
        console.warn("API not available, using demo data");
        chapters = DUMMY_PROJECT.chapters.map((c) => ({
          id: c.id, nummer: 1, titel: c.title,
          handlung: c.content, szene_beschreibung: c.content,
          illustration_prompt: c.imagePrompt || "",
        }));
        characters = DUMMY_PROJECT.characters.map((c) => ({
          name: c.name, age: 30, visual_anchor: c.name,
          bubble_color: "#E8F4FF", style_lock: "comic",
        }));
      }

      setGenerationProgress(STEPS[2].progress, STEPS[2].label);
      setStepIndex(2);

      // Step 3: Dialoge generieren
      setGenerationProgress(STEPS[3].progress, STEPS[3].label);
      setStepIndex(3);

      const chaptersWithDialogs = await Promise.all(
        chapters.map(async (ch: any) => {
          try {
            const res = await fetch("/api/generate/dialogs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chapter: ch,
                characters,
                tone: project?.tone || "humorvoll",
                comicStyle: project?.comicStyle || "emotional",
                mustHaveSentences: project?.mustHaveSentences || "",
                language: project?.language || "de",
              }),
            });
            const data = res.ok ? await res.json() : { dialogs: [] };
            return { ...ch, dialogs: data.dialogs || [] };
          } catch {
            return { ...ch, dialogs: [] };
          }
        })
      );

      // Step 4: Bilder generieren
      setGenerationProgress(STEPS[4].progress, STEPS[4].label);
      setStepIndex(4);

      const chaptersWithImages = await Promise.all(
        chaptersWithDialogs.map(async (ch: any) => {
          try {
            const positions = (ch.dialogs || []).map((d: any) => d.position).slice(0, 2);
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chapter: ch,
                characters,
                illustrationStyle: project?.illustrationStyle || "comic",
                dialogPositions: positions,
              }),
            });
            const data = res.ok ? await res.json() : {};
            return { ...ch, imageUrl: data.imageUrl || `https://picsum.photos/seed/${ch.id}/800/500` };
          } catch {
            return { ...ch, imageUrl: `https://picsum.photos/seed/${ch.id}/800/500` };
          }
        })
      );

      setGenerationProgress(STEPS[5].progress, STEPS[5].label);
      setStepIndex(5);

      // Step 5: Sprechblasen auf Bilder compositen
      const chaptersWithBubbles = await Promise.all(
        chaptersWithImages.map(async (ch: any) => {
          if (!ch.dialogs?.length || !ch.imageUrl) return ch;
          try {
            const res = await fetch("/api/generate/bubbles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: ch.imageUrl, dialogs: ch.dialogs }),
            });
            const data = res.ok ? await res.json() : {};
            return { ...ch, imageUrl: data.compositeUrl || ch.imageUrl };
          } catch {
            return ch;
          }
        })
      );

      setGenerationProgress(STEPS[6].progress, STEPS[6].label);
      setStepIndex(6);
      await new Promise((r) => setTimeout(r, 400));

      // Map to BookProject chapters format
      const finalChapters = chaptersWithBubbles.map((ch: any) => ({
        id: ch.id || `ch-${Math.random()}`,
        title: ch.titel || ch.title || "Kapitel",
        content: ch.handlung || ch.content || "",
        imageUrl: ch.imageUrl,
        imagePrompt: ch.illustration_prompt || "",
        dialogs: ch.dialogs || [],
      }));

      updateProject({
        ...DUMMY_PROJECT,
        id: project?.id || "demo",
        title: project?.title || DUMMY_PROJECT.title,
        tone: project?.tone || DUMMY_PROJECT.tone,
        design: project?.design || DUMMY_PROJECT.design,
        chapters: finalChapters,
        characters: characters.map((c: any, i: number) => ({
          id: `char-${i}`,
          name: c.name,
          role: "Hauptfigur",
          imageUrl: undefined,
        })),
        status: "preview",
      });

      setGenerationProgress(STEPS[7].progress, STEPS[7].label);
      setStepIndex(7);
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
        <p className="text-gray-500 text-sm">{error}</p>
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
        <p className="text-gray-500">Einen Moment – wir arbeiten an deinem persönlichen Meisterwerk.</p>
      </div>

      <motion.div
        animate={{ rotate: done ? 0 : [0, -3, 3, -3, 0] }}
        transition={{ repeat: done ? 0 : Infinity, duration: 2.5 }}
        className="text-7xl mx-auto"
      >
        {done ? "🎉" : "🎨"}
      </motion.div>

      <ProgressBar progress={generationProgress} status={generationStatus} />

      <div className="space-y-2 text-left">
        {STEPS.map((s, i) => (
          <AnimatePresence key={i}>
            {i <= stepIndex && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 text-sm ${
                  i === stepIndex ? "text-purple-700 font-medium" : "text-gray-400"
                }`}
              >
                <span className="w-4 text-center">
                  {i < stepIndex ? "✓" : i === stepIndex ? "·" : ""}
                </span>
                <span>{s.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-purple-600 font-medium"
        >
          Weiterleitung zur Vorschau…
        </motion.p>
      )}
    </motion.div>
  );
}
