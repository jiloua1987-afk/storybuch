"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Footer from "@/components/Footer";

// ── Scroll fade-in hook ───────────────────────────────────────────────────────
function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const dur = 1800;
      const tick = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString("de-DE")}{suffix}</span>;
}

const STEPS = [
  { n: "1", title: "Geschichte eingeben",    body: "Stichpunkte reichen. Wer, wo, wann – mehr brauchen wir nicht. Alles andere ist optional." },
  { n: "2", title: "Dialoge vorschlagen",     body: "Wir schlagen passende Dialoge vor – du kannst sie anpassen oder einfach übernehmen." },
  { n: "3", title: "Comic wird erstellt",     body: "Panels, Illustrationen und Sprechblasen werden vollautomatisch für dich erstellt." },
  { n: "4", title: "Bearbeiten & bestellen",  body: "Alles anpassbar in der Vorschau – Texte, Dialoge, Bilder. Erst dann bestellst du." },
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

const STATS = [
  { value: 30000, suffix: "+", label: "Bücher gedruckt" },
  { value: 4.9,   suffix: "",  label: "Durchschnittsbewertung", isDecimal: true },
  { value: 7,     suffix: "",  label: "Werktage Lieferzeit" },
];

export default function LandingHero({ onStart }: { onStart: () => void }) {
  const heroRef    = useRef<HTMLDivElement>(null);
  const previewRef = useFadeUp();
  const stepsRef   = useFadeUp();
  const benefitRef = useFadeUp();
  const testiRef   = useFadeUp();
  const statsRef   = useFadeUp();
  const ctaRef     = useFadeUp();

  return (
    <div style={{ background: "#FDF8F2" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="hero-grain relative overflow-hidden" style={{ paddingTop: "100px", paddingBottom: "120px" }}>
        <div className="relative z-10 max-w-[1120px] mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div className="space-y-8">
            <div
              style={{ border: "1px solid #E8D9C0", display: "inline-flex", alignItems: "center", padding: "6px 16px", borderRadius: "100px" }}
            >
              <span style={{ fontSize: "13px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif" }}>
                Über 30.000 Bücher gedruckt
              </span>
            </div>

            <h1 className="font-display" style={{ fontSize: "clamp(42px, 5vw, 62px)", fontWeight: 600, lineHeight: 1.15, color: "#1A1410" }}>
              Deine Geschichte.<br />
              Als <em style={{ fontStyle: "italic" }}>Comic.</em>
            </h1>

            <p style={{ fontSize: "18px", color: "#8B7355", lineHeight: 1.75, maxWidth: "520px", fontFamily: "'DM Sans', sans-serif" }}>
              Verwandle deine Erinnerungen in einen illustrierten Comic mit echten Dialogen –
              gedruckt und direkt zu dir nach Hause geliefert.
            </p>

            <p style={{ fontSize: "14px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif" }}>
              Stichpunkte reichen – wir kümmern uns um den Rest.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onStart}
                style={{ background: "#1A1410", color: "white", padding: "14px 32px", borderRadius: "8px", fontSize: "15px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                className="hover:opacity-85 transition-opacity duration-200"
              >
                Jetzt Comic erstellen
              </button>
              <button
                style={{ border: "1px solid #E8D9C0", color: "#1A1410", padding: "14px 32px", borderRadius: "8px", fontSize: "15px", fontFamily: "'DM Sans', sans-serif", background: "transparent" }}
                className="hover:border-[#1A1410] transition-colors duration-200"
              >
                Beispiele ansehen
              </button>
            </div>
          </div>

          {/* Right – hero image */}
          <div
            style={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 60px rgba(26,20,16,0.12)" }}
            className="relative h-[480px]"
          >
            <Image src="/image.png" alt="MyComicStory" fill className="object-cover object-top" priority />
          </div>
        </div>
      </section>

      {/* ── COMIC PREVIEW ────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "120px", paddingBottom: "120px", background: "#FDF8F2" }}>
        <div ref={previewRef} className="fade-up max-w-[1120px] mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <div className="gold-line flex justify-center">
              <div style={{ width: "48px", height: "2px", background: "#C9963A", marginBottom: "16px" }} />
            </div>
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: "#1A1410" }}>
              So sieht dein Comic aus
            </h2>
            <p style={{ fontSize: "17px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif" }}>
              Echte Illustrationen, echte Dialoge – jede Erinnerung wird ein Panel.
            </p>
          </div>
          <div
            style={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 40px rgba(26,20,16,0.10)", border: "1px solid #E8D9C0", maxWidth: "860px", margin: "0 auto" }}
          >
            <Image src="/Comic.png" alt="Beispiel Comic-Seite" width={860} height={620} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "120px", paddingBottom: "120px", background: "#F5EDE0" }}>
        <div ref={stepsRef} className="fade-up max-w-[1120px] mx-auto px-6 space-y-14">
          <div className="text-center space-y-4">
            <div style={{ width: "48px", height: "2px", background: "#C9963A", margin: "0 auto 16px" }} />
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: "#1A1410" }}>
              So einfach geht's
            </h2>
            <p style={{ fontSize: "17px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif" }}>
              Keine langen Texte, keine Zeichenkenntnisse – ein paar Stichpunkte genügen.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{ background: "white", border: "1px solid #E8D9C0", borderRadius: "12px", padding: "32px 28px" }}
                className="space-y-4 hover:-translate-y-1 transition-transform duration-250"
              >
                <div
                  style={{ width: "36px", height: "36px", border: "1.5px solid #C9963A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <span className="font-display" style={{ fontSize: "16px", color: "#C9963A", fontWeight: 500 }}>{s.n}</span>
                </div>
                <h3 className="font-display" style={{ fontSize: "20px", fontWeight: 500, color: "#1A1410" }}>{s.title}</h3>
                <p style={{ fontSize: "16px", color: "#8B7355", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "120px", paddingBottom: "120px", background: "#FDF8F2" }}>
        <div ref={benefitRef} className="fade-up max-w-[1120px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {BENEFITS.map((b) => (
              <div key={b.title} className="space-y-4" style={{ borderTop: "2px solid #C9963A", paddingTop: "24px" }}>
                <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 500, color: "#1A1410" }}>{b.title}</h3>
                <p style={{ fontSize: "16px", color: "#8B7355", lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif" }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "120px", paddingBottom: "120px", background: "#F5EDE0" }}>
        <div ref={testiRef} className="fade-up max-w-[1120px] mx-auto px-6 space-y-14">
          <div className="text-center space-y-4">
            <div style={{ width: "48px", height: "2px", background: "#C9963A", margin: "0 auto 16px" }} />
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: "#1A1410" }}>
              Was unsere Kunden sagen
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{ background: "white", border: "1px solid #E8D9C0", borderRadius: "12px", padding: "40px 36px", position: "relative", overflow: "hidden" }}
                className="hover:-translate-y-1 transition-transform duration-250"
              >
                {/* Decorative quote */}
                <span
                  className="font-display"
                  style={{ position: "absolute", top: "12px", left: "24px", fontSize: "72px", color: "#C9963A", opacity: 0.25, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}
                >
                  "
                </span>
                <div className="space-y-5 relative z-10">
                  {/* Stars */}
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#C9963A">
                        <path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9 3.5 11.4l1.3-4L1.5 5h4z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="font-display" style={{ fontSize: "18px", fontStyle: "italic", color: "#1A1410", lineHeight: 1.7 }}>
                    {t.quote}
                  </p>
                  <p style={{ fontSize: "13px", color: "#9E8C75", fontFamily: "'DM Sans', sans-serif" }}>
                    — {t.name} · {t.occasion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ background: "#1A1410", paddingTop: "100px", paddingBottom: "100px" }}>
        <div ref={statsRef} className="fade-up max-w-[1120px] mx-auto px-6">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {STATS.map((s, i) => (
              <div key={i} className="text-center py-10 md:py-0 px-8 space-y-2">
                <p className="font-display" style={{ fontSize: "52px", fontWeight: 500, color: "#C9963A", lineHeight: 1 }}>
                  {s.isDecimal
                    ? <>{s.value}{s.suffix}</>
                    : <Counter target={s.value} suffix={s.suffix} />
                  }
                </p>
                <p style={{ fontSize: "13px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────────────────────── */}
      <section style={{ background: "#F5EDE0", paddingTop: "120px", paddingBottom: "120px" }}>
        <div ref={ctaRef} className="fade-up max-w-[1120px] mx-auto px-6 text-center space-y-8">
          <div style={{ width: "48px", height: "2px", background: "#C9963A", margin: "0 auto 16px" }} />
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 500, color: "#1A1410" }}>
            Bereit für deinen persönlichen Comic?
          </h2>
          <p style={{ fontSize: "17px", color: "#8B7355", fontFamily: "'DM Sans', sans-serif" }}>
            Dauert nur wenige Minuten – Stichpunkte reichen.
          </p>
          <button
            onClick={onStart}
            style={{ background: "#1A1410", color: "white", padding: "16px 48px", borderRadius: "8px", fontSize: "16px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
            className="hover:opacity-85 transition-opacity duration-200"
          >
            Jetzt Comic erstellen
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
