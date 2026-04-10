"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import { BOOK_DESIGNS } from "@/lib/dummyData";
import Image from "next/image";

const DESIGN_PREVIEWS: Record<string, string> = {
  kinderbuch: "https://picsum.photos/seed/kids-book/400/300",
  romantisch: "https://picsum.photos/seed/romantic-book/400/300",
  biografie: "https://picsum.photos/seed/biography-book/400/300",
};

export default function Step3Style() {
  const { setStep, project, updateProject } = useBookStore();
  const [selectedDesign, setSelectedDesign] = useState(project?.design || "kinderbuch");
  const [bookTitle, setBookTitle] = useState(project?.title || "");

  const handleNext = () => {
    updateProject({ design: selectedDesign as any, title: bookTitle || "Mein persönliches Buch" });
    setStep(3);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Wähle deinen Stil 🎨
        </h2>
        <p className="text-gray-500">Wie soll dein Buch aussehen?</p>
      </div>

      {/* Book title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-brand-700">📚 Buchtitel</label>
        <input
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          placeholder="z. B. Unser Abenteuer in der Toskana"
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white text-lg"
        />
      </div>

      {/* Design cards */}
      <div className="grid gap-4">
        {BOOK_DESIGNS.map((design) => (
          <motion.button
            key={design.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedDesign(design.id)}
            className={`flex gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              selectedDesign === design.id
                ? "border-brand-400 bg-brand-50 shadow-md"
                : "border-gray-100 bg-white hover:border-brand-200"
            }`}
          >
            <div className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={DESIGN_PREVIEWS[design.id]}
                alt={design.label}
                fill
                className="object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${design.colors} opacity-40`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{design.emoji}</span>
                <span className="font-semibold text-brand-800">{design.label}</span>
                {selectedDesign === design.id && (
                  <span className="ml-auto text-brand-500 text-lg">✓</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{design.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Preview hint */}
      <div className="bg-brand-50 rounded-2xl p-4 text-center">
        <p className="text-sm text-brand-700">
          ✨ Die KI passt Illustrationsstil, Schriftarten und Farben automatisch an deine Wahl an.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(1)}>
          ← Zurück
        </Button>
        <Button onClick={handleNext} fullWidth>
          Buch generieren ✨
        </Button>
      </div>
    </motion.div>
  );
}
