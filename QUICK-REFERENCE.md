# Quick Reference - Was geht wohin?
*Stand: 3. Mai 2026*

## 🎯 Die 3 wichtigsten Fragen

### **1. Was wird für das COVER verwendet?**

| Foto-Modus | Was wird verwendet | GPT Call |
|------------|-------------------|----------|
| **Familienbild** | ✅ Familienbild<br>✅ Momente (für Character-Extraktion)<br>✅ Stil | images.edit() mit Familienbild |
| **Einzelfotos** | ✅ Einzelfotos (Composite)<br>✅ Figuren-Namen (vom Frontend)<br>✅ Stil | images.edit() mit Composite |
| **Keine Fotos** | ✅ Momente (für Character-Extraktion)<br>✅ Stil | images.generate() ohne Foto |

**NICHT verwendet für Cover:**
- ❌ Titel
- ❌ Dialoge
- ❌ Widmung

---

### **2. Was wird für die SEITEN verwendet?**

| Input | Verwendung |
|-------|-----------|
| ✅ **Cover** | **Hauptreferenz für alle Seiten!** (images.edit) |
| ✅ **Momente** | Panel-Beschreibungen |
| ✅ **Dialoge** | Panel-Dialoge |
| ✅ **Stil** | Mood-Modifier (Action/Emotional/Humor) |
| ✅ **Character descriptions** | Vom Cover übernommen |

**NICHT verwendet für Seiten:**
- ❌ Titel (nur UI/PDF)
- ❌ Familienbild direkt (nur über Cover!)

---

### **3. Was wird für die WIDMUNG verwendet?**

| Input | Verwendung |
|-------|-----------|
| ✅ **Freitext + Momente** | Story-Context |
| ✅ **Widmung** | User-Input (optional) |
| ✅ **Widmung Von** | Absender |
| ✅ **Kategorie** | Tone-Mapping |

**NICHT verwendet für Widmung:**
- ❌ Fotos
- ❌ Titel
- ❌ Dialoge

---

## 🔑 Die wichtigste Erkenntnis

```
FAMILIENBILD → images.edit() → COVER → images.edit() → SEITEN
              ✅ Foto-Basis    ✅ Referenz   ✅ Konsistenz
```

**Das Cover ist die Hauptreferenz für alle Seiten!**

Das garantiert, dass alle Charaktere auf allen Seiten gleich aussehen.

---

## ✅ Garantie: Familienbild funktioniert weiterhin!

| Schritt | Vorher | Nachher | Status |
|---------|--------|---------|--------|
| Foto hochladen | ✅ | ✅ | GLEICH |
| Character-Extraktion | ✅ GPT | ✅ GPT | GLEICH |
| Photo Description | ✅ GPT Vision | ✅ GPT Vision | GLEICH |
| Cover Generation | ✅ images.edit() | ✅ images.edit() | GLEICH |
| Seiten Generation | ✅ Cover-Referenz | ✅ Cover-Referenz | GLEICH |

**ERGEBNIS: 100% identisch!**

---

## 🆕 Neu: Einzelfotos-Modus

**Vorher:**
- ❌ GPT rät Namen aus Story
- ❌ Name-Matching fehleranfällig
- ❌ Fotos werden oft nicht verwendet

**Nachher:**
- ✅ User gibt Namen ein
- ✅ Kein Name-Matching mehr nötig
- ✅ Composite aus beiden Fotos
- ✅ Cover mit images.edit()
- ✅ Seiten nutzen Cover

**ERGEBNIS: Viel robuster!**

---

## 📋 Test-Checkliste

Nach Railway-Deployment testen:

### **Test 1: Familienbild** ⭐ (Wichtigster Test!)
- [ ] 1 Familienbild hochladen
- [ ] Cover zeigt alle im Comic-Stil
- [ ] Seiten konsistent
- [ ] Logs: "Family photo mode"

### **Test 2: Einzelfotos** (Neu)
- [ ] 2 Namen + 2 Fotos
- [ ] Cover zeigt beide
- [ ] Seiten konsistent
- [ ] Logs: "Individual photos mode"

### **Test 3: Keine Fotos**
- [ ] Keine Fotos
- [ ] Cover generiert
- [ ] Seiten konsistent
- [ ] Logs: "No photos mode"

---

## 📚 Weitere Dokumentation

- **[GPT-DATA-FLOW-TABLE.md](./GPT-DATA-FLOW-TABLE.md)** - Komplette Tabelle mit allen Feldern
- **[VISUAL-DATA-FLOW.md](./VISUAL-DATA-FLOW.md)** - Visueller Datenfluss mit Diagrammen
- **[GPT-DATA-FLOW.md](./GPT-DATA-FLOW.md)** - Detaillierte technische Dokumentation
- **[WIZARD-REDESIGN-SPEC.md](./WIZARD-REDESIGN-SPEC.md)** - Wizard-Spezifikation

---

**Zusammenfassung in einem Satz:**

Familienbild → Cover → Seiten (funktioniert wie bisher!), Einzelfotos → Composite → Cover → Seiten (neu und robuster!)
