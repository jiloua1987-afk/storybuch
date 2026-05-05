"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Footer from "@/components/Footer";

function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const STEPS = [
  { n: "1", title: "Kategorie, Stil & Bilder",   body: "Wähle deine Geschichte, den Stil und lade optional Fotos hoch." },
  { n: "2", title: "Momente & Dialoge",    body: "Beschreibe die besonderen Momente – wir schlagen Dialoge vor." },
  { n: "3", title: "Comic wird erstellt",    body: "Panels, Illustrationen und Sprechblasen werden vollautomatisch erstellt." },
  { n: "4", title: "Bearbeiten & bestellen", body: "Alles anpassbar in der Vorschau. Erst dann bestellst du." },
];

const BENEFITS = [
  { title: "Kein Schreibtalent nötig",    body: "Stichpunkte reichen – wir kümmern uns um Text, Illustrationen und Layout." },
  { title: "Vorschau vor der Bestellung", body: "Du siehst jede Seite bevor du bestellst. Alles ist bearbeitbar." },
  { title: "Gedruckt und geliefert",      body: "Hard- oder Softcover, hochwertig gedruckt, in 5–7 Werktagen bei dir." },
];

const TESTIMONIALS = [
  { quote: "Unser Sardinien-Urlaub als Comic – die Kinder wollen es jeden Abend lesen. Jedes Panel bringt sie zum Lachen!", name: "Sandra M.", occasion: "Familienurlaub" },
  { quote: "Unsere Liebesgeschichte als Comic bis zur Hochzeit. Die Dialoge treffen uns so genau – wir haben geweint und gelacht.", name: "Julia & Marc", occasion: "Jahrestag" },
  { quote: "Zum 40. Geburtstag meines besten Freundes – unser Freundschafts-Comic. Absoluter Wahnsinn wie persönlich das ist.", name: "Thomas K.", occasion: "Geburtstag" },
  { quote: "Das persönlichste Geschenk, das ich je gemacht habe. Kein Gutschein der Welt kommt da ran.", name: "Petra W.", occasion: "Muttertag" },
];

export default function LandingHero({ onStart }: { onStart: () => void }) {
  const previewRef = useFadeUp();
  const stepsRef   = useFadeUp();
  const benefitRef = useFadeUp();
  const testiRef   = useFadeUp();
  const ctaRef     = useFadeUp();

  return (
    <div className="bg-[#FDF8F2]">

      {/* ── HERO ── */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-28 text-center space-y-7">
        <h1 className="font-display text-4xl md:text-[56px] font-semibold text-gray-900 leading-tight">
          Erlebe deine schönsten Momente als Comic
        </h1>
        <p className="text-[18px] text-gray-600 leading-relaxed max-w-[540px] mx-auto">
          Urlaub, Liebe, Familie – wir verwandeln deine echten Erinnerungen in einen illustrierten Comic mit Dialogen, gedruckt und direkt zu dir nach Hause.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onStart}
            className="bg-brand-600 text-white px-8 py-3.5 rounded-lg text-[15px] font-medium hover:bg-brand-700 transition-colors"
          >
            Jetzt Comic erstellen
          </button>
        </div>
      </section>

      {/* ── COMIC PREVIEW ── */}
      <section className="bg-white py-24">
        <div ref={previewRef} className="fade-up max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-3">
            <div className="w-12 h-0.5 bg-brand-500 mx-auto mb-5" />
            <h2 className="font-display text-3xl md:text-4xl font-medium text-gray-900">
              So sieht dein Comic aus
            </h2>
            <p className="text-gray-600 text-lg">
              Echte Illustrationen, echte Dialoge – jede Erinnerung wird ein Panel.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-md max-w-3xl mx-auto">
            <Image src="/Comic.png" alt="Beispiel Comic-Seite" width={860} height={620} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#FDF8F2] py-24">
        <div ref={stepsRef} className="fade-up max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <div className="w-12 h-0.5 bg-brand-500 mx-auto mb-5" />
            <h2 className="font-display text-3xl md:text-4xl font-medium text-gray-900">
              So einfach geht's
            </h2>
            <p className="text-gray-600 text-lg">
              Keine langen Texte, keine Zeichenkenntnisse – ein paar Stichpunkte genügen.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="bg-white rounded-xl p-8 space-y-4 border border-brand-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-250"
              >
                <div className="w-9 h-9 rounded-full border border-brand-200 flex items-center justify-center">
                  <span className="font-display text-brand-500 font-medium text-[16px]">{s.n}</span>
                </div>
                <h3 className="font-display text-[19px] font-medium text-gray-900">{s.title}</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-white py-24">
        <div ref={benefitRef} className="fade-up max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10">
            {BENEFITS.map((b) => (
              <div key={b.title} className="space-y-3 border-t border-brand-500 pt-6">
                <h3 className="font-display text-[18px] font-medium text-gray-900">{b.title}</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-[#FDF8F2] py-24">
        <div ref={testiRef} className="fade-up max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <p className="text-brand-500 text-sm font-medium">Über 30.000 glückliche Kunden</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-gray-900">
              Was unsere Kunden sagen
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-xl p-8 space-y-4 border border-brand-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-250 relative"
              >
                <span className="absolute top-4 left-6 font-display text-[72px] text-brand-500 opacity-20 leading-none select-none" aria-hidden="true">"</span>
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className="text-brand-500 text-[14px]">★</span>
                  ))}
                </div>
                <p className="font-display italic text-gray-900 text-[16px] leading-relaxed mt-6">
                  "{t.quote}"
                </p>
                <p className="text-[13px] text-gray-600 mt-4">
                  — {t.name} · {t.occasion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-brand-800 py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {[
            { value: "30.000+", label: "Bücher gedruckt" },
            { value: "4,9",     label: "Durchschnittsbewertung" },
            { value: "5–7",     label: "Werktage Lieferzeit" },
          ].map((s) => (
            <div key={s.label} className="text-center py-10 md:py-0 px-8 space-y-2">
              <p className="font-display text-[52px] font-semibold text-brand-500">{s.value}</p>
              <p className="text-[12px] text-brand-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white py-24">
        <div ref={ctaRef} className="fade-up max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-medium text-gray-900">
            Bereit für deinen persönlichen Comic?
          </h2>
          <p className="text-gray-600 text-lg">
            Dauert nur wenige Minuten – Stichpunkte reichen.
          </p>
          <button
            onClick={onStart}
            className="bg-brand-600 text-white px-10 py-4 rounded-lg font-medium text-lg hover:bg-brand-700 transition-colors"
          >
            Jetzt Comic erstellen
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
