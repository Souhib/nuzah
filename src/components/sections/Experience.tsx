import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Lock, Lightbulb, UtensilsCrossed, Waves, Speaker } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExperienceProps {
  isNight: boolean;
}

export function Experience({ isNight }: ExperienceProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: t("experience.stats.size"), label: t("experience.stats.sizeLabel"), icon: Waves },
    { value: t("experience.stats.depth"), label: t("experience.stats.depthLabel"), icon: Waves },
    { value: t("experience.stats.capacity"), label: t("experience.stats.capacityLabel"), icon: Waves },
    { value: t("experience.stats.led"), label: t("experience.stats.ledLabel"), icon: Lightbulb },
  ];

  const features: {
    icon?: LucideIcon;
    emoji?: string;
    title: string;
    desc: string;
  }[] = [
    {
      icon: Lock,
      title: t("experience.features.private"),
      desc: t("experience.features.privateDesc"),
    },
    {
      icon: Lightbulb,
      title: t("experience.features.led"),
      desc: t("experience.features.ledDesc"),
    },
    {
      icon: UtensilsCrossed,
      title: t("experience.features.food"),
      desc: t("experience.features.foodDesc"),
    },
    {
      icon: Speaker,
      title: t("experience.features.music"),
      desc: t("experience.features.musicDesc"),
    },
    {
      emoji: "🏓",
      title: t("experience.features.pingpong"),
      desc: t("experience.features.pingpongDesc"),
    },
    {
      emoji: "🏖️",
      title: t("experience.features.hammock"),
      desc: t("experience.features.hammockDesc"),
    },
    {
      emoji: "🎮",
      title: t("experience.features.switch"),
      desc: t("experience.features.switchDesc"),
    },
    {
      emoji: "🃏",
      title: t("experience.features.boardgames"),
      desc: t("experience.features.boardgamesDesc"),
    },
  ];

  return (
    <section
      ref={ref}
      id="experience"
      className={cn(
        "py-24 md:py-32 px-6",
        isNight ? "bg-[#070B14]" : "bg-[#FAFCFE]"
      )}
    >
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span
            className={cn(
              "text-sm font-semibold uppercase tracking-wider",
              isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
            )}
          >
            {t("experience.sectionTitle")}
          </span>
          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("experience.title")}
          </h2>
          <p
            className={cn(
              "mt-4 max-w-2xl mx-auto text-lg",
              isNight ? "text-gray-400" : "text-gray-600"
            )}
          >
            {t("experience.description")}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "text-center p-6 rounded-2xl border transition-all duration-300",
                isNight
                  ? "bg-white/[0.03] border-white/5 hover:border-[#00E5FF]/20"
                  : "bg-white border-gray-200/60 hover:border-[#02BAD6]/30 shadow-sm"
              )}
            >
              <p
                className={cn(
                  "font-heading text-3xl md:text-4xl font-bold",
                  isNight
                    ? "text-[#00E5FF] glow-text-cyan"
                    : "text-[#02BAD6]"
                )}
              >
                {stat.value}
              </p>
              <p
                className={cn(
                  "mt-2 text-sm font-medium",
                  isNight ? "text-gray-400" : "text-gray-500"
                )}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              className={cn(
                "group p-8 rounded-2xl border transition-all duration-300",
                isNight
                  ? "bg-white/[0.02] border-white/5 hover:border-[#00E5FF]/20 hover:bg-white/[0.04]"
                  : "bg-white border-gray-200/60 hover:border-[#02BAD6]/30 hover:shadow-lg shadow-sm"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors",
                  isNight
                    ? "bg-[#00E5FF]/10 text-[#00E5FF] group-hover:bg-[#00E5FF]/20"
                    : "bg-[#02BAD6]/10 text-[#02BAD6] group-hover:bg-[#02BAD6]/20"
                )}
              >
                {feature.icon ? (
                  <feature.icon className="w-6 h-6" />
                ) : (
                  <span className="text-2xl leading-none">{feature.emoji}</span>
                )}
              </div>
              <h3
                className={cn(
                  "text-lg font-semibold mb-2",
                  isNight ? "text-white" : "text-[#0A1628]"
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isNight ? "text-gray-400" : "text-gray-600"
                )}
              >
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
