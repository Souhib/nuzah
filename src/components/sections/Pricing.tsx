import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef } from "react";
import {
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Check,
  Users,
  ShieldCheck,
  Eye,
  MessageCircle,
  Clock,
  ChefHat,
  Info,
  Wallet,
  CalendarX,
  HeartHandshake,
  PartyPopper,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface PricingProps {
  isNight: boolean;
}

type GroupSize = "small" | "medium" | "large";

const slotKeys = ["morning", "afternoon", "evening", "night"] as const;

const slotIcons = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  night: Sparkles,
};

const slotGradients = {
  morning: {
    day: "from-amber-50 to-orange-50",
    night: "from-amber-950/20 to-orange-950/20",
  },
  afternoon: {
    day: "from-sky-50 to-cyan-50",
    night: "from-sky-950/20 to-cyan-950/20",
  },
  evening: {
    day: "from-violet-50 to-purple-50",
    night: "from-violet-950/20 to-purple-950/20",
  },
  night: {
    day: "from-indigo-50 to-blue-50",
    night: "from-indigo-950/30 to-blue-950/30",
  },
};

export function Pricing({ isNight }: PricingProps) {
  const { t, i18n } = useTranslation("pricing");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [groupSize, setGroupSize] = useState<GroupSize>("small");

  const groups: { key: GroupSize; label: string }[] = [
    { key: "small", label: t("groups.small") },
    { key: "medium", label: t("groups.medium") },
    { key: "large", label: t("groups.large") },
  ];

  const features = t("features", { returnObjects: true }) as string[];

  return (
    <section
      ref={ref}
      id="pricing"
      className={cn(
        "py-24 md:py-32 px-6",
        isNight ? "bg-[#070B14]" : "bg-[#FAFCFE]"
      )}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span
            className={cn(
              "text-sm font-semibold uppercase tracking-wider",
              isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
            )}
          >
            {t("sectionTitle")}
          </span>
          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("title")}
          </h2>
          <p
            className={cn(
              "mt-4 text-lg max-w-2xl mx-auto",
              isNight ? "text-gray-400" : "text-gray-600"
            )}
          >
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Privacy Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={cn(
            "mx-auto max-w-3xl mb-12 p-6 rounded-2xl border text-center",
            isNight
              ? "bg-[#8B5CF6]/5 border-[#8B5CF6]/15"
              : "bg-purple-50/80 border-purple-200/40"
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye
              className={cn(
                "w-5 h-5",
                isNight ? "text-[#8B5CF6]" : "text-purple-500"
              )}
            />
            <h3
              className={cn(
                "text-base font-semibold",
                isNight ? "text-[#8B5CF6]" : "text-purple-700"
              )}
            >
              {t("privacy.title")}
            </h3>
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed",
              isNight ? "text-gray-400" : "text-gray-600"
            )}
          >
            {t("privacy.description")}
          </p>
          <p
            className={cn(
              "mt-2 text-sm font-medium",
              isNight ? "text-[#8B5CF6]/80" : "text-purple-600"
            )}
          >
            {t("privacy.women")}
          </p>
        </motion.div>

        {/* Group Size Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div
            className={cn(
              "inline-flex rounded-full p-1 border",
              isNight
                ? "bg-white/[0.03] border-white/5"
                : "bg-gray-100 border-gray-200/60"
            )}
          >
            {groups.map((group) => (
              <button
                key={group.key}
                onClick={() => {
                  setGroupSize(group.key);
                  trackEvent("pricing-view", { slot: group.key });
                }}
                className={cn(
                  "relative px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap",
                  groupSize === group.key
                    ? isNight
                      ? "text-[#070B14]"
                      : "text-white"
                    : isNight
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                )}
              >
                {groupSize === group.key && (
                  <motion.div
                    layoutId="groupTab"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      isNight ? "bg-[#00E5FF]" : "bg-[#02BAD6]"
                    )}
                    transition={{ type: "spring", duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {group.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Time Slot Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {slotKeys.map((slotKey, i) => {
            const Icon = slotIcons[slotKey];
            const isPopular = t(`slots.${slotKey}.popular`, {
              defaultValue: "",
            });
            const isPremium = t(`slots.${slotKey}.premium`, {
              defaultValue: "",
            });
            const price = t(`slots.${slotKey}.${groupSize}`);
            const gradient = slotGradients[slotKey];

            return (
              <motion.div
                key={slotKey}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className={cn(
                  "relative group rounded-3xl border overflow-hidden transition-all duration-300",
                  isNight
                    ? cn(
                        "border-white/5 hover:border-[#00E5FF]/20 bg-gradient-to-b",
                        gradient.night
                      )
                    : cn(
                        "border-gray-200/60 hover:border-[#02BAD6]/30 hover:shadow-xl bg-gradient-to-b",
                        gradient.day
                      ),
                  isPopular &&
                    (isNight
                      ? "ring-1 ring-[#00E5FF]/30"
                      : "ring-2 ring-[#02BAD6]/30"),
                  isPremium &&
                    (isNight
                      ? "ring-1 ring-[#8B5CF6]/30"
                      : "ring-2 ring-purple-300/50")
                )}
              >
                {/* Badge */}
                {(isPopular || isPremium) && (
                  <div
                    className={cn(
                      "absolute top-4 end-4 px-3 py-1 rounded-full text-xs font-semibold",
                      isPremium
                        ? isNight
                          ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                          : "bg-purple-100 text-purple-700"
                        : isNight
                          ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                          : "bg-[#02BAD6]/10 text-[#02BAD6]"
                    )}
                  >
                    {isPremium ? t("premium") : t("popular")}
                  </div>
                )}

                <div className="p-6">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        slotKey === "night"
                          ? isNight
                            ? "bg-[#8B5CF6]/15 text-[#8B5CF6]"
                            : "bg-purple-100 text-purple-600"
                          : slotKey === "evening"
                            ? isNight
                              ? "bg-[#FF006E]/10 text-[#FF006E]"
                              : "bg-orange-100 text-orange-600"
                            : isNight
                              ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                              : "bg-[#02BAD6]/10 text-[#02BAD6]"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold",
                          isNight ? "text-white" : "text-[#0A1628]"
                        )}
                      >
                        {t(`slots.${slotKey}.name`)}
                      </h3>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          isNight ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        {t(`slots.${slotKey}.time`)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    className={cn(
                      "text-sm mb-6 min-h-[40px]",
                      isNight ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    {t(`slots.${slotKey}.description`)}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${slotKey}-${groupSize}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-baseline gap-1"
                      >
                        <span
                          className={cn(
                            "text-4xl font-bold font-heading",
                            slotKey === "night"
                              ? isNight
                                ? "text-[#8B5CF6] glow-text-cyan"
                                : "text-purple-600"
                              : isNight
                                ? "text-[#00E5FF] glow-text-cyan"
                                : "text-[#02BAD6]"
                          )}
                        >
                          {price}€
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            isNight ? "text-gray-500" : "text-gray-400"
                          )}
                        >
                          {t("perSlot")}
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Book CTA */}
                  <button
                    onClick={() => {
                      const slotName = t(`slots.${slotKey}.name`);
                      const slotTime = t(`slots.${slotKey}.time`);
                      const groupLabel =
                        groups.find((g) => g.key === groupSize)?.label ?? "";
                      const lines =
                        i18n.language === "ar"
                          ? `مرحباً! أود حجز المسبح.\nالفترة: ${slotName} (${slotTime})\nالمجموعة: ${groupLabel}\nالسعر: ${price}€`
                          : i18n.language === "en"
                            ? `Hello! I'd like to book the pool.\nSlot: ${slotName} (${slotTime})\nGroup: ${groupLabel}\nPrice: ${price}€`
                            : `Bonjour ! Je souhaite réserver la piscine.\nCréneau : ${slotName} (${slotTime})\nGroupe : ${groupLabel}\nPrix : ${price}€`;
                      const msg = encodeURIComponent(lines);
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                      slotKey === "night"
                        ? isNight
                          ? "bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90 glow-violet"
                          : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25"
                        : isNight
                          ? "bg-[#00E5FF] text-[#070B14] hover:bg-[#00E5FF]/90 glow-cyan"
                          : "bg-[#02BAD6] text-white hover:bg-[#0891B2] shadow-lg shadow-[#02BAD6]/25"
                    )}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t("bookSlot")}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Food Add-on */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.65 }}
          className={cn(
            "mb-12 p-8 rounded-3xl border",
            isNight
              ? "bg-gradient-to-br from-amber-950/10 to-orange-950/10 border-amber-500/10"
              : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/40"
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isNight
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-amber-100 text-amber-600"
              )}
            >
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-lg font-semibold",
                  isNight ? "text-white" : "text-[#0A1628]"
                )}
              >
                {t("food.title")}
              </h3>
              <p
                className={cn(
                  "text-sm italic",
                  isNight ? "text-amber-400/70" : "text-amber-700/70"
                )}
              >
                {t("food.subtitle")}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {(
              t("food.items", { returnObjects: true }) as {
                name: string;
                description: string;
                price: string;
              }[]
            ).map((item) => (
              <div
                key={item.name}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300",
                  isNight
                    ? "bg-white/[0.03] border-white/5 hover:border-amber-500/20"
                    : "bg-white/80 border-amber-200/30 hover:border-amber-300 hover:shadow-md"
                )}
              >
                <h4
                  className={cn(
                    "font-semibold text-base",
                    isNight ? "text-white" : "text-[#0A1628]"
                  )}
                >
                  {item.name}
                </h4>
                <p
                  className={cn(
                    "text-xs mt-1 mb-4",
                    isNight ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  {item.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-2xl font-bold font-heading",
                      isNight ? "text-amber-400" : "text-amber-600"
                    )}
                  >
                    {item.price}€
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isNight ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    {t("food.perPerson")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className={cn(
              "flex items-center gap-2 mt-5 text-xs",
              isNight ? "text-gray-500" : "text-gray-400"
            )}
          >
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            {t("food.notice")}
          </div>
        </motion.div>

        {/* Events & Takeaway */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className={cn(
              "flex flex-col p-8 rounded-3xl border",
              isNight
                ? "bg-gradient-to-br from-pink-950/10 to-rose-950/10 border-pink-500/10"
                : "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200/40"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isNight
                    ? "bg-pink-500/15 text-pink-400"
                    : "bg-pink-100 text-pink-600"
                )}
              >
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    isNight ? "text-white" : "text-[#0A1628]"
                  )}
                >
                  {t("events.title")}
                </h3>
                <p
                  className={cn(
                    "text-sm italic",
                    isNight ? "text-pink-400/70" : "text-pink-700/70"
                  )}
                >
                  {t("events.subtitle")}
                </p>
              </div>
            </div>

            <p
              className={cn(
                "text-sm leading-relaxed mt-4",
                isNight ? "text-gray-400" : "text-gray-600"
              )}
            >
              {t("events.description")}
            </p>

            <div
              className={cn(
                "text-xs font-medium mt-3 mb-6 space-y-1",
                isNight ? "text-pink-400/60" : "text-pink-700/60"
              )}
            >
              <p>{t("events.examplesCeremonies")}</p>
              <p>{t("events.examplesFestivals")}</p>
            </div>

            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  i18n.language === "ar"
                    ? "مرحباً! أود الاستفسار عن تنظيم مناسبة خاصة بجانب المسبح."
                    : i18n.language === "en"
                      ? "Hello! I'd like to inquire about hosting a private event by the pool."
                      : "Bonjour ! Je souhaite organiser un événement privé au bord de la piscine."
                );
                window.open(`https://wa.me/?text=${msg}`, "_blank");
              }}
              className={cn(
                "mt-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                isNight
                  ? "bg-pink-500 text-white hover:bg-pink-500/90"
                  : "bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-500/25"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              {t("events.cta")}
            </button>
          </motion.div>

          {/* Takeaway */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.75 }}
            className={cn(
              "flex flex-col p-8 rounded-3xl border",
              isNight
                ? "bg-gradient-to-br from-lime-950/10 to-green-950/10 border-lime-500/10"
                : "bg-gradient-to-br from-lime-50 to-green-50 border-lime-200/40"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isNight
                    ? "bg-lime-500/15 text-lime-400"
                    : "bg-lime-100 text-lime-600"
                )}
              >
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    isNight ? "text-white" : "text-[#0A1628]"
                  )}
                >
                  {t("takeaway.title")}
                </h3>
                <p
                  className={cn(
                    "text-sm italic",
                    isNight ? "text-lime-400/70" : "text-lime-700/70"
                  )}
                >
                  {t("takeaway.subtitle")}
                </p>
              </div>
            </div>

            <p
              className={cn(
                "text-sm leading-relaxed mt-4",
                isNight ? "text-gray-400" : "text-gray-600"
              )}
            >
              {t("takeaway.description")}
            </p>

            <div
              className={cn(
                "text-xs font-medium mt-3 mb-6 space-y-1",
                isNight ? "text-lime-400/60" : "text-lime-700/60"
              )}
            >
              <p>{t("takeaway.examplesSavoury")}</p>
              <p>{t("takeaway.examplesSweet")}</p>
            </div>

            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  i18n.language === "ar"
                    ? "مرحباً! أود تقديم طلب أطعمة للاستلام."
                    : i18n.language === "en"
                      ? "Hello! I'd like to place a takeaway food order."
                      : "Bonjour ! Je souhaite passer une commande à emporter."
                );
                window.open(`https://wa.me/?text=${msg}`, "_blank");
              }}
              className={cn(
                "mt-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                isNight
                  ? "bg-lime-500 text-[#070B14] hover:bg-lime-500/90"
                  : "bg-lime-500 text-white hover:bg-lime-600 shadow-lg shadow-lime-500/25"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              {t("takeaway.cta")}
            </button>
          </motion.div>
        </div>

        {/* Stay Longer + Included */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stay Longer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className={cn(
              "p-6 rounded-2xl border text-center flex flex-col items-center justify-center",
              isNight
                ? "bg-[#00E5FF]/5 border-[#00E5FF]/10"
                : "bg-[#E3FAFF] border-[#02BAD6]/15"
            )}
          >
            <Clock
              className={cn(
                "w-8 h-8 mb-3",
                isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
              )}
            />
            <p
              className={cn(
                "text-base font-semibold",
                isNight ? "text-white" : "text-[#0A1628]"
              )}
            >
              {t("stayLonger")}
            </p>
          </motion.div>

          {/* Included Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className={cn(
              "p-6 rounded-2xl border",
              isNight
                ? "bg-white/[0.02] border-white/5"
                : "bg-white border-gray-200/60"
            )}
          >
            <h4
              className={cn(
                "text-sm font-semibold uppercase tracking-wider mb-4",
                isNight ? "text-gray-400" : "text-gray-500"
              )}
            >
              {t("included")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {features.map((feature: string) => (
                <div key={feature} className="flex items-center gap-2.5">
                  {feature.includes("vis-à-vis") ||
                  feature.includes("privacy") ||
                  feature.includes("إطلالة") ? (
                    <ShieldCheck
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isNight ? "text-[#8B5CF6]" : "text-purple-500"
                      )}
                    />
                  ) : (
                    <Check
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      isNight ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Booking & Cancellation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.85 }}
          className={cn(
            "mt-12 p-8 rounded-3xl border",
            isNight
              ? "bg-gradient-to-br from-emerald-950/10 to-teal-950/10 border-emerald-500/10"
              : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/40"
          )}
        >
          <h3
            className={cn(
              "text-lg font-semibold mb-6",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("booking.title")}
          </h3>

          <div className="grid sm:grid-cols-3 gap-5">
            <div
              className={cn(
                "p-5 rounded-2xl border",
                isNight
                  ? "bg-white/[0.03] border-white/5"
                  : "bg-white/80 border-emerald-200/30"
              )}
            >
              <Wallet
                className={cn(
                  "w-6 h-6 mb-3",
                  isNight ? "text-emerald-400" : "text-emerald-600"
                )}
              />
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isNight ? "text-gray-300" : "text-gray-700"
                )}
              >
                {t("booking.deposit")}
              </p>
              <p
                className={cn(
                  "mt-3 text-xs font-semibold tracking-wider",
                  isNight ? "text-emerald-400/60" : "text-emerald-600/60"
                )}
              >
                {t("booking.methods")}
              </p>
            </div>

            <div
              className={cn(
                "p-5 rounded-2xl border",
                isNight
                  ? "bg-white/[0.03] border-white/5"
                  : "bg-white/80 border-emerald-200/30"
              )}
            >
              <CalendarX
                className={cn(
                  "w-6 h-6 mb-3",
                  isNight ? "text-emerald-400" : "text-emerald-600"
                )}
              />
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isNight ? "text-gray-300" : "text-gray-700"
                )}
              >
                {t("booking.cancel")}
              </p>
            </div>

            <div
              className={cn(
                "p-5 rounded-2xl border",
                isNight
                  ? "bg-white/[0.03] border-white/5"
                  : "bg-white/80 border-emerald-200/30"
              )}
            >
              <HeartHandshake
                className={cn(
                  "w-6 h-6 mb-3",
                  isNight ? "text-emerald-400" : "text-emerald-600"
                )}
              />
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isNight ? "text-gray-300" : "text-gray-700"
                )}
              >
                {t("booking.cancelLate")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
