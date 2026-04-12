import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Datenschutz() {
  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <h1 className="font-display text-4xl font-semibold text-[#1f1a2e]">Datenschutzerklärung</h1>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-8 text-gray-500 leading-relaxed text-sm">
            {[
              { title: "1. Verantwortlicher", body: "Verantwortlich für die Datenverarbeitung auf dieser Website ist:\nMyComicStory\n[Straße, PLZ, Stadt]\nE-Mail: kontakt@mycomicstory.de" },
              { title: "2. Erhobene Daten", body: "Wir erheben folgende Daten: Name, E-Mail-Adresse, Lieferadresse, hochgeladene Bilder sowie Texteingaben zur Buchgenerierung. Diese Daten werden ausschließlich zur Erstellung und Lieferung deines Buches verwendet." },
              { title: "3. Bilder und Fotos", body: "Hochgeladene Bilder werden ausschließlich zur Erstellung deines persönlichen Comics verwendet. Sie werden nicht an Dritte weitergegeben und nach Abschluss der Bestellung gelöscht. Du bestätigst beim Upload, dass du die Einwilligung aller abgebildeten Personen hast." },
              { title: "4. Zahlungsdaten", body: "Zahlungen werden über Stripe abgewickelt. Wir speichern keine Kreditkartendaten. Es gelten die Datenschutzbestimmungen von Stripe (stripe.com/privacy)." },
              { title: "5. Deine Rechte", body: "Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten. Wende dich dazu an: kontakt@mycomicstory.de" },
              { title: "6. Cookies", body: "Diese Website verwendet nur technisch notwendige Cookies. Es werden keine Tracking- oder Werbe-Cookies eingesetzt." },
            ].map((s) => (
              <section key={s.title} className="space-y-2">
                <h2 className="font-semibold text-[#1f1a2e] text-base">{s.title}</h2>
                <p style={{ whiteSpace: "pre-line" }}>{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
