"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore, ComicStyle, DialogMode, CustomDialog } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const CATEGORIES = [
  { id: "liebe",     emoji: "💕", label: "Liebesgeschichte", tone: "romantisch"  },
  { id: "familie",   emoji: "👨‍👩‍👧‍👦", label: "Familie",          tone: "kindgerecht" },
  { id: "urlaub",    emoji: "✈️", label: "Urlaub / Reise",   tone: "humorvoll"   },
  { id: "feier",     emoji: "🎉", label: "Feier / Event",    tone: "humorvoll"   },
  { id: "biografie", emoji: "📜", label: "Biografie",        tone: "biografisch" },
  { id: "freunde",   emoji: "🤝", label: "Freundschaft",     tone: "humorvoll"   },
  { id: "sonstiges", emoji: "✨", label: "Sonstiges",        tone: "episch"      },
];

const COMIC_STYLES: { id: ComicStyle; emoji: string; label: string; desc: string }[] = [
  { id: "action",    emoji: "⚡", label: "Action",    desc: "Dynamisch, übertrieben, energiegeladen" },
  { id: "emotional", emoji: "💛", label: "Emotional", desc: "Ruhig, warm, erzählerisch" },
  { id: "humor",     emoji: "😄", label: "Humor",     desc: "Lustig, überzeichnet, spielerisch" },
];

const GUIDED_QUESTIONS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  liebe: [
    { key: "kennengelernt", label: "Euer Kennenlernen", placeholder: "Wann, wo und wie habt ihr euch kennengelernt?" },
    { key: "zusammen",      label: "Der Anfang",        placeholder: "Wann seid ihr zusammengekommen?" },
    { key: "personen",      label: "Wer seid ihr?",     placeholder: "Eure Namen, ein paar Worte zu euch" },
    { key: "zeitraum",      label: "Zeitraum",          placeholder: "z. B. seit 2018, 5 gemeinsame Jahre" },
  ],
  familie: [
    { key: "personen", label: "Wer gehört dazu?",          placeholder: "z. B. Mama, Papa, Emma (6), Luca (4)" },
    { key: "zeitraum", label: "Zeitraum",                  placeholder: "z. B. Sommer 2023" },
    { key: "ort",      label: "Wo spielt die Geschichte?", placeholder: "z. B. Sardinien, Zuhause" },
  ],
  urlaub: [
    { key: "personen", label: "Wer war dabei?",        placeholder: "z. B. wir als Familie" },
    { key: "ort",      label: "Wohin ging die Reise?", placeholder: "z. B. Toskana, Italien" },
    { key: "zeitraum", label: "Wann?",                 placeholder: "z. B. Sommer 2023, 2 Wochen" },
  ],
  feier: [
    { key: "anlass",   label: "Was wurde gefeiert?", placeholder: "z. B. 40. Geburtstag, Hochzeit" },
    { key: "personen", label: "Wer war dabei?",      placeholder: "z. B. Familie und enge Freunde" },
    { key: "ort",      label: "Wo?",                 placeholder: "z. B. Restaurant Rosengarten" },
    { key: "zeitraum", label: "Wann?",               placeholder: "z. B. 12. Juni 2024" },
  ],
  biografie: [
    { key: "personen", label: "Um wen geht es?",          placeholder: "Name, Geburtsjahr, ein paar Worte" },
    { key: "zeitraum", label: "Welcher Lebensabschnitt?", placeholder: "z. B. Kindheit, die 80er Jahre" },
    { key: "ort",      label: "Wo aufgewachsen / gelebt?", placeholder: "z. B. Hamburg, später München" },
  ],
  freunde: [
    { key: "personen", label: "Wer seid ihr?",            placeholder: "Eure Namen und wie ihr euch kennt" },
    { key: "zeitraum", label: "Seit wann?",               placeholder: "z. B. seit der Schulzeit" },
    { key: "ort",      label: "Wo spielt die Geschichte?", placeholder: "z. B. Berlin" },
  ],
  sonstiges: [
    { key: "personen", label: "Wer kommt vor?", placeholder: "Namen und kurze Beschreibung" },
    { key: "ort",      label: "Wo?",            placeholder: "Ort oder Schauplatz" },
    { key: "zeitraum", label: "Wann?",          placeholder: "Zeitraum oder Datum" },
  ],
};

interface Moment { id: string; title: string; description: string; }

