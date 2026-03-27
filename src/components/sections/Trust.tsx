import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { ShieldCheck, BadgeCheck, UserCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustProps {
  isNight: boolean;
}

export function Trust({ isNight }: TrustProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const badges = [
    { icon: ShieldCheck, label: t("trust.safety") },
    { icon: BadgeCheck, label: t("trust.insurance") },
    { icon: UserCheck, label: t("trust.verified") },
    { icon: Sparkles, label: t("trust.clean") },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "py-12 px-6",
        isNight ? "bg-[#070B14]" : "bg-[#FAFCFE]"
      )}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full border",
                isNight
                  ? "border-white/5 bg-white/[0.02] text-gray-400"
                  : "border-gray-200/60 bg-white text-gray-500 shadow-sm"
              )}
            >
              <badge.icon
                className={cn(
                  "w-4.5 h-4.5",
                  isNight ? "text-[#00E5FF]/60" : "text-[#02BAD6]/60"
                )}
              />
              <span className="text-sm font-medium">{badge.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
