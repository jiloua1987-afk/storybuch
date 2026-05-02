"use client";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

const REASONS = [
  { title: "Das persönlichste Geschenk",  desc: "Kein Gutschein, kein Standardgeschenk – ein Buch, das nur für diese eine Person existiert. Mit echten Erinnerungen, echten Momenten." },
  { title: "Erinnerungen für immer",      desc: "Fotos verschwinden in der Cloud. Ein gedrucktes Buch bleibt – im Regal, auf dem Nachttisch, in der Familie." },
  { title: "Kein Aufwand",               desc: "Stichpunkte reichen. Wir kümmern uns um Text, Illustrationen und Layout. Du musst nichts ausformulieren." },
  { title: "Professionell gestaltet",     desc: "Jede Seite wird individuell illustriert – im Comic-, Aquarell- oder Skizzenstil. Kein Fotobuch von der Stange." },
  { title: "Druckfertig geliefert",       desc: "Hard- oder Softcover, hochwertig gedruckt, direkt zu dir nach Hause. In 5–7 Werktagen." },
  { title: "In jeder Sprache",            desc: "Dein Buch kann auf Deutsch, Englisch, Französisch oder Spanisch erstellt werden – perfekt als Geschenk ins Ausland." },
];

const OCCASIONS = [
  { label: "Hochzeit & Jahrestag" },
  { label: "Geburt & erstes Jahr" },
  { label: "Geburtstag" },
  { label: "Urlaub & Reisen" },
  { label: "Familiengeschichten" },
  { label: "Abitur & Abschluss" },
  { label: "Biografie & Lebenswerk" },
  { label: "Freundschaft" },
];

export default function UeberUns() {
  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7]">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="inline-block bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-200">
              Über MyComicStory
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
              Wir glauben, dass jede Geschichte es verdient, erzählt zu werden.
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              MyComicStory wurde mit einer einfachen Idee gegründet: Jeder Mensch hat Geschichten, die es wert sind, bewahrt zu werden. Urlaubserinnerungen, Liebesgeschichten, Familienmomente – sie verschwinden viel zu schnell im Alltag.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Wir machen es einfach, diese Momente in einen wunderschönen, illustrierten Comic zu verwandeln. Kein Schreibtalent nötig. Keine Designkenntnisse. Nur deine Erinnerungen.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
            <Image src="/Startseite_Bild.png" alt="MyComicStory Produkt" fill className="object-cover object-top" />
          </motion.div>
        </section>

        {/* Warum */}
        <section className="bg-white py-24">
          <div className="max-w-5xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900">Warum MyComicStory?</h2>
              <p className="text-gray-600 text-lg">Weil Erinnerungen mehr verdienen als einen Ordner auf dem Handy.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {REASONS.map((r, i) => (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="space-y-3 border-t border-brand-300 pt-5"
                >
                  <h3 className="font-display text-lg font-semibold text-gray-900">{r.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{r.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Anlässe */}
        <section className="bg-brand-50 py-24">
          <div className="max-w-5xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900">Für jeden Anlass</h2>
              <p className="text-gray-600 text-lg">Das persönlichste Geschenk – egal zu welchem Anlass.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OCCASIONS.map((o) => (
                <div key={o.label} className="bg-white rounded-xl px-4 py-5 text-center border border-brand-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-200">
                  <p className="text-sm font-medium text-gray-900">{o.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
