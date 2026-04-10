"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import { TONES } from "@/lib/dummyData";
import toast from "react-hot-toast";

export default function Step1Story() {
  const { setStep, setProject } = useBookStore();
  const [storyInput, setStoryInput] = useState("");
  const [tone, setTone] = useState("kindgerecht");
  const [guided, setGuided] = useState({
    characters: "",
    location: "",
    timeframe: "",
    specialMoments: "",
  });
  const [showGuided, setShowGuided] = useState(false);

  const handleNext = () => {
    if (!storyInput.trim() && !guided.characters.trim()) {
      toast.error("Bitte erzähl uns deine Geschichte!");
      return;
    }
    setProject({
      id: `proj-${Date.now()}`,
      title: "Mein persönliches Buch",
      storyInput,
      guidedAnswers: guided,
      tone: tone as any,
      design: "kinderbuch",
      characters: [],
      chapters: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    setStep(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Erzähl uns deine Geschichte ✍️
        </h2>
        <p className="text-gray-500">
          Schreib frei drauf los – oder lass dich von unseren Fragen führen.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-3 bg-brand-50 p-1 rounded-2xl">
        <button
          onClick={() => setShowGuided(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            !showGuided ? "bg-white shadow text-brand-700" : "text-gray-500"
          }`}
        >
          ✍️ Freitext
        </button>
        <button
          onClick={() => setShowGuided(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            showGuided ? "bg-white shadow text-brand-700" : "text-gray-500"
          }`}
        >
          🧭 Geführte Eingabe
        </button>
      </div>

      {!showGuided ? (
        <div className="space-y-3">
          <textarea
            value={storyInput}
            onChange={(e) => setStoryInput(e.target.value)}
            placeholder="Es war einmal... Schreib deine Geschichte hier. Je mehr Details, desto besser wird dein Buch! Erzähl von den Personen, dem Ort, besonderen Momenten..."
            rows={10}
            className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none resize-none text-gray-700 bg-white shadow-sm transition-all"
          />
          <p className="text-xs text-gray-400 text-right">{storyInput.length} Zeichen</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { key: "characters", label: "👥 Wer kommt vor?", placeholder: "z. B. Mama, Papa, Tochter Emma (6 Jahre)" },
            { key: "location", label: "📍 Wo spielt die Geschichte?", placeholder: "z. B. Toskana, Italien – Florenz und Siena" },
            { key: "timeframe", label: "📅 Wann war das?", placeholder: "z. B. Sommer 2023, 2 Wochen Urlaub" },
            { key: "specialMoments", label: "⭐ Besondere Momente?", placeholder: "z. B. Emmas erster Gelato, der verlorene Teddy" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium text-brand-700">{label}</label>
              <input
                value={guided[key as keyof typeof guided]}
                onChange={(e) => setGuided({ ...guided, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white transition-all"
              />
            </div>
          ))}
        </div>
      )}

      {/* Tone selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-brand-700">🎭 Tonalität</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                tone === t.id
                  ? "bg-brand-500 border-brand-500 text-white shadow-md"
                  : "bg-white border-brand-100 text-gray-600 hover:border-brand-300"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleNext} size="lg" fullWidth>
        Weiter zu den Bildern →
      </Button>
    </motion.div>
  );
}
