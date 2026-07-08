import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import {
  ApiError,
  type ContactChannel,
  type DepositMethod,
  FOOD_LABELS,
  type FoodFormula,
  type PriceBreakdown,
  type Reservation,
  type ReservationCreate,
  type ReservationUpdate,
  SLOT_LABELS,
  type Slot,
  STATUS_LABELS,
  type Status,
  UnauthorizedError,
  api,
} from "@/lib/api";
import {
  AlertCircle,
  Baby,
  Calendar,
  Check,
  ChefHat,
  ClipboardList,
  Clock,
  Euro,
  HandCoins,
  Instagram,
  Loader2,
  MessageCircle,
  Minus,
  Moon,
  MoreHorizontal,
  Package,
  Percent,
  Phone,
  Plus,
  Save,
  Sparkles,
  Sun,
  Sunset,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ReservationFormProps {
  token: string;
  onUnauthorized: () => void;
  onSaved: () => void;
  /** When provided, the form starts in EDIT mode pre-filled from this row. */
  initial?: Reservation;
  /** Optional back/close handler — when set, an "Annuler" button is shown. */
  onCancel?: () => void;
}

const SLOT_DEFAULT_HOURS: Record<Slot, { start: string; end: string }> = {
  morning: { start: "10:00", end: "14:00" },
  afternoon: { start: "14:00", end: "18:00" },
  evening: { start: "18:00", end: "22:00" },
  night: { start: "22:00", end: "02:00" },
};

const SLOT_ICONS: Record<Slot, typeof Sun> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  night: Sparkles,
};

const DEPOSIT_METHODS: { value: DepositMethod; label: string }[] = [
  { value: "wero", label: "Wero" },
  { value: "revolut", label: "Revolut" },
  { value: "paypal", label: "PayPal" },
  { value: "cash", label: "Espèces" },
  { value: "other", label: "Autre" },
];

const CONTACT_CHANNELS: {
  value: ContactChannel;
  label: string;
  Icon: typeof Phone;
}[] = [
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "phone", label: "Téléphone", Icon: Phone },
  { value: "other", label: "Autre", Icon: MoreHorizontal },
];

const inputClass =
  "w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 placeholder-gray-600 rounded-xl px-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors";

const selectClass =
  "w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 rounded-xl px-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors appearance-none";

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Build an ISO datetime in Europe/Paris for the given date + time. */
function toParisIso(dateIso: string, time: string, addDays = 0): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // Construct a Date interpreted in the BROWSER local TZ. The admin is in
  // Europe/Paris, so this matches; for other TZs the offset would shift.
  const local = new Date(y!, (m! - 1), d! + addDays, h, mi, 0);
  return local.toISOString();
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3 rounded-t-2xl">
        <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#02BAD6]" />
        </div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 30,
  label,
  icon: Icon,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400 text-sm">{label}</span>
        {hint && <span className="text-gray-600 text-xs">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-11 h-11 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          className={cn(inputClass, "text-center font-semibold text-lg w-20")}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-11 h-11 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * 24h-only time input. `<input type="time">` is OS-controlled (some locales
 * render AM/PM), so this is a text input that enforces HH:MM regardless of
 * platform. Accepts freeform typing ("9", "9:30", "930", "9h30") and
 * normalises on blur — invalid input reverts to the last valid value.
 */
function Time24Input({
  value,
  onChange,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  function commit(raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length === 0) {
      setText(value);
      return;
    }
    let h: number;
    let m: number;
    if (cleaned.length <= 2) {
      h = parseInt(cleaned, 10);
      m = 0;
    } else if (cleaned.length === 3) {
      h = parseInt(cleaned.slice(0, 1), 10);
      m = parseInt(cleaned.slice(1), 10);
    } else {
      h = parseInt(cleaned.slice(0, 2), 10);
      m = parseInt(cleaned.slice(2, 4), 10);
    }
    if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) {
      setText(value);
      return;
    }
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setText(formatted);
    onChange(formatted);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
      autoComplete="off"
      aria-label={ariaLabel}
      value={text}
      placeholder="HH:MM"
      maxLength={5}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={cn("tabular-nums", className)}
    />
  );
}

