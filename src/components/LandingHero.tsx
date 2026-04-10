"use client";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Image from "next/image";

const EXAMPLE_BOOKS = [
  { seed: "tuscany", title: "Toskana-Abenteuer", emoji: "🇮🇹" },
  { seed: "wedding", title: "Unsere Hochzeit", emoji: "💍" },
  { seed: "childhood", title: "Emmas erstes Jahr", emoji: "👶" },
];

export default function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-warm-50">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium">
            ✨ KI-gestützte Buchgenerierung
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold text-brand-900 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Deine Geschichte.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-warm-500">
              Dein Buch.
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Verwandle deine Erinnerungen in ein wunderschönes, illustriertes Buch –
            gedruckt und direkt zu dir nach Hause geliefert.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button onClick={onStart} size="lg">
            Jetzt Buch erstellen ✨
          </Button>
          <Button variant="secondary" size="lg">
            Beispiele ansehen
          </Button>
        </motion.div>

        {/* Floating book mockups */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-12"
        >
          {EXAMPLE_BOOKS.map((book, i) => (
            <motion.div
              key={book.seed}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] cursor-pointer group"
            >
              <Image
                src={`https://picsum.photos/seed/${book.seed}/300/400`}
                alt={book.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-xs font-medium">{book.emoji} {book.title}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features */}
      <div className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2
            className="text-3xl font-bold text-center text-brand-800 mb-12"
            style={{ fontFamily: "var(--font-display)" }}
          >
            So einfach geht's
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                emoji: "✍️",
                title: "Geschichte erzählen",
                desc: "Schreib frei oder beantworte geführte Fragen. Lade Fotos hoch.",
              },
              {
                emoji: "✨",
                title: "KI generiert dein Buch",
                desc: "Text, Kapitel und Illustrationen werden automatisch erstellt.",
              },
              {
                emoji: "📦",
                title: "Gedruckt nach Hause",
                desc: "Hardcover oder Softcover – in 5–7 Werktagen bei dir.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4 }}
                className="text-center p-6 rounded-2xl bg-brand-50 space-y-3"
              >
                <div className="text-4xl">{f.emoji}</div>
                <h3 className="font-bold text-brand-800">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 text-center space-y-6 bg-gradient-to-r from-brand-500 to-warm-500">
        <h2
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bereit für dein persönliches Buch?
        </h2>
        <Button
          onClick={onStart}
          size="lg"
          className="bg-white text-brand-700 hover:bg-brand-50 shadow-xl"
        >
          Kostenlos starten ✨
        </Button>
      </div>
    </div>
  );
}