export default function Step1Story() {
  const { setStep, setProject } = useBookStore();
  const [mode, setMode]             = useState<"frei" | "gefuehrt">("gefuehrt");
  const [category, setCategory]     = useState<string | null>(null);
  const [comicStyle, setComicStyle] = useState<ComicStyle>("emotional");
  const [storyInput, setStoryInput] = useState("");
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [moments, setMoments]       = useState<Moment[]>([{ id: "m1", title: "", description: "" }]);
  const [dialogMode, setDialogMode] = useState<DialogMode>("auto");
  const [customDialogs, setCustomDialogs] = useState<CustomDialog[]>([{ id: "d1", speaker: "", text: "" }]);
  const [mustHaveSentences, setMustHaveSentences] = useState("");

  const addDialog = () =>
    setCustomDialogs((prev) => [...prev, { id: `d${Date.now()}`, speaker: "", text: "" }]);
  const updateDialog = (id: string, field: "speaker" | "text", value: string) =>
    setCustomDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const removeDialog = (id: string) =>
    setCustomDialogs((prev) => prev.filter((d) => d.id !== id));

  const selectedCat = CATEGORIES.find((c) => c.id === category);
  const questions   = category ? GUIDED_QUESTIONS[category] : [];

  const addMoment = () =>
    setMoments((prev) => [...prev, { id: `m${Date.now()}`, title: "", description: "" }]);
  const updateMoment = (id: string, field: "title" | "description", value: string) =>
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const removeMoment = (id: string) => {
    if (moments.length === 1) return;
    setMoments((prev) => prev.filter((m) => m.id !== id));
  };

  const handleNext = () => {
    const hasContent = storyInput.trim() ||
      Object.values(answers).some((v) => v.trim()) ||
      moments.some((m) => m.title.trim());
    if (!hasContent) { toast.error("Bitte gib uns ein paar Infos zu deiner Geschichte."); return; }

    const momentsText = moments
      .filter((m) => m.title.trim())
      .map((m) => `${m.title}: ${m.description}`)
      .join(" | ");

    setProject({
      id: `proj-${Date.now()}`,
      title: "Mein persönlicher Comic",
      storyInput,
      guidedAnswers: {
        ...answers,
        specialMoments: momentsText,
        characters: answers.personen || "",
        location: answers.ort || "",
        timeframe: answers.zeitraum || "",
      },
      tone: (selectedCat?.tone as any) || "kindgerecht",
      comicStyle,
      dialogMode,
      customDialogs: dialogMode === "custom" ? customDialogs : [],
      mustHaveSentences,
      design: "kinderbuch",
      characters: [],
      chapters: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    setStep(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Erzähl uns deine Geschichte ✍️
        </h2>
        <p className="text-gray-500">Schreib frei oder lass dich Schritt für Schritt führen.</p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full text-sm">
          💡 Stichpunkte reichen völlig – je mehr Details, desto persönlicher wird dein Comic
        </div>
      </div>

      <div className="flex gap-3 bg-brand-50 p-1 rounded-2xl">
        <button onClick={() => setMode("gefuehrt")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "gefuehrt" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}>
          🧭 Schritt für Schritt
        </button>
        <button onClick={() => setMode("frei")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "frei" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}>
          ✍️ Freitext
        </button>
      </div>

      {mode === "frei" && (
        <div className="space-y-3">
          <textarea
            value={storyInput}
            onChange={(e) => setStoryInput(e.target.value)}
            placeholder="Stichpunkte reichen! z. B.: Toskana, Sommer 2023, Emma 6 Jahre, erster Gelato, Sonnenuntergang."
            rows={10}
            className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none resize-none text-gray-700 bg-white shadow-sm transition-all"
          />
          <p className="text-xs text-gray-400 text-right">{storyInput.length} Zeichen</p>
        </div>
      )}

      {mode === "gefuehrt" && (
        <div className="space-y-6">

          {/* 1. Kategorie */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-brand-700">1. Um was für eine Geschichte handelt es sich?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setAnswers({}); }}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${category === cat.id ? "border-brand-400 bg-brand-50 shadow-md" : "border-gray-100 bg-white hover:border-brand-200"}`}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs font-medium text-brand-800">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Comic-Stil */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <label className="text-sm font-semibold text-brand-700">2. Welchen Comic-Stil soll deine Geschichte haben?</label>
                <div className="grid grid-cols-3 gap-3">
                  {COMIC_STYLES.map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => setComicStyle(cs.id)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all space-y-1 ${comicStyle === cs.id ? "border-brand-400 bg-brand-50 shadow-md" : "border-gray-100 bg-white hover:border-brand-200"}`}
                    >
                      <div className="text-2xl">{cs.emoji}</div>
                      <div className="text-xs font-semibold text-brand-800">{cs.label}</div>
                      <div className="text-xs text-gray-400 leading-snug">{cs.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Fragen */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <label className="text-sm font-semibold text-brand-700">
                  3. Ein paar Infos <span className="font-normal text-gray-400">(alles optional – Stichpunkte reichen)</span>
                </label>
                {questions.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">{label}</label>
                    <input
                      value={answers[key] || ""}
                      onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white transition-all"
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Momente */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <label className="text-sm font-semibold text-brand-700">
                  4. Besondere Momente / Szenen{" "}
                  <span className="font-normal text-gray-400">(jeder Moment wird ein Panel)</span>
                </label>
                <p className="text-xs text-gray-400">Jeder Moment bekommt seine eigene Illustration.</p>
                <div className="space-y-3">
                  {moments.map((moment, i) => (
                    <motion.div key={moment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-brand-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-400 w-5">#{i + 1}</span>
                        <input
                          value={moment.title}
                          onChange={(e) => updateMoment(moment.id, "title", e.target.value)}
                          placeholder="Titel, z. B. Der erste Gelato"
                          className="flex-1 p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                        />
                        {moments.length > 1 && (
                          <button onClick={() => removeMoment(moment.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                        )}
                      </div>
                      <textarea
                        value={moment.description}
                        onChange={(e) => updateMoment(moment.id, "description", e.target.value)}
                        placeholder="Kurze Beschreibung – Stichpunkte reichen!"
                        rows={2}
                        className="w-full p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white resize-none"
                      />
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={addMoment}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-200 text-brand-500 text-sm font-medium hover:bg-brand-50 hover:border-brand-400 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span> Weiteren Moment hinzufügen
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Dialoge & Wichtige Sätze */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border-t border-brand-100 pt-6">
                <label className="text-sm font-semibold text-brand-700">
                  5. Dialoge <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-3 bg-brand-50 p-1 rounded-2xl">
                  <button
                    onClick={() => setDialogMode("auto")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${dialogMode === "auto" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
                  >
                    ✨ Automatisch vorschlagen
                  </button>
                  <button
                    onClick={() => setDialogMode("custom")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${dialogMode === "custom" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
                  >
                    ✍️ Eigene Dialoge
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  {dialogMode === "auto"
                    ? "Wir schlagen passende Dialoge vor – du kannst sie in der Vorschau anpassen."
                    : "Gib eigene Dialoge ein – fehlende werden automatisch ergänzt."}
                </p>

                <AnimatePresence>
                  {dialogMode === "custom" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                      {customDialogs.map((d, i) => (
                        <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="bg-brand-50 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-400 w-5">#{i + 1}</span>
                            <input
                              value={d.speaker}
                              onChange={(e) => updateDialog(d.id, "speaker", e.target.value)}
                              placeholder="Sprecher, z. B. Max"
                              className="w-36 p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                            />
                            {customDialogs.length > 1 && (
                              <button onClick={() => removeDialog(d.id)} className="ml-auto text-gray-300 hover:text-red-400 text-xl">×</button>
                            )}
                          </div>
                          <input
                            value={d.text}
                            onChange={(e) => updateDialog(d.id, "text", e.target.value)}
                            placeholder="Dialog, z. B. Warte, kennst du mich?"
                            className="w-full p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                          />
                        </motion.div>
                      ))}
                      <button
                        onClick={addDialog}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-200 text-brand-500 text-sm font-medium hover:bg-brand-50 hover:border-brand-400 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-xl">+</span> Dialog hinzufügen
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-700">
                    ⭐ Wichtige Sätze <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={mustHaveSentences}
                    onChange={(e) => setMustHaveSentences(e.target.value)}
                    placeholder="Gibt es Sätze die unbedingt vorkommen sollen? z. B. 'Ich liebe dich mehr als Pizza'"
                    rows={2}
                    className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white resize-none transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Button onClick={handleNext} size="lg" fullWidth>
        Weiter zu den Bildern →
      </Button>
    </motion.div>
  );
}
