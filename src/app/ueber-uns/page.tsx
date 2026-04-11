"use client";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

const REASONS = [
  {
    emoji: "💥",
    title: "Einzigartig am Markt",
    desc: "Kein Fotobuch, kein Kinderbuch von der Stange – ein personalisierter Comic mit echten Dialogen. Den gibt es nur bei uns.",
  },
  {
    emoji: "💬",
    title: "Echte Dialoge",
    desc: "Jedes Panel hat Sprechblasen mit Dialogen die sich anfühlen als wärst du dabei. Wir schlagen sie vor – du passt sie an.",
  },
  {
    emoji: "✍️",
    title: "Kein Aufwand",
    desc: "Stichpunkte reichen. Wir kümmern uns um Illustrationen, Dialoge und Layout. Du musst nichts ausformulieren.",
  },
  {
    emoji: "🎨",
    title: "Professionell illustriert",
    desc: "Jedes Panel wird individuell im Comic-Stil illustriert – keine Stockfotos, keine Templates.",
  },
  {
    emoji: "📦",
    title: "Druckfertig geliefert",
    desc: "Hard- oder Softcover, hochwertig gedruckt, direkt zu dir nach Hause. In 5–7 Werktagen.",
  },
  {
    emoji: "🌍",
    title: "In jeder Sprache",
    desc: "Dein Comic kann auf Deutsch, Englisch, Französisch oder Spanisch erstellt werden – perfekt als Geschenk ins Ausland.",
  },
];

const OCCASIONS = [
  { emoji: "💍", label: "Hochzeit & Jahrestag" },
  { emoji: "👶", label: "Geburt & erstes Jahr" },
  { emoji: "🎂", label: "Geburtstag" },
  { emoji: "✈️", label: "Urlaub & Reisen" },
  { emoji: "👨‍👩‍👧‍👦", label: "Familiengeschichten" },
  { emoji: "🎓", label: "Abitur & Abschluss" },
  { emoji: "👴", label: "Biografie & Lebenswerk" },
  { emoji: "🤝", label: "Freundschaft" },
];

export default function UeberUns() {
  return (
    <>
      <Navbar />
      <main className="bg-gradient-to-br from-brand-50 via-white to-warm-50 min-h-screen">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium">
              💥 Über MyComicStory
            </div>
            <h1 className="text-4xl font-bold text-brand-900 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              Wir glauben, dass jede Erinnerung es verdient, als Comic erzählt zu werden.
            </h1>
            <p className="text-gray-500 leading-relaxed">
              MyComicStory wurde mit einer einfachen Idee gegründet: Erinnerungen sind zu wertvoll, um in einem Fotoordner zu verschwinden. Urlaubsmomente, Liebesgeschichten, Familienabende – sie verdienen mehr.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Wir machen es einfach, diese Momente in einen personalisierten Comic zu verwandeln – mit echten Illustrationen und Dialogen, die sich anfühlen als wärst du dabei. Kein Schreibtalent nötig. Keine Zeichenkenntnisse. Nur deine Erinnerungen.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative h-96 rounded-3xl overflow-hidden shadow-2xl"
          >
            <Image src="/Startseite_Bild.png" alt="MyStoryBook Produkt" fill className="object-cover object-top" />
          </motion.div>
        </section>

        {/* Warum MyStoryBook */}
        <section className="bg-white py-20">
          <div className="max-w-5xl mx-auto px-4 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                Warum MyComicStory?
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Weil Erinnerungen mehr verdienen als einen Fotoordner auf dem Handy.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {REASONS.map((r, i) => (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-brand-50 space-y-3"
                >
                  <div className="text-3xl">{r.emoji}</div>
                  <h3 className="font-bold text-brand-800">{r.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Anlässe */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                Für jeden Anlass
              </h2>
              <p className="text-gray-400">Das persönlichste Geschenk – egal zu welchem Anlass.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OCCASIONS.map((o) => (
                <motion.div
                  key={o.label}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl p-5 text-center shadow-sm border border-brand-50 space-y-2"
                >
                  <div className="text-3xl">{o.emoji}</div>
                  <div className="text-sm font-medium text-brand-800">{o.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
