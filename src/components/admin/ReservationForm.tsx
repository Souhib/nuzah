import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Column,
  type TableSchema,
  UnauthorizedError,
  calculateMontant,
  createRecord,
  getSchema,
} from "@/lib/nocodb";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Euro,
  Loader2,
  Phone,
  Save,
  User,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ReservationFormProps {
  token: string;
  onUnauthorized: () => void;
  onCreated: () => void;
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSelectOptions(columns: Column[], title: string): string[] {
  const col = columns.find((c) => normalize(c.title) === normalize(title));
  if (!col?.colOptions?.options) return [];
  return col.colOptions.options.map((o) => o.title);
}

function getColumnTitle(columns: Column[], searchTitle: string): string {
  const col = columns.find(
    (c) => normalize(c.title) === normalize(searchTitle),
  );
  return col?.title ?? searchTitle;
}

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#02BAD6]" />
        </div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 placeholder-gray-600 rounded-xl px-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors";

const selectClass =
  "w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 rounded-xl px-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors";

export function ReservationForm({
  token,
  onUnauthorized,
  onCreated,
}: ReservationFormProps) {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [client, setClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [date, setDate] = useState("");
  const [creneau, setCreneau] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState(1);
  const [formule, setFormule] = useState("");
  const [montant, setMontant] = useState(0);
  const [montantOverride, setMontantOverride] = useState(false);
  const [acompteRecu, setAcompteRecu] = useState(false);
  const [statut, setStatut] = useState("");
  const [notes, setNotes] = useState("");
  const [tarifOpen, setTarifOpen] = useState(false);

  const columns = schema?.columns ?? [];
  const creneauOptions = useMemo(() => getSelectOptions(columns, "Creneau"), [columns]);
  const formuleOptions = useMemo(() => getSelectOptions(columns, "Formule"), [columns]);
  const statutOptions = useMemo(() => getSelectOptions(columns, "Statut"), [columns]);

  useEffect(() => {
    getSchema(token)
      .then((s) => {
        setSchema(s);
        const crOpts = getSelectOptions(s.columns, "Creneau");
        const fOpts = getSelectOptions(s.columns, "Formule");
        const sOpts = getSelectOptions(s.columns, "Statut");
        if (crOpts[0] && !creneau) setCreneau(crOpts[0]);
        if (fOpts[0] && !formule) setFormule(fOpts[0]);
        if (sOpts[0] && !statut) setStatut(sOpts[0]);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          onUnauthorized();
        } else {
          setError("Impossible de charger le schema");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const recalculate = useCallback(() => {
    if (creneau) {
      setMontant(calculateMontant(creneau, nbPersonnes, formule));
      setMontantOverride(false);
    }
  }, [creneau, nbPersonnes, formule]);

  useEffect(() => {
    if (!montantOverride && creneau) {
      setMontant(calculateMontant(creneau, nbPersonnes, formule));
    }
  }, [creneau, nbPersonnes, formule, montantOverride]);

  const breakdown = useMemo(() => {
    if (!creneau) return null;
    const c = creneau.toLowerCase();
    const n = nbPersonnes;
    let base = 0;

    if (c.includes("journ")) {
      if (n <= 20) base = n * 40;
      else if (n <= 30) base = n * 35;
      else if (n <= 40) base = n * 32;
      else base = n * 28;
    } else if (c.includes("nuit")) {
      base = n <= 6 ? 180 : n <= 10 ? 210 : 240;
    } else if (c.includes("soir")) {
      base = n <= 6 ? 150 : n <= 10 ? 175 : 200;
    } else if (c.includes("matin") || c.includes("apr")) {
      base = n <= 6 ? 120 : n <= 10 ? 140 : 160;
    }

    let mealUnit = 0;
    const f = formule.toLowerCase();
    if (!c.includes("journ")) {
      if (f.includes("menu complet")) mealUnit = 15;
      else if (f.includes("plat seul")) mealUnit = 10;
    }

    const meal = mealUnit * n;
    return { base, mealUnit, meal };
  }, [creneau, nbPersonnes, formule]);

  function resetForm() {
    setClient("");
    setTelephone("");
    setDate("");
    setCreneau(creneauOptions[0] ?? "");
    setNbPersonnes(1);
    setFormule(formuleOptions[0] ?? "");
    setMontant(0);
    setMontantOverride(false);
    setAcompteRecu(false);
    setStatut(statutOptions[0] ?? "");
    setNotes("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    const TZ = "+02:00";
    const creneauHours: Record<string, [string, string]> = {
      "10": ["10:00", "14:00"],
      "14": ["14:00", "18:00"],
      "18": ["18:00", "22:00"],
      "22": ["22:00", "02:00"],
    };

    let startDateTime = date;
    let endDateTime = date;

    const c = creneau.toLowerCase();
    if (c.includes("journ")) {
      startDateTime = `${date}T10:00:00${TZ}`;
      endDateTime = `${date}T22:00:00${TZ}`;
    } else {
      const hourKey = Object.keys(creneauHours).find((k) => creneau.includes(k));
      if (hourKey) {
        const [startH, endH] = creneauHours[hourKey];
        startDateTime = `${date}T${startH}:00${TZ}`;
        if (endH === "02:00") {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nd = nextDay.toISOString().split("T")[0];
          endDateTime = `${nd}T${endH}:00${TZ}`;
        } else {
          endDateTime = `${date}T${endH}:00${TZ}`;
        }
      }
    }

    const record: Record<string, unknown> = {
      [getColumnTitle(columns, "Client")]: client,
      [getColumnTitle(columns, "Telephone")]: telephone,
      [getColumnTitle(columns, "Date")]: startDateTime,
      [getColumnTitle(columns, "Fin")]: endDateTime,
      [getColumnTitle(columns, "Creneau")]: creneau,
      [getColumnTitle(columns, "Nb personnes")]: nbPersonnes,
      [getColumnTitle(columns, "Formule")]: formule,
      [getColumnTitle(columns, "Montant")]: montant,
      [getColumnTitle(columns, "Acompte recu")]: acompteRecu,
      [getColumnTitle(columns, "Statut")]: statut,
      [getColumnTitle(columns, "Notes")]: notes || undefined,
    };

    try {
      await createRecord(token, record);
      setSuccess(true);
      resetForm();
      onCreated();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      } else {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la creation",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[#02BAD6] animate-spin" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2"
            >
              <Check className="w-5 h-5 shrink-0" />
              Reservation creee avec succes
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionCard icon={User} title="Informations client">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Client *</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Telephone *</span>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Reservation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Date *</span>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Creneau *</span>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  required
                  value={creneau}
                  onChange={(e) => setCreneau(e.target.value)}
                  className={cn(selectClass, "pl-11")}
                >
                  {creneauOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Nb personnes *</span>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={nbPersonnes}
                  onChange={(e) => setNbPersonnes(Number(e.target.value))}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Formule</span>
              <select
                value={formule}
                onChange={(e) => setFormule(e.target.value)}
                className={selectClass}
              >
                {formuleOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard icon={Euro} title="Tarification">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-gray-400 text-sm">Montant</span>
              {montantOverride && (
                <button
                  type="button"
                  onClick={recalculate}
                  className="text-xs text-[#02BAD6] hover:text-[#00d4f5] underline"
                >
                  Recalculer
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">EUR</span>
              <input
                type="number"
                value={montant}
                onChange={(e) => {
                  setMontant(Number(e.target.value));
                  setMontantOverride(true);
                }}
                className={cn(inputClass, "pl-14")}
              />
            </div>
            {breakdown && (
              <p className="text-gray-500 text-xs mt-2">
                Base: {breakdown.base} EUR
                {breakdown.mealUnit > 0 &&
                  ` + Repas: ${nbPersonnes} x ${breakdown.mealUnit} EUR = ${breakdown.meal} EUR`}
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={ClipboardList} title="Statut & Notes">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="acompte"
                checked={acompteRecu}
                onChange={(e) => setAcompteRecu(e.target.checked)}
                className="w-4 h-4 rounded border-white/[0.08] bg-gray-800/50 text-[#02BAD6] focus:ring-[#02BAD6]/20"
              />
              <label htmlFor="acompte" className="text-gray-300 text-sm">
                Acompte recu
              </label>
            </div>

            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Statut</span>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className={selectClass}
              >
                {statutOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={cn(inputClass, "resize-y")}
              />
            </label>
          </div>
        </SectionCard>

        <motion.button
          type="submit"
          disabled={submitting}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full bg-[#02BAD6] hover:bg-[#00d4f5] text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2",
            submitting && "opacity-60 cursor-not-allowed",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Enregistrer la reservation
            </>
          )}
        </motion.button>
      </form>

      <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
        <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <Euro className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant total</h3>
          </div>
          <div className="p-6">
            <p
              className="text-4xl font-bold text-[#02BAD6] mb-2"
              style={{ textShadow: "0 0 20px rgba(2,186,214,0.3)" }}
            >
              {montant} EUR
            </p>
            {breakdown && (
              <div className="text-gray-500 text-xs space-y-0.5">
                <p>Base: {breakdown.base} EUR</p>
                {breakdown.mealUnit > 0 && (
                  <p>Repas: {nbPersonnes} x {breakdown.mealUnit} EUR = {breakdown.meal} EUR</p>
                )}
              </div>
            )}
            {montantOverride && (
              <button
                type="button"
                onClick={recalculate}
                className="mt-3 text-xs text-[#02BAD6] hover:text-[#00d4f5] underline"
              >
                Recalculer automatiquement
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setTarifOpen(!tarifOpen)}
            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1 text-left">
              Aide-memoire tarifs
            </h3>
            <motion.div animate={{ rotate: tarifOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {tarifOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-4 text-sm text-gray-300">
                  <div>
                    <p className="text-gray-500 font-medium mb-2 text-xs uppercase tracking-wider">Creneaux (4h)</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left pb-1" />
                          <th className="text-right pb-1">6 pers</th>
                          <th className="text-right pb-1">7-10</th>
                          <th className="text-right pb-1">11-15</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        <tr>
                          <td className="py-1.5">Matin / Aprem</td>
                          <td className="text-right">120</td>
                          <td className="text-right">140</td>
                          <td className="text-right">160</td>
                        </tr>
                        <tr>
                          <td className="py-1.5">Soiree</td>
                          <td className="text-right">150</td>
                          <td className="text-right">175</td>
                          <td className="text-right">200</td>
                        </tr>
                        <tr>
                          <td className="py-1.5">Nuit</td>
                          <td className="text-right">180</td>
                          <td className="text-right">210</td>
                          <td className="text-right">240</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="text-gray-500 font-medium mb-2 text-xs uppercase tracking-wider">Journee complete</p>
                    <div className="text-xs space-y-0.5">
                      <p>15-20 pers : 40 EUR/pers</p>
                      <p>21-30 pers : 35 EUR/pers</p>
                      <p>31-40 pers : 32 EUR/pers</p>
                      <p>41-50 pers : 28 EUR/pers</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500 font-medium mb-2 text-xs uppercase tracking-wider">Options repas</p>
                    <div className="text-xs space-y-0.5">
                      <p>+ Plat seul : 10 EUR/pers</p>
                      <p>+ Menu complet : 15 EUR/pers</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
