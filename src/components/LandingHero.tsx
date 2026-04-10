"use client";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Image from "next/image";

const EXAMPLE_BOOKS = [
  {
    seed: "sardinia-comic",
    title: "Sommer auf Sardinien",
    emoji: "🏖️",
    bg: "https://picsum.photos/seed/sardinia/300/400",
    overlay: "from-cyan-500/60 to-blue-600/60",
    panels: ["🏖️", "🏰", "🌅"],
  },
  {
    seed: "wedding-story",
    title: "Unsere Hochzeit",
    emoji: "💍",
    bg: "https://picsum.photos/seed/wedding2/300/400",
    overlay: "from-rose-400/60 to-pink-600/60",
    panels: ["💍", "💐", "🥂"],
  },
  {
    seed: "baby-first-year",
    title: "Emmas erstes Jahr",
    emoji: "👶",
    bg: "https://picsum.photos/seed/baby/300/400",
    overlay: "from-yellow-400/60 to-orange-400/60",
    panels: ["👶", "🎂", "🌟"],
  },
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

        {/* Book mockups – comic panel style */}
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
              className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] cursor-pointer group bg-white border-2 border-gray-100"
            >
              {/* Comic panel layout */}
              <div className="absolute inset-0 flex flex-col">
                {/* Top panel – large image */}
                <div className="relative flex-[2] overflow-hidden border-b-2 border-gray-800">
                  <Image
                    src={book.bg}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${book.overlay}`} />
                  {/* Caption box top-left */}
                  <div className="absolute top-2 left-2 bg-white/95 border border-gray-300 rounded px-2 py-1 max-w-[80%]">
                    <p className="text-gray-800 font-bold leading-tight" style={{ fontSize: "7px", fontFamily: "var(--font-display)" }}>
                      {book.title}
                    </p>
                  </div>
                </div>
                {/* Bottom panels – 2 small */}
                <div className="flex flex-1">
                  <div className="relative flex-1 border-r border-gray-800 overflow-hidden">
                    <Image src={book.bg} alt="" fill className="object-cover object-bottom" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${book.overlay} opacity-70`} />
                    <div className="absolute bottom-1 left-1 bg-white/90 border border-gray-300 rounded px-1">
                      <p style={{ fontSize: "5px" }} className="text-gray-700 font-medium">Eine unvergessliche Reise...</p>
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    <Image src={book.bg} alt="" fill className="object-cover object-right" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${book.overlay} opacity-50`} />
                    <div className="absolute top-1 right-1 text-lg">{book.emoji}</div>
                  </div>
                </div>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
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
