import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { MessageCircle, Phone, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface ContactProps {
  isNight: boolean;
}

export function Contact({ isNight }: ContactProps) {
  const { t } = useTranslation(["home", "common"]);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="contact"
      className={cn(
        "py-24 md:py-32 px-6 relative overflow-hidden",
        isNight ? "bg-[#0A0F1A]" : "bg-[#F0FDFF]"
      )}
    >
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={cn(
            "absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl",
            isNight ? "bg-[#00E5FF]/5" : "bg-[#02BAD6]/5"
          )}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span
            className={cn(
              "text-sm font-semibold uppercase tracking-wider",
              isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
            )}
          >
            {t("home:contact.sectionTitle")}
          </span>

          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("home:contact.title")}
          </h2>

          <div className="flex justify-center my-6">
            <Waves
              className={cn(
                "w-12 h-12",
                isNight ? "text-[#00E5FF]/30" : "text-[#02BAD6]/30"
              )}
            />
          </div>

          <p
            className={cn(
              "text-lg mb-10",
              isNight ? "text-gray-400" : "text-gray-600"
            )}
          >
            {t("home:contact.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* WhatsApp Button */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(t("home:contact.whatsappMessage"))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("contact-whatsapp")}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-300",
              isNight
                ? "bg-[#25D366] text-white hover:bg-[#25D366]/90 shadow-lg shadow-[#25D366]/20"
                : "bg-[#25D366] text-white hover:bg-[#22c35e] shadow-lg shadow-[#25D366]/25"
            )}
          >
            <MessageCircle className="w-5 h-5" />
            {t("common:cta.whatsapp")}
          </a>

          {/* Phone Button */}
          <a
            href="tel:+33000000000"
            onClick={() => trackEvent("contact-phone")}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-medium transition-all duration-300",
              isNight
                ? "border border-white/10 text-gray-300 hover:bg-white/5"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            )}
          >
            <Phone className="w-5 h-5" />
            {t("common:cta.call")}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