function DatePickerField({
  date,
  setDate,
}: {
  date: string;
  setDate: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = date ? new Date(date + "T00:00:00") : undefined;

  return (
    <div className="block" ref={ref}>
      <span className="text-gray-400 text-sm mb-1.5 block">Date *</span>
      <div className="relative">
        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            inputClass,
            "pl-11 text-left cursor-pointer w-full",
            !date && "text-gray-600",
          )}
        >
          {date ? formatDateDisplay(date) : "JJ/MM/AAAA"}
        </button>
        {open && (
          <div className="absolute z-50 mt-2 left-0 bg-gray-900 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-4 noozha-datepicker">
            <DayPicker
              mode="single"
              locale={fr}
              selected={selected}
              onSelect={(d) => {
                if (d) {
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  setDate(iso);
                }
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Extract local YYYY-MM-DD + HH:MM strings from an ISO timestamp. */
function localParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function ReservationForm({
  token,
  onUnauthorized,
  onSaved,
  initial,
  onCancel,
}: ReservationFormProps) {
  const isEdit = initial !== undefined;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Defaults: blank form OR snapshot of `initial` when editing.
  const seed = useMemo(() => {
    if (!initial) {
      return {
        client: "",
        telephone: "",
        contactChannel: "whatsapp" as ContactChannel | null,
        date: "",
        slot: "afternoon" as Slot,
        startTime: SLOT_DEFAULT_HOURS.afternoon.start,
        endTime: SLOT_DEFAULT_HOURS.afternoon.end,
        adults: 6,
        children: 0,
        babies: 0,
        foodFormula: "" as FoodFormula | "",
        foodPersons: 0,
        foodChildren: 0,
        foodPlatters: 0,
        discountAmount: 0,
        discountReason: "",
        extraAmount: 0,
        extraReason: "",
        tipAmount: 0,
        depositPaid: false,
        depositMethod: "wero" as DepositMethod,
        status: "pending" as Status,
        notes: "",
      };
    }
    const startParts = localParts(initial.start_at);
    const endParts = localParts(initial.end_at);
    return {
      client: initial.customer_name,
      telephone: initial.customer_phone,
      contactChannel: initial.contact_channel,
      date: startParts.date,
      slot: initial.slot,
      startTime: startParts.time,
      endTime: endParts.time,
      adults: initial.adults,
      children: initial.children,
      babies: initial.babies ?? 0,
      foodFormula: (initial.food_formula ?? "") as FoodFormula | "",
      foodPersons: initial.food_persons ?? 0,
      foodChildren: initial.food_children ?? 0,
      foodPlatters: initial.food_platters ?? 0,
      discountAmount: Number(initial.discount_amount),
      discountReason: initial.discount_reason ?? "",
      extraAmount: Number(initial.extra_amount),
      extraReason: initial.extra_reason ?? "",
      tipAmount: Number(initial.tip_amount),
      depositPaid: initial.deposit_paid,
      depositMethod: (initial.deposit_method ?? "wero") as DepositMethod,
      status: initial.status,
      notes: initial.notes ?? "",
    };
  }, [initial]);

  // Form state
  const [client, setClient] = useState(seed.client);
  const [telephone, setTelephone] = useState(seed.telephone);
  const [contactChannel, setContactChannel] = useState<ContactChannel | null>(
    seed.contactChannel,
  );
  const [date, setDate] = useState(seed.date);
  const [slot, setSlot] = useState<Slot>(seed.slot);
  const [startTime, setStartTime] = useState(seed.startTime);
  const [endTime, setEndTime] = useState(seed.endTime);
  const [adults, setAdults] = useState(seed.adults);
  const [children, setChildren] = useState(seed.children);
  const [babies, setBabies] = useState(seed.babies);
  const [foodFormula, setFoodFormula] = useState<FoodFormula | "">(seed.foodFormula);
  const [foodPersons, setFoodPersons] = useState(seed.foodPersons);
  const [foodChildren, setFoodChildren] = useState(seed.foodChildren);
  const [foodPlatters, setFoodPlatters] = useState(seed.foodPlatters);
  // The legacy per-person platters formula (platters_14) only exists on old
  // reservations. We surface it as a 4th chip during edit so the admin can
  // recognise it and, if desired, migrate to the new per-platter formula.
  const legacyPlatterEdit = seed.foodFormula === "platters_14";
  const [discountAmount, setDiscountAmount] = useState(seed.discountAmount);
  const [discountReason, setDiscountReason] = useState(seed.discountReason);
  const [extraAmount, setExtraAmount] = useState(seed.extraAmount);
  const [extraReason, setExtraReason] = useState(seed.extraReason);
  const [tipAmount, setTipAmount] = useState(seed.tipAmount);
  const [depositPaid, setDepositPaid] = useState(seed.depositPaid);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>(seed.depositMethod);
  const [status, setStatus] = useState<Status>(seed.status);
  const [notes, setNotes] = useState(seed.notes);

  // When slot changes, reset start/end to that slot's defaults.
  const setSlotAndReset = useCallback((newSlot: Slot) => {
    setSlot(newSlot);
    setStartTime(SLOT_DEFAULT_HOURS[newSlot].start);
    setEndTime(SLOT_DEFAULT_HOURS[newSlot].end);
  }, []);

  // Live price preview via /reservations/estimate (debounced).
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (adults + children < 1) {
      setBreakdown(null);
      return;
    }
    const handle = setTimeout(() => {
      setEstimating(true);
      const isPlatter30 = foodFormula === "platters_30";
      api.reservations
        .estimate(token, {
          slot,
          adults,
          children,
          food_formula: foodFormula || null,
          food_persons: foodFormula && !isPlatter30 ? foodPersons : null,
          food_children: foodFormula && !isPlatter30 ? foodChildren : 0,
          food_platters: isPlatter30 ? foodPlatters : 0,
          discount_amount: discountAmount,
          extra_amount: extraAmount,
          tip_amount: tipAmount,
        })
        .then(setBreakdown)
        .catch((err) => {
          if (err instanceof UnauthorizedError) onUnauthorized();
        })
        .finally(() => setEstimating(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [token, slot, adults, children, foodFormula, foodPersons, foodChildren, foodPlatters, discountAmount, extraAmount, tipAmount, onUnauthorized]);

  const tierLabel = useMemo<string>(() => {
    if (!breakdown) return "—";
    return { small: "≤6 personnes", medium: "7-10 personnes", large: "11-15 personnes" }[
      breakdown.tier
    ];
  }, [breakdown]);

  function resetForm() {
    if (isEdit) return; // editing: keep values until parent unmounts
    setClient("");
    setTelephone("");
    setContactChannel("whatsapp");
    setDate("");
    setSlotAndReset("afternoon");
    setAdults(6);
    setChildren(0);
    setBabies(0);
    setFoodFormula("");
    setFoodPersons(0);
    setFoodChildren(0);
    setFoodPlatters(0);
    setDiscountAmount(0);
    setDiscountReason("");
    setExtraAmount(0);
    setExtraReason("");
    setTipAmount(0);
    setDepositPaid(false);
    setDepositMethod("wero");
    setStatus("pending");
    setNotes("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    try {
      // Compare custom hours vs slot defaults — only override when different.
      const defaults = SLOT_DEFAULT_HOURS[slot];
      const startOverride = startTime !== defaults.start;
      const endOverride = endTime !== defaults.end;
      const crossesMidnight = slot === "night";

      const isPlatter30 = foodFormula === "platters_30";
      const payload: Record<string, unknown> = {
        slot,
        date,
        ...(startOverride ? { start_at: toParisIso(date, startTime) } : {}),
        ...(endOverride
          ? { end_at: toParisIso(date, endTime, crossesMidnight ? 1 : 0) }
          : {}),
        customer_name: client.trim(),
        customer_phone: telephone.trim(),
        contact_channel: contactChannel,
        adults,
        children,
        babies,
        food_formula: foodFormula || null,
        food_persons: foodFormula && !isPlatter30 ? foodPersons : null,
        food_children: foodFormula && !isPlatter30 ? foodChildren : 0,
        food_platters: isPlatter30 ? foodPlatters : 0,
        discount_amount: discountAmount,
        discount_reason: discountReason.trim() || null,
        extra_amount: extraAmount,
        extra_reason: extraReason.trim() || null,
        tip_amount: tipAmount,
        deposit_paid: depositPaid,
        deposit_method: depositPaid ? depositMethod : null,
        status,
        notes: notes.trim() || null,
      };

      // In edit mode, when the current form has no food formula, tell the
      // backend to explicitly reset food fields. Without this flag, the
      // backend's partial-update semantics (null = "no change") would keep
      // the previous food formula in place. `clear_food` is edit-only —
      // sending it on create would fail schema validation (extra="forbid").
      if (isEdit && !foodFormula) {
        payload.clear_food = true;
      }

      if (isEdit && initial) {
        await api.reservations.update(token, initial.id, payload as ReservationUpdate);
      } else {
        await api.reservations.create(token, payload as unknown as ReservationCreate);
      }
      setSuccess(true);
      resetForm();
      onSaved();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erreur lors de la création.");
      }
    } finally {
      setSubmitting(false);
    }
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
              {isEdit ? "Réservation mise à jour" : "Réservation créée avec succès"}
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

        {/* Client */}
        <SectionCard icon={User} title="Informations client">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-400 text-sm mb-1.5 block">Nom *</span>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className={cn(inputClass, "pl-11")}
                    placeholder="Fatima B."
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-gray-400 text-sm mb-1.5 block">Téléphone</span>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className={cn(inputClass, "pl-11")}
                    placeholder="06 12 34 56 78 (optionnel)"
                  />
                </div>
              </label>
            </div>
            <div>
              <span className="text-gray-400 text-sm mb-2 block">
                Canal de contact
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CONTACT_CHANNELS.map(({ value, label, Icon }) => {
                  const active = contactChannel === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setContactChannel(value)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2",
                        active
                          ? "bg-[#02BAD6]/10 border-[#02BAD6] text-[#02BAD6]"
                          : "bg-gray-800/30 border-white/[0.08] text-gray-300 hover:border-white/[0.15]",
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Réservation : date + slot picker + horaires */}
        <SectionCard icon={Calendar} title="Créneau">
          <div className="space-y-5">
            <DatePickerField date={date} setDate={setDate} />

            <div>
              <span className="text-gray-400 text-sm mb-2 block">Catégorie tarifaire *</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(SLOT_LABELS) as Slot[]).map((s) => {
                  const Icon = SLOT_ICONS[s];
                  const active = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlotAndReset(s)}
                      className={cn(
                        "p-3 rounded-xl border transition-all duration-200 text-left",
                        active
                          ? "bg-[#02BAD6]/10 border-[#02BAD6] text-[#02BAD6]"
                          : "bg-gray-800/30 border-white/[0.08] text-gray-300 hover:border-white/[0.15]",
                      )}
                    >
                      <Icon className="w-4 h-4 mb-1.5" />
                      <p className="text-sm font-semibold">{SLOT_LABELS[s].name}</p>
                      <p className="text-xs text-gray-500">{SLOT_LABELS[s].time}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-400 text-sm mb-1.5 block">
                  Heure de début
                </span>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Time24Input
                    ariaLabel="Heure de début (24h)"
                    value={startTime}
                    onChange={setStartTime}
                    className={cn(inputClass, "pl-11")}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-gray-400 text-sm mb-1.5 block">Heure de fin</span>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Time24Input
                    ariaLabel="Heure de fin (24h)"
                    value={endTime}
                    onChange={setEndTime}
                    className={cn(inputClass, "pl-11")}
                  />
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Format 24h (ex. 14:00). Horaires modifiables — la catégorie tarifaire reste celle choisie ci-dessus.
            </p>
          </div>
        </SectionCard>

        {/* Personnes */}
        <SectionCard icon={Users} title="Personnes">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Stepper
              label="Adultes"
              icon={User}
              value={adults}
              onChange={setAdults}
              min={0}
              max={30}
            />
            <Stepper
              label="Enfants"
              icon={Baby}
              hint="< 12 ans, -50%"
              value={children}
              onChange={setChildren}
              min={0}
              max={30}
            />
            <Stepper
              label="Bébés"
              icon={Baby}
              hint="≤ 3 ans, gratuit"
              value={babies}
              onChange={setBabies}
              min={0}
              max={20}
            />
          </div>
        </SectionCard>

        {/* Repas (optionnel) */}
        <SectionCard icon={ChefHat} title="Repas (optionnel)">
          <div className="space-y-4">
            {legacyPlatterEdit && foodFormula === "platters_14" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Ancienne formule (14€/pers)</p>
                  <p className="text-amber-300/70 mt-0.5">
                    Cette réservation a été prise avant le passage au nouveau tarif.
                    Choisissez « Plateaux à partager » ci-dessous pour appliquer le
                    nouveau tarif 30€/plateau, ou laissez tel quel pour conserver le prix d'origine.
                  </p>
                </div>
              </div>
            )}
            <div>
              <span className="text-gray-400 text-sm mb-2 block">Formule</span>
              <div
                className={cn(
                  "grid gap-2",
                  legacyPlatterEdit
                    ? "grid-cols-1 sm:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-3",
                )}
              >
                {(
                  [
                    { v: "", label: "Aucun", price: "" },
                    {
                      v: "platters_30",
                      label: "Plateaux à partager",
                      price: "30€/plateau (~40 pièces)",
                    },
                    {
                      v: "menu_19",
                      label: "Menu traditionnel",
                      price: "19€/pers",
                    },
                    ...(legacyPlatterEdit
                      ? [
                          {
                            v: "platters_14" as const,
                            label: "Ancienne formule",
                            price: "14€/pers (héritée)",
                          },
                        ]
                      : []),
                  ] as { v: FoodFormula | ""; label: string; price: string }[]
                ).map((opt) => {
                  const active = foodFormula === opt.v;
                  const isLegacy = opt.v === "platters_14";
                  return (
                    <button
                      key={opt.v || "none"}
                      type="button"
                      onClick={() => {
                        setFoodFormula(opt.v);
                        if (!opt.v) {
                          setFoodPersons(0);
                          setFoodChildren(0);
                          setFoodPlatters(0);
                          setDepositPaid(false);
                        } else if (opt.v === "platters_30") {
                          // Nouveau plateau : reset les compteurs "pers" et
                          // proposer 1 plateau par défaut (min raisonnable).
                          setFoodPersons(0);
                          setFoodChildren(0);
                          if (foodPlatters === 0) setFoodPlatters(1);
                        } else {
                          // Menu (ou legacy platters_14) : passer sur pers/enfants
                          setFoodPlatters(0);
                          if (foodPersons === 0) {
                            setFoodPersons(adults + children);
                            setFoodChildren(children);
                          }
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border transition-all duration-200 text-left",
                        active
                          ? isLegacy
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-[#02BAD6]/10 border-[#02BAD6] text-[#02BAD6]"
                          : isLegacy
                            ? "bg-amber-500/[0.04] border-amber-500/20 text-amber-300/60 hover:border-amber-500/40"
                            : "bg-gray-800/30 border-white/[0.08] text-gray-300 hover:border-white/[0.15]",
                      )}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      {opt.price && <p className="text-xs opacity-70">{opt.price}</p>}
                    </button>
                  );
                })}
              </div>
            </div>

            {foodFormula === "platters_30" && (
              <div className="space-y-2 pt-2">
                <div className="max-w-xs">
                  <Stepper
                    label="Nombre de plateaux"
                    icon={Package}
                    value={foodPlatters}
                    onChange={setFoodPlatters}
                    min={1}
                    max={20}
                  />
                </div>
                {(() => {
                  const totalPieces = foodPlatters * 40;
                  const totalGuests = adults + children;
                  const perGuest = totalGuests > 0
                    ? Math.round(totalPieces / totalGuests)
                    : 0;
                  return (
                    <p className="text-xs text-gray-500">
                      ≈ {totalPieces} pièces au total
                      {totalGuests > 0 && ` · ~${perGuest} pièces/pers pour ${totalGuests} pers`}
                    </p>
                  );
                })()}
              </div>
            )}

            {(foodFormula === "menu_19" || foodFormula === "platters_14") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <Stepper
                  label="Adultes au repas"
                  icon={User}
                  value={Math.max(0, foodPersons - foodChildren)}
                  onChange={(adultsMeal) => {
                    const total = adultsMeal + foodChildren;
                    setFoodPersons(total);
                  }}
                  min={0}
                  max={30}
                />
                <Stepper
                  label="Enfants au repas"
                  icon={Baby}
                  hint="-50% sur le repas"
                  value={foodChildren}
                  onChange={(childrenMeal) => {
                    const adultsMeal = Math.max(0, foodPersons - foodChildren);
                    setFoodChildren(childrenMeal);
                    setFoodPersons(adultsMeal + childrenMeal);
                  }}
                  min={0}
                  max={30}
                />
              </div>
            )}
            {(foodFormula === "menu_19" || foodFormula === "platters_14") && (
              <p className="text-xs text-gray-500">
                Total au repas : {foodPersons} personne{foodPersons !== 1 ? "s" : ""}
                {foodChildren > 0 && ` (dont ${foodChildren} enfant${foodChildren !== 1 ? "s" : ""} à -50%)`}
              </p>
            )}
          </div>
        </SectionCard>

        {/* Supplément (agreed at booking, e.g. extra platter au devis) */}
        <SectionCard icon={Package} title="Supplément au devis (optionnel)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Montant (€)</span>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(Number(e.target.value) || 0)}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Libellé</span>
              <input
                type="text"
                value={extraReason}
                onChange={(e) => setExtraReason(e.target.value)}
                className={inputClass}
                placeholder="Plateau supp. au devis, extra…"
              />
            </label>
          </div>
        </SectionCard>

        {/* Remise */}
        <SectionCard icon={Percent} title="Remise (optionnel)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Montant (€)</span>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className={cn(inputClass, "pl-11")}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Raison</span>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className={inputClass}
                placeholder="Geste commercial, fidélité…"
              />
            </label>
          </div>
        </SectionCard>

        {/* Pourboire — typiquement renseigné après la visite */}
        <SectionCard icon={HandCoins} title="Pourboire (optionnel)">
          <label className="block max-w-xs">
            <span className="text-gray-400 text-sm mb-1.5 block">
              Montant reçu en plus (€)
            </span>
            <div className="relative">
              <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/60" />
              <input
                type="number"
                min={0}
                step="0.01"
                value={tipAmount}
                onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                className={cn(
                  inputClass,
                  "pl-11",
                  tipAmount > 0 && "border-emerald-500/30 bg-emerald-500/[0.03]",
                )}
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Ajouté au total. À remplir typiquement après la visite.
            </p>
          </label>
        </SectionCard>

        {/* Acompte + Statut + Notes */}
        <SectionCard icon={ClipboardList} title="Suivi">
          <div className="space-y-4">
            {foodFormula ? (
              <>
                <label
                  htmlFor="acompte"
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200",
                    depositPaid
                      ? "bg-[#02BAD6]/10 border-[#02BAD6]/30"
                      : "bg-gray-800/30 border-white/[0.06] hover:border-white/[0.12]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200",
                        depositPaid ? "bg-[#02BAD6]/20" : "bg-gray-700/50",
                      )}
                    >
                      <Wallet
                        className={cn(
                          "w-4 h-4 transition-colors duration-200",
                          depositPaid ? "text-[#02BAD6]" : "text-gray-500",
                        )}
                      />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors duration-200",
                          depositPaid ? "text-[#02BAD6]" : "text-gray-300",
                        )}
                      >
                        Acompte reçu
                      </p>
                      <p className="text-xs text-gray-500">
                        10€ — requis car repas commandé
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="acompte"
                      checked={depositPaid}
                      onChange={(e) => setDepositPaid(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 rounded-full bg-gray-700 peer-checked:bg-[#02BAD6] transition-colors duration-200" />
                    <div
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                        depositPaid && "translate-x-5",
                      )}
                    />
                  </div>
                </label>

                {depositPaid && (
                  <label className="block">
                    <span className="text-gray-400 text-sm mb-1.5 block">Méthode acompte</span>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value as DepositMethod)}
                      className={selectClass}
                    >
                      {DEPOSIT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <div className="p-3 rounded-lg bg-gray-800/30 border border-white/[0.04] text-xs text-gray-500">
                Acompte non demandé (pas de repas commandé).
              </div>
            )}

            <label className="block">
              <span className="text-gray-400 text-sm mb-1.5 block">Statut</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className={selectClass}
              >
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
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
                placeholder="Allergies, demandes particulières…"
              />
            </label>
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          )}
          <motion.button
            type="submit"
            disabled={submitting || !date}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex-1 bg-[#02BAD6] hover:bg-[#00d4f5] text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2",
              (submitting || !date) && "opacity-60 cursor-not-allowed",
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
                {isEdit ? "Enregistrer les modifications" : "Enregistrer la réservation"}
              </>
            )}
          </motion.button>
        </div>
      </form>

      {/* Live price preview — sticky right column on desktop */}
      <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
        <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <Euro className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1">
              Total
            </h3>
            {estimating && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
          </div>
          <div className="p-6">
            <p
              className="text-4xl font-bold text-[#02BAD6] mb-3"
              style={{ textShadow: "0 0 20px rgba(2,186,214,0.3)" }}
            >
              {breakdown?.grand_total.toFixed(2) ?? "—"} €
            </p>
            <div className="text-gray-500 text-xs space-y-1 mb-4">
              <p>
                Tier : <span className="text-gray-300">{tierLabel}</span>
              </p>
              {breakdown && (
                <>
                  <p>
                    Adulte : {breakdown.adult_unit_price}€ × {adults} ={" "}
                    {(breakdown.adult_unit_price * adults).toFixed(2)}€
                  </p>
                  {children > 0 && (
                    <p>
                      Enfant : {breakdown.child_unit_price}€ × {children} ={" "}
                      {(breakdown.child_unit_price * children).toFixed(2)}€
                    </p>
                  )}
                  {breakdown.food_total > 0 && foodFormula && (
                    <div className="space-y-0.5">
                      {FOOD_LABELS[foodFormula].per === "platter" ? (
                        <p>
                          Repas {FOOD_LABELS[foodFormula].name} :{" "}
                          <span className="text-gray-300">
                            {foodPlatters} plateau{foodPlatters !== 1 ? "x" : ""} × {FOOD_LABELS[foodFormula].unit}€ = {breakdown.food_total.toFixed(2)}€
                          </span>
                        </p>
                      ) : (
                        <>
                          <p>
                            Repas {FOOD_LABELS[foodFormula].name} ({FOOD_LABELS[foodFormula].unit}€/pers) :
                          </p>
                          <p className="pl-3">
                            {Math.max(0, foodPersons - foodChildren)} ad ×{" "}
                            {FOOD_LABELS[foodFormula].unit}€
                            {foodChildren > 0 && (
                              <>
                                {" + "}
                                {foodChildren} enf × {(FOOD_LABELS[foodFormula].unit / 2).toFixed(2)}€
                              </>
                            )}
                            {" = "}
                            <span className="text-gray-300">
                              {breakdown.food_total.toFixed(2)}€
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  {breakdown.extra > 0 && (
                    <p className="text-sky-400">
                      Supplément : +{breakdown.extra.toFixed(2)}€
                      {extraReason && ` (${extraReason})`}
                    </p>
                  )}
                  {breakdown.discount > 0 && (
                    <p className="text-amber-400">
                      Remise : −{breakdown.discount.toFixed(2)}€
                    </p>
                  )}
                  {breakdown.tip > 0 && (
                    <p className="text-emerald-400">
                      Pourboire : +{breakdown.tip.toFixed(2)}€
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
