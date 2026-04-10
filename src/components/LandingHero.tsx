"use client";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

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
            ✨ Deine Erinnerungen. Dein Buch.
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
          {/* Hemmschwelle nehmen */}
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full text-sm">
            💡 Stichpunkte reichen völlig aus – wir kümmern uns um den Rest
          </div>
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
      </div>

      {/* Features */}
      <div className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2
            className="text-3xl font-bold text-center text-brand-800 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            So einfach geht's
          </h2>
          <p className="text-center text-gray-400 text-sm mb-12">
            Keine langen Texte nötig – ein paar Stichpunkte genügen.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                emoji: "✍️",
                title: "Geschichte eingeben",
                desc: "Stichpunkte reichen! Wer, wo, wann – mehr brauchen wir nicht. Alles andere ist optional.",
              },
              {
                emoji: "📸",
                title: "Fotos hochladen",
                desc: "Optional: Lade Bilder hoch. Je mehr Details, desto persönlicher wird dein Buch.",
              },
              {
                emoji: "📖",
                title: "Buch wird erstellt",
                desc: "Text und Illustrationen im Comic-Stil werden vollautomatisch für dich erstellt.",
              },
              {
                emoji: "✏️",
                title: "Bearbeiten & bestellen",
                desc: "In der Vorschau kannst du alles anpassen – Texte, Bilder, Reihenfolge. Erst dann bestellst du.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4 }}
                className="text-center p-6 rounded-2xl bg-brand-50 space-y-3"
              >
                <div className="text-4xl">{f.emoji}</div>
                <h3 className="font-bold text-brand-800">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Reassurance bar */}
      <div className="bg-brand-50 py-10">
        <div className="max-w-4xl mx-auto px-4 grid md:grid-cols-3 gap-6 text-center">
          {[
            { emoji: "🖊️", text: "Stichpunkte reichen – kein Aufsatz nötig" },
            { emoji: "👁️", text: "Vorschau vor der Bestellung – du hast die volle Kontrolle" },
            { emoji: "🔄", text: "Alles bearbeitbar – Texte, Bilder, Reihenfolge" },
          ].map((item) => (
            <div key={item.text} className="flex items-center justify-center gap-3">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm text-brand-700 font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 text-center space-y-4 bg-gradient-to-r from-brand-500 to-warm-500">
        <h2
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bereit für dein persönliches Buch?
        </h2>
        <p className="text-white/80 text-sm">Dauert nur wenige Minuten – Stichpunkte reichen.</p>
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
