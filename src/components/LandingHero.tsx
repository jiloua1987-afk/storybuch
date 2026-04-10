"use client";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Image from "next/image";
import Footer from "@/components/Footer";

const REVIEWS = [
  { name: "Sandra M.", stars: 5, text: "Das schönste Geschenk, das ich je gemacht habe. Meine Mutter hat geweint vor Freude.", occasion: "Muttertag" },
  { name: "Thomas K.", stars: 5, text: "Unser Sardinien-Urlaub als Buch – die Kinder lieben es und wollen es jeden Abend anschauen.", occasion: "Familienurlaub" },
  { name: "Julia & Marc", stars: 5, text: "Unsere Liebesgeschichte als Comic-Buch. Einfach unglaublich wie persönlich das geworden ist.", occasion: "Jahrestag" },
  { name: "Petra W.", stars: 5, text: "Für meinen Vater zum 70. Geburtstag – seine Biografie als illustriertes Buch. Er ist sprachlos.", occasion: "Geburtstag" },
];

export default function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-warm-50">

      {/* Hero – Familie liest Buch */}
      <div className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-0 grid md:grid-cols-2 gap-12 items-center">
          {/* Text links */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 pb-16"
          >
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium">
              ✨ Deine Erinnerungen. Dein Buch.
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-brand-900 leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Erlebe deine schönsten Geschichten als
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-warm-500"> liebevoll gestaltetes Bilderbuch.</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Verwandle deine Erinnerungen in ein wunderschönes, illustriertes Buch –
              gedruckt und direkt zu dir nach Hause geliefert.
            </p>
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full text-sm">
              💡 Stichpunkte reichen völlig aus – wir kümmern uns um den Rest
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onStart} size="lg">
                Jetzt Buch erstellen ✨
              </Button>
              <Button variant="secondary" size="lg">
                Beispiele ansehen
              </Button>
            </div>
          </motion.div>

          {/* Bild rechts – image.png (neues Bild) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl"
          >
            <Image
              src="/familie.png"
              alt="Familie liest ihr persönliches Bilderbuch"
              fill
              className="object-cover object-top"
              priority
            />
          </motion.div>
        </div>
      </div>

      {/* Beispiel Buchseite */}
      <div className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          <div className="text-center space-y-3">
            <h2
              className="text-3xl font-bold text-brand-800"
              style={{ fontFamily: "var(--font-display)" }}
            >
              So sieht dein fertiges Buch aus
            </h2>
            <p className="text-gray-400 text-sm">
              Jede Geschichte bekommt ihren eigenen Stil – hier ein Beispiel im Comic-Look
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-3xl mx-auto bg-white"
          >
            <Image
              src="/Comic.png"
              alt="Beispiel Buchseite im Comic-Stil"
              width={900}
              height={650}
              className="w-full h-auto"
            />
          </motion.div>

          {/* Startseite_Bild als zweites Beispiel – nur auf Über-uns */}
        </div>
      </div>

      {/* So einfach geht's */}
      <div className="bg-brand-50 py-20">
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
                className="text-center p-6 rounded-2xl bg-white shadow-sm space-y-3"
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
      <div className="bg-white py-10 border-t border-brand-50">
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

      {/* Referenzen */}
      <div className="bg-brand-50 py-20">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-bold">
              ⭐ Über 30.000 glückliche Kunden
            </div>
            <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
              Was unsere Kunden sagen
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {REVIEWS.map((r) => (
              <motion.div
                key={r.name}
                whileHover={{ y: -3 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-brand-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <span className="text-xs text-brand-300 bg-brand-50 px-2 py-1 rounded-full">{r.occasion}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">"{r.text}"</p>
                <p className="text-brand-700 font-medium text-sm">— {r.name}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
            {[
              { number: "30.000+", label: "glückliche Kunden" },
              { number: "4.9 ★", label: "Durchschnittsbewertung" },
              { number: "5–7", label: "Werktage Lieferzeit" },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="text-2xl font-bold text-brand-700">{s.number}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
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
      <Footer />
    </div>
  );
}
