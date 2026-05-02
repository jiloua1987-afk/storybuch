"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FAQS = [
  { q: "Muss ich gut schreiben können?", a: "Nein – Stichpunkte reichen völlig aus. Du gibst uns ein paar Infos: Wer war dabei, wo, wann, was war besonders. Den Rest übernehmen wir. Kein Aufsatz, kein Schreibtalent nötig." },
  { q: "Wie lange dauert die Erstellung?", a: "Die digitale Vorschau deines Comics ist in wenigen Minuten fertig. Nach der Bestellung wird dein Buch gedruckt und in 5–7 Werktagen geliefert." },
  { q: "Kann ich das Buch vor der Bestellung bearbeiten?", a: "Ja – du siehst eine vollständige Vorschau bevor du bestellst. Texte, Bilder und Reihenfolge können angepasst werden. Erst wenn du zufrieden bist, bestellst du." },
  { q: "Welche Illustrationsstile gibt es?", a: "Du kannst zwischen Comic, Aquarell, Bleistift/Skizze und Realistisch wählen. Jeder Stil gibt deinem Buch eine ganz eigene Atmosphäre." },
  { q: "Kann ich Fotos hochladen?", a: "Ja – das ist optional, aber empfohlen. Je mehr Fotos du hochlädst, desto persönlicher werden die Illustrationen. Deine Bilder werden ausschließlich für dein Buch verwendet." },
  { q: "In welchen Sprachen kann das Buch erstellt werden?", a: "Aktuell unterstützen wir Deutsch, Englisch, Französisch und Spanisch. Perfekt als Geschenk ins Ausland." },
  { q: "Welche Druckoptionen gibt es?", a: "Du kannst zwischen Hardcover und Softcover wählen, sowie zwischen Standard- und Premium-Papier. Alle Bücher werden in hochwertiger Druckqualität produziert." },
  { q: "Wie kann ich den Status meiner Bestellung verfolgen?", a: "Nach der Bestellung erhältst du eine Bestätigungs-E-Mail mit einer DHL-Sendungsnummer. Den aktuellen Lieferstatus kannst du direkt über die DHL Sendungsverfolgung einsehen." },
  { q: "Kann ich mehrere Exemplare bestellen?", a: "Ja – du kannst bis zu 10 Exemplare pro Bestellung bestellen. Ideal als Geschenk für mehrere Personen." },
  { q: "Was passiert mit meinen Daten und Fotos?", a: "Deine Daten und Fotos werden ausschließlich zur Erstellung deines Buches verwendet und nicht an Dritte weitergegeben. Du kannst deine Daten jederzeit löschen lassen. Wir sind DSGVO-konform." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full text-left py-5 flex items-center justify-between gap-4">
        <span className="font-medium text-gray-900 text-base">{q}</span>
        <span className={`text-brand-400 text-xl transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-600 leading-relaxed text-sm">{a}</p>
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

  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7]">

        <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 space-y-10">
          <div className="text-center space-y-3">
            <h1 className="font-display text-4xl font-semibold text-gray-900">Häufige Fragen</h1>
            <p className="text-gray-600 text-lg">Alles was du wissen möchtest – auf einen Blick.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-8 py-2">
            {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </section>

        {/* Kontakt */}
        <section className="bg-brand-50 py-20">
          <div className="max-w-2xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-brand-200 p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold text-gray-900">Kontakt</h2>
                <p className="text-gray-600 leading-relaxed">
                  Du hast Fragen oder Anmerkungen? Schreibe uns gerne eine Nachricht. Wir freuen uns auf deine Kontaktaufnahme.
                </p>
                <p className="text-gray-500 text-sm">
                  Bitte habe dafür Verständnis, dass wir den Status deiner Bestellung auch nur über die DHL Sendungsverfolgung einsehen können.
                </p>
              </div>
              {sent ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center space-y-2">
                  <p className="font-medium text-green-700">Nachricht gesendet!</p>
                  <p className="text-green-600 text-sm">Wir melden uns so schnell wie möglich bei dir.</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900">Name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Dein Name"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none text-gray-700 bg-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900">E-Mail</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="deine@email.de"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none text-gray-700 bg-white text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">Nachricht</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5}
                      placeholder="Deine Frage oder Anmerkung..."
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none text-gray-700 bg-white resize-none text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors">
                    Nachricht senden
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
