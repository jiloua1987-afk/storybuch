"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore, DialogMode, CustomDialog } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const MOMENT_SUGGESTIONS: Record<string, string[]> = {
  liebe: [
    "Das erste Treffen",
    "Der erste Kuss",
    "Der Antrag",
    "Die Hochzeit",
    "Heute"
  ],
  familie: [
    "Morgens am Frühstückstisch",
    "Spielplatz-Abenteuer",
    "Gute-Nacht-Geschichte",
    "Familienausflug"
  ],
  urlaub: [
    "Ankunft am Urlaubsort",
    "Am Strand",
    "Kulinarisches Highlight",
    "Unvergesslicher Ausflug"
  ],
  biografie: [
    "Kindheit",
    "Jugend",
    "Berufseinstieg",
    "Familie gründen",
    "Heute"
  ],
  feier: [
    "Die Vorbereitung",
    "Die Überraschung",
    "Die Feier",
    "Der Höhepunkt"
  ],
  freunde: [
    "Wie wir uns kennenlernten",
    "Unser erstes Abenteuer",
    "Ein unvergesslicher Tag",
    "Heute"
  ],
  sonstiges: [
    "Der Anfang",
    "Die Herausforderung",
    "Der Wendepunkt",
    "Das Ende"
  ]
};

interface Moment { id: string; title: string; description: string; }

