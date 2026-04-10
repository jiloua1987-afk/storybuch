"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import { PRICE_TABLE } from "@/lib/dummyData";
import toast from "react-hot-toast";

export default function Step6Checkout() {
  const { project, orderDetails, setOrderDetails, setStep, updateProject } = useBookStore();
  const [loading, setLoading] = useState(false);
  const [ordered, setOrdered] = useState(false);

  if (!project) return null;

  const price =
    PRICE_TABLE[orderDetails.coverType][orderDetails.paperQuality] * orderDetails.copies;
  const shipping = 4.99;
  const total = price + shipping;

  const handleOrder = async () => {
    const { name, street, city, zip } = orderDetails.shippingAddress;
    if (!name || !street || !city || !zip) {
      toast.error("Bitte fülle alle Adressfelder aus.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setOrdered(true);
    updateProject({ status: "ordered" });
    toast.success("Bestellung erfolgreich! 🎉");
  };

  const handleExportPDF = () => {
    toast.success("PDF wird vorbereitet… (Demo)");
  };

  if (ordered) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center space-y-8 py-10"
      >
        <div className="text-8xl animate-float">🎉</div>
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
            Bestellung aufgegeben!
          </h2>
          <p className="text-gray-600">
            Dein Buch <strong>„{project.title}"</strong> wird gedruckt und in 5–7 Werktagen geliefert.
          </p>
          <p className="text-sm text-gray-400">
            Du erhältst eine Bestätigungs-E-Mail mit Tracking-Informationen.
          </p>
        </div>
        <div className="bg-brand-50 rounded-2xl p-6 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Bestellnummer</span>
            <span className="font-mono font-medium text-brand-700">#SC-{Date.now().toString().slice(-6)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Lieferung an</span>
            <span className="font-medium text-gray-700">{orderDetails.shippingAddress.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Gesamtbetrag</span>
            <span className="font-bold text-brand-700">{total.toFixed(2)} €</span>
          </div>
        </div>
        <Button onClick={() => setStep(0)} variant="secondary" fullWidth>
          Neues Buch erstellen
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Dein Buch bestellen 🚀
        </h2>
        <p className="text-gray-500">Fast geschafft! Wähle deine Optionen und gib deine Adresse ein.</p>
      </div>

      {/* Cover type */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">📚 Einband</label>
        <div className="grid grid-cols-2 gap-3">
          {(["hardcover", "softcover"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderDetails({ coverType: type })}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                orderDetails.coverType === type
                  ? "border-brand-400 bg-brand-50"
                  : "border-gray-100 bg-white hover:border-brand-200"
              }`}
            >
              <div className="text-2xl mb-1">{type === "hardcover" ? "📕" : "📄"}</div>
              <div className="font-medium text-brand-800 capitalize">{type === "hardcover" ? "Hardcover" : "Softcover"}</div>
              <div className="text-xs text-gray-400 mt-1">
                ab {PRICE_TABLE[type].standard.toFixed(2)} €
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Paper quality */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">🗒️ Papierqualität</label>
        <div className="grid grid-cols-2 gap-3">
          {(["standard", "premium"] as const).map((quality) => (
            <button
              key={quality}
              onClick={() => setOrderDetails({ paperQuality: quality })}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                orderDetails.paperQuality === quality
                  ? "border-brand-400 bg-brand-50"
                  : "border-gray-100 bg-white hover:border-brand-200"
              }`}
            >
              <div className="font-medium text-brand-800 capitalize">
                {quality === "standard" ? "Standard" : "Premium"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {quality === "standard" ? "80g/m² Offsetpapier" : "130g/m² Kunstdruckpapier"}
              </div>
              <div className="text-sm font-bold text-brand-600 mt-1">
                {PRICE_TABLE[orderDetails.coverType][quality].toFixed(2)} €
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Copies */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">🔢 Anzahl Exemplare</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOrderDetails({ copies: Math.max(1, orderDetails.copies - 1) })}
            className="w-10 h-10 rounded-full border-2 border-brand-200 text-brand-600 font-bold hover:bg-brand-50"
          >
            −
          </button>
          <span className="text-2xl font-bold text-brand-800 w-8 text-center">{orderDetails.copies}</span>
          <button
            onClick={() => setOrderDetails({ copies: Math.min(10, orderDetails.copies + 1) })}
            className="w-10 h-10 rounded-full border-2 border-brand-200 text-brand-600 font-bold hover:bg-brand-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Shipping address */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">📦 Lieferadresse</label>
        <div className="grid gap-3">
          {[
            { key: "name", placeholder: "Vor- und Nachname", full: true },
            { key: "street", placeholder: "Straße und Hausnummer", full: true },
            { key: "zip", placeholder: "PLZ", full: false },
            { key: "city", placeholder: "Stadt", full: false },
          ].map(({ key, placeholder, full }) => (
            <input
              key={key}
              value={orderDetails.shippingAddress[key as keyof typeof orderDetails.shippingAddress]}
              onChange={(e) =>
                setOrderDetails({
                  shippingAddress: { ...orderDetails.shippingAddress, [key]: e.target.value },
                })
              }
              placeholder={placeholder}
              className={`p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white ${
                full ? "col-span-2" : ""
              }`}
            />
          ))}
          <select
            value={orderDetails.shippingAddress.country}
            onChange={(e) =>
              setOrderDetails({
                shippingAddress: { ...orderDetails.shippingAddress, country: e.target.value },
              })
            }
            className="p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white"
          >
            {["Deutschland", "Österreich", "Schweiz", "Luxemburg"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Price summary */}
      <div className="bg-brand-50 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-brand-800">Bestellübersicht</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>
              {orderDetails.copies}× {project.title}
            </span>
            <span>{price.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Versand</span>
            <span>{shipping.toFixed(2)} €</span>
          </div>
          <div className="border-t border-brand-200 pt-2 flex justify-between font-bold text-brand-800 text-base">
            <span>Gesamt</span>
            <span>{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* PDF export */}
      <button
        onClick={handleExportPDF}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-200 text-brand-600 text-sm hover:bg-brand-50 transition-all"
      >
        📄 Als PDF exportieren (druckfertig)
      </button>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(4)}>
          ← Zurück
        </Button>
        <Button onClick={handleOrder} loading={loading} fullWidth size="lg">
          Jetzt kaufen – {total.toFixed(2)} €
        </Button>
      </div>
    </motion.div>
  );
}
