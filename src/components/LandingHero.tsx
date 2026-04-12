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
  { n: "1", title: "Geschichte eingeben",   body: "Stichpunkte reichen. Wer, wo, wann – mehr brauchen wir nicht." },
  { n: "2", title: "Dialoge vorschlagen",    body: "Wir schlagen passende Dialoge vor – du kannst sie anpassen oder übernehmen." },
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
    <div className="bg-[#fdfaf7]">

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-14 items-center">
        <div className="space-y-7">
          <div className="inline-block bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full border border-purple-100">
            Über 30.000 Bücher gedruckt
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-[#1f1a2e] leading-tight">
            Erlebe deine schönsten Momente als persönlichen Comic.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-md">
            Urlaub, Liebe, Familie – wir verwandeln deine echten Erinnerungen in einen illustrierten Comic mit Dialogen, gedruckt und direkt zu dir nach Hause geliefert.
          </p>
          <p className="text-sm text-purple-500 font-medium">
            Stichpunkte reichen – wir kümmern uns um den Rest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStart}
              className="bg-purple-600 text-white px-7 py-3.5 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              Jetzt Comic erstellen
            </button>
            <button className="border border-gray-200 text-gray-600 px-7 py-3.5 rounded-xl font-medium hover:border-gray-400 transition-colors bg-white">
              Beispiele ansehen
            </button>
          </div>
        </div>
        <div className="relative h-[460px] rounded-2xl overflow-hidden shadow-xl">
          <Image src="/familie.png" alt="MyComicStory" fill className="object-cover object-top" priority />
        </div>
      </section>

      {/* ── COMIC PREVIEW ── */}
      <section className="bg-white py-24">
        <div ref={previewRef} className="fade-up max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#1f1a2e]">
              So sieht dein Comic aus
            </h2>
            <p className="text-gray-500 text-lg">
              Echte Illustrationen, echte Dialoge – jede Erinnerung wird ein Panel.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 max-w-3xl mx-auto">
            <Image src="/Comic.png" alt="Beispiel Comic-Seite" width={860} height={620} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-purple-50 py-24">
        <div ref={stepsRef} className="fade-up max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#1f1a2e]">
              So einfach geht's
            </h2>
            <p className="text-gray-500 text-lg">
              Keine langen Texte, keine Zeichenkenntnisse – ein paar Stichpunkte genügen.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="bg-white rounded-2xl p-7 space-y-4 border border-purple-100 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="font-display text-purple-600 font-semibold text-sm">{s.n}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1f1a2e]">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-[#fdfaf7] py-24">
        <div ref={benefitRef} className="fade-up max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10">
            {BENEFITS.map((b) => (
              <div key={b.title} className="space-y-3 border-t-2 border-purple-200 pt-6">
                <h3 className="font-display text-xl font-semibold text-[#1f1a2e]">{b.title}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-white py-24">
        <div ref={testiRef} className="fade-up max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1 text-purple-400 text-sm font-medium">
              Über 30.000 glückliche Kunden
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#1f1a2e]">
              Was unsere Kunden sagen
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-[#fdfaf7] rounded-2xl p-8 space-y-4 border border-gray-100 hover:-translate-y-1 transition-transform duration-200 relative overflow-hidden"
              >
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map((i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#a855f7">
                      <path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9 3.5 11.4l1.3-4L1.5 5h4z"/>
                    </svg>
                  ))}
                </div>
                <p className="font-display italic text-[#1f1a2e] text-lg leading-relaxed">
                  "{t.quote}"
                </p>
                <p className="text-sm text-gray-400">
                  — {t.name} · {t.occasion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1f1a2e] py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {[
            { value: "30.000+", label: "Bücher gedruckt" },
            { value: "4,9",     label: "Durchschnittsbewertung" },
            { value: "5–7",     label: "Werktage Lieferzeit" },
          ].map((s) => (
            <div key={s.label} className="text-center py-10 md:py-0 px-8 space-y-2">
              <p className="font-display text-5xl font-semibold text-purple-400">{s.value}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-purple-50 py-24">
        <div ref={ctaRef} className="fade-up max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#1f1a2e]">
            Bereit für deinen persönlichen Comic?
          </h2>
          <p className="text-gray-500 text-lg">
            Dauert nur wenige Minuten – Stichpunkte reichen.
          </p>
          <button
            onClick={onStart}
            className="bg-purple-600 text-white px-10 py-4 rounded-xl font-medium text-lg hover:bg-purple-700 transition-colors"
          >
            Jetzt Comic erstellen
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
