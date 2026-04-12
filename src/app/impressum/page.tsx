import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Impressum() {
  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <h1 className="font-display text-4xl font-semibold text-[#1f1a2e]">Impressum</h1>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-8 text-gray-500 leading-relaxed text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold text-[#1f1a2e] text-base">Angaben gemäß § 5 TMG</h2>
              <p>MyComicStory<br />[Vorname Nachname]<br />[Straße Hausnummer]<br />[PLZ Stadt]<br />Deutschland</p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-[#1f1a2e] text-base">Kontakt</h2>
              <p>E-Mail: kontakt@mycomicstory.de</p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-[#1f1a2e] text-base">Umsatzsteuer-ID</h2>
              <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />[USt-IdNr. eintragen]</p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-[#1f1a2e] text-base">Streitschlichtung</h2>
              <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
