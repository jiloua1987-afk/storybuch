"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FAQS = [
  {
    q: "Muss ich gut schreiben können?",
    a: "Nein – Stichpunkte reichen völlig aus. Du gibst uns ein paar Infos: Wer war dabei, wo, wann, was war besonders. Den Rest übernehmen wir. Kein Aufsatz, kein Schreibtalent nötig.",
  },
  {
    q: "Wie lange dauert die Erstellung?",
    a: "Die digitale Vorschau deines Buches ist in wenigen Minuten fertig. Nach der Bestellung wird dein Buch gedruckt und in 5–7 Werktagen geliefert.",
  },
  {
    q: "Kann ich das Buch vor der Bestellung bearbeiten?",
    a: "Ja – du siehst eine vollständige Vorschau bevor du bestellst. Texte, Bilder und Reihenfolge können angepasst werden. Erst wenn du zufrieden bist, bestellst du.",
  },
  {
    q: "Welche Illustrationsstile gibt es?",
    a: "Du kannst zwischen Comic, Aquarell, Bleistift/Skizze und Realistisch wählen. Jeder Stil gibt deinem Buch eine ganz eigene Atmosphäre.",
  },
  {
    q: "Kann ich Fotos hochladen?",
    a: "Ja – das ist optional, aber empfohlen. Je mehr Fotos du hochlädst, desto persönlicher werden die Illustrationen. Deine Bilder werden ausschließlich für dein Buch verwendet.",
  },
  {
    q: "In welchen Sprachen kann das Buch erstellt werden?",
    a: "Aktuell unterstützen wir Deutsch, Englisch, Französisch und Spanisch. Perfekt als Geschenk ins Ausland.",
  },
  {
    q: "Welche Druckoptionen gibt es?",
    a: "Du kannst zwischen Hardcover und Softcover wählen, sowie zwischen Standard- und Premium-Papier. Alle Bücher werden in hochwertiger Druckqualität produziert.",
  },
  {
    q: "Wie kann ich den Status meiner Bestellung verfolgen?",
    a: "Nach der Bestellung erhältst du eine Bestätigungs-E-Mail mit einer DHL-Sendungsnummer. Den aktuellen Lieferstatus kannst du direkt über die DHL Sendungsverfolgung einsehen.",
  },
  {
    q: "Kann ich mehrere Exemplare bestellen?",
    a: "Ja – du kannst bis zu 10 Exemplare pro Bestellung bestellen. Ideal als Geschenk für mehrere Personen.",
  },
  {
    q: "Was passiert mit meinen Daten und Fotos?",
    a: "Deine Daten und Fotos werden ausschließlich zur Erstellung deines Buches verwendet und nicht an Dritte weitergegeben. Du kannst deine Daten jederzeit löschen lassen. Wir sind DSGVO-konform.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-brand-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-center justify-between gap-4"
      >
        <span className="font-medium text-brand-800">{q}</span>
        <span className={`text-brand-400 text-xl transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-500 leading-relaxed text-sm">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <Navbar />
      <main className="bg-gradient-to-br from-brand-50 via-white to-warm-50 min-h-screen">

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
              Häufige Fragen
            </h1>
            <p className="text-gray-400">Alles was du wissen möchtest – auf einen Blick.</p>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-brand-50 px-8 py-2">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* Kontakt */}
        <section className="max-w-2xl mx-auto px-4 pb-20 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-brand-50 p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                Kontakt 💬
              </h2>
              <p className="text-gray-500 leading-relaxed">
                Du hast Fragen oder Anmerkungen? Schreibe uns gerne eine Nachricht. Wir freuen uns auf deine Kontaktaufnahme.
              </p>
              <p className="text-gray-400 text-sm">
                Bitte habe dafür Verständnis, dass wir den Status deiner Bestellung auch nur über die DHL Sendungsverfolgung einsehen können.
              </p>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2"
              >
                <div className="text-4xl">✅</div>
                <p className="font-medium text-green-700">Nachricht gesendet!</p>
                <p className="text-green-600 text-sm">Wir melden uns so schnell wie möglich bei dir.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-brand-700">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Dein Name"
                      className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-brand-700">E-Mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="deine@email.de"
                      className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-brand-700">Nachricht</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder="Deine Frage oder Anmerkung..."
                    className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white py-3 rounded-2xl font-medium hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-200"
                >
                  Nachricht senden ✉️
                </button>
              </form>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
