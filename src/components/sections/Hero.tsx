import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface HeroProps {
  isNight: boolean;
}

export function Hero({ isNight }: HeroProps) {
  const { t } = useTranslation("home");

  return (
    <section className="relative min-h-dvh flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-1000",
          isNight
            ? "bg-gradient-to-b from-[#070B14] via-[#0A1628] to-[#070B14]"
            : "bg-gradient-to-b from-[#E3FAFF] via-[#FAFCFE] to-[#FAFCFE]"
        )}
      />

      {/* Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute -top-1/4 -start-1/4 w-[600px] h-[600px] rounded-full blur-3xl",
            isNight
              ? "bg-[#00E5FF]/8"
              : "bg-[#02BAD6]/10"
          )}
        />
        <motion.div
          animate={{
            x: [0, -20, 30, 0],
            y: [0, 30, -40, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute -bottom-1/4 -end-1/4 w-[600px] h-[600px] rounded-full blur-3xl",
            isNight
              ? "bg-[#8B5CF6]/8"
              : "bg-[#F5A623]/8"
          )}
        />
        {isNight && (
          <motion.div
            animate={{
              x: [0, 40, -30, 0],
              y: [0, -20, 30, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 start-1/3 w-[400px] h-[400px] rounded-full blur-3xl bg-[#FF006E]/5"
          />
        )}
      </div>

      {/* Wave Divider Bottom */}
      <div className="absolute bottom-0 inset-x-0">
        <svg
          viewBox="0 0 1440 120"
          className={cn(
            "w-full h-auto",
            isNight ? "fill-[#070B14]" : "fill-[#FAFCFE]"
          )}
          preserveAspectRatio="none"
        >
          <path d="M0,40 C360,100 720,0 1080,60 C1260,90 1380,70 1440,80 L1440,120 L0,120 Z" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
              isNight
                ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20"
                : "bg-[#02BAD6]/10 text-[#02BAD6] border border-[#02BAD6]/20"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            {t("hero.badge")}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={cn(
            "mt-8 font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]",
            isNight ? "text-white" : "text-[#0A1628]"
          )}
        >
          {t("hero.title")}
          <br />
          <span
            className={cn(
              "bg-clip-text text-transparent",
              isNight
                ? "bg-gradient-to-r from-[#00E5FF] via-[#8B5CF6] to-[#FF006E]"
                : "bg-gradient-to-r from-[#02BAD6] to-[#2563EB]"
            )}
          >
            {t("hero.titleAccent")}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className={cn(
            "mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed",
            isNight ? "text-gray-400" : "text-gray-600"
          )}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => {
              trackEvent("hero-cta-click");
              document
                .getElementById("pricing")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn(
              "px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-300 cursor-pointer",
              isNight
                ? "bg-[#00E5FF] text-[#070B14] hover:bg-[#00E5FF]/90 glow-cyan"
                : "bg-[#02BAD6] text-white hover:bg-[#0891B2] shadow-lg shadow-[#02BAD6]/25"
            )}
          >
            {t("hero.cta")}
          </button>
          <button
            onClick={() =>
              document
                .getElementById("gallery")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className={cn(
              "px-8 py-4 rounded-2xl text-base font-medium transition-all duration-300 cursor-pointer",
              isNight
                ? "border border-white/10 text-gray-300 hover:bg-white/5"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            )}
          >
            {t("gallery.sectionTitle")}
          </button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-24 inset-x-0 flex justify-center"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown
            className={cn(
              "w-6 h-6",
              isNight ? "text-gray-600" : "text-gray-400"
            )}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