export default function Step2Content() {
  const { setStep, project, updateProject } = useBookStore();
  const [title, setTitle] = useState(project?.title || "");
  const [contentMode, setContentMode] = useState<"moments" | "freetext">("moments");
  const [moments, setMoments] = useState<Moment[]>([{ id: "m1", title: "", description: "" }]);
  const [dialogMode, setDialogMode] = useState<DialogMode>("auto");
  const [customDialogs, setCustomDialogs] = useState<CustomDialog[]>([{ id: "d1", speaker: "", text: "" }]);
  const [storyInput, setStoryInput] = useState(project?.storyInput || "");

  const category = project?.guidedAnswers?.category || "sonstiges";
  const suggestions = MOMENT_SUGGESTIONS[category] || [];

  const addMoment = () => {
    setMoments([...moments, { id: `m${Date.now()}`, title: "", description: "" }]);
  };

  const addSuggestion = (suggestion: string) => {
    setMoments([...moments, { id: `m${Date.now()}`, title: suggestion, description: "" }]);
    toast.success(`"${suggestion}" hinzugefügt`);
  };

  const updateMoment = (id: string, field: "title" | "description", value: string) => {
    setMoments(moments.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMoment = (id: string) => {
    if (moments.length === 1) return;
    setMoments(moments.filter(m => m.id !== id));
  };

  const addDialog = () => {
    setCustomDialogs([...customDialogs, { id: `d${Date.now()}`, speaker: "", text: "" }]);
  };

  const updateDialog = (id: string, field: "speaker" | "text", value: string) => {
    setCustomDialogs(customDialogs.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDialog = (id: string) => {
    setCustomDialogs(customDialogs.filter(d => d.id !== id));
  };

  const handleNext = () => {
    if (!title.trim()) {
      toast.error("Bitte gib deinem Comic einen Titel.");
      return;
    }

    if (contentMode === "moments") {
      const hasContent = moments.some(m => m.title.trim());
      if (!hasContent) {
        toast.error("Bitte füge mindestens einen Moment hinzu.");
        return;
      }
    } else {
      if (!storyInput.trim()) {
        toast.error("Bitte erzähle uns deine Geschichte.");
        return;
      }
    }

    const momentsText = moments
      .filter(m => m.title.trim())
      .map(m => `${m.title}: ${m.description}`)
      .join(" | ");

    updateProject({
      title,
      storyInput: contentMode === "freetext" ? storyInput : "",
      guidedAnswers: {
        category: project?.guidedAnswers?.category || "sonstiges",
        characters: project?.guidedAnswers?.characters || "",
        location: project?.guidedAnswers?.location || "",
        timeframe: project?.guidedAnswers?.timeframe || "",
        specialMoments: contentMode === "moments" ? momentsText : "",
      },
      dialogMode,
      customDialogs: dialogMode === "custom" ? customDialogs : [],
    });

    setStep(2);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">

      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Deine Geschichte
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">Erzähl uns, was in deinem Comic passieren soll</p>
      </div>

      {/* Titel */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900">Titel deines Comics</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Unser Sommer auf Sardinien"
          className="w-full p-3.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none text-gray-900 bg-white transition-all"
        />
      </div>

      {/* Content Mode */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">Wie möchtest du deine Geschichte erzählen?</label>
        <div className="flex gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setContentMode("moments")}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              contentMode === "moments" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Momente & Dialoge
          </button>
          <button
            onClick={() => setContentMode("freetext")}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              contentMode === "freetext" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Freitext
          </button>
        </div>
      </div>

      {/* Moments Mode */}
      {contentMode === "moments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">
                💡 Vorschläge für {
                  category === "liebe" ? "Liebesgeschichte" :
                  category === "familie" ? "Familie" :
                  category === "urlaub" ? "Urlaub" :
                  category === "feier" ? "Feier" :
                  category === "biografie" ? "Biografie" :
                  category === "freunde" ? "Freundschaft" :
                  "Sonstiges"
                }
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addSuggestion(suggestion)}
                    className="px-4 py-2 rounded-lg border-2 border-brand-200 text-brand-700 text-sm font-medium hover:bg-brand-50 hover:border-brand-400 transition-all"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Moments */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Besondere Momente <span className="font-normal text-gray-400">(jeder Moment wird eine Seite)</span>
            </label>
            <div className="space-y-3">
              {moments.map((moment, i) => (
                <motion.div
                  key={moment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-8">#{i + 1}</span>
                    <input
                      value={moment.title}
                      onChange={(e) => updateMoment(moment.id, "title", e.target.value)}
                      placeholder="Titel, z. B. Das erste Treffen"
                      className="flex-1 p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                    />
                    {moments.length > 1 && (
                      <button onClick={() => removeMoment(moment.id)} className="text-gray-300 hover:text-red-500 text-xl">×</button>
                    )}
                  </div>
                  <textarea
                    value={moment.description}
                    onChange={(e) => updateMoment(moment.id, "description", e.target.value)}
                    placeholder="Kurze Beschreibung – Stichpunkte reichen!"
                    rows={2}
                    className="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white resize-none"
                  />
                </motion.div>
              ))}
            </div>
            <button
              onClick={addMoment}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span> Weiteren Moment hinzufügen
            </button>
          </div>

          {/* Dialogs */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <label className="text-sm font-semibold text-gray-700">
              Dialoge <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="flex gap-3 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
              <button
                onClick={() => setDialogMode("auto")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  dialogMode === "auto" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"
                }`}
              >
                Automatisch vorschlagen
              </button>
              <button
                onClick={() => setDialogMode("custom")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  dialogMode === "custom" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"
                }`}
              >
                Eigene Dialoge
              </button>
            </div>

            <AnimatePresence>
              {dialogMode === "custom" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  {customDialogs.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-8">#{i + 1}</span>
                        <input
                          value={d.speaker}
                          onChange={(e) => updateDialog(d.id, "speaker", e.target.value)}
                          placeholder="Sprecher, z. B. Jil"
                          className="w-36 p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                        />
                        {customDialogs.length > 1 && (
                          <button onClick={() => removeDialog(d.id)} className="ml-auto text-gray-300 hover:text-red-500 text-xl">×</button>
                        )}
                      </div>
                      <input
                        value={d.text}
                        onChange={(e) => updateDialog(d.id, "text", e.target.value)}
                        placeholder="Dialog, z. B. Warte, kennst du mich?"
                        className="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                      />
                    </motion.div>
                  ))}
                  <button
                    onClick={addDialog}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">+</span> Dialog hinzufügen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Freetext Mode */}
      {contentMode === "freetext" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <label className="text-sm font-semibold text-gray-900">Deine Geschichte</label>
          <textarea
            value={storyInput}
            onChange={(e) => setStoryInput(e.target.value)}
            placeholder="Stichpunkte reichen! z. B.: Toskana, Sommer 2023, Emma 6 Jahre, erster Gelato, Sonnenuntergang am Strand, Papa hat Pizza verbrannt, Mama hat gelacht..."
            rows={12}
            className="w-full p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none text-gray-900 bg-white transition-all"
          />
          <p className="text-xs text-gray-500 text-right">{storyInput.length} Zeichen</p>
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(0)}>← Zurück</Button>
        <Button onClick={handleNext} fullWidth>
          Weiter zur Widmung →
        </Button>
      </div>
    </motion.div>
  );
}
