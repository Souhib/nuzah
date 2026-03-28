import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { MapPin, Train, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationProps {
  isNight: boolean;
}

export function Location({ isNight }: LocationProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const details = [
    { icon: MapPin, text: t("location.address") },
    { icon: Train, text: t("location.transport") },
    { icon: Car, text: t("location.parking") },
  ];

  return (
    <section
      ref={ref}
      id="location"
      className={cn(
        "py-24 md:py-32 px-6",
        isNight ? "bg-[#070B14]" : "bg-[#FAFCFE]"
      )}
    >
      <div className="mx-auto max-w-6xl">
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
            {t("location.sectionTitle")}
          </span>
          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("location.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Map Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={cn(
              "aspect-[4/3] rounded-3xl overflow-hidden border",
              isNight
                ? "border-white/5 bg-[#0F1923]"
                : "border-gray-200/60 bg-gray-100"
            )}
          >
            <iframe
              title="Chelles location"
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d2.603372!3d48.886361!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sfr!2sfr!4v1"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p
              className={cn(
                "text-lg leading-relaxed mb-8",
                isNight ? "text-gray-400" : "text-gray-600"
              )}
            >
              {t("location.description")}
            </p>

            <div className="space-y-4">
              {details.map((item) => (
                <div
                  key={item.text}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border",
                    isNight
                      ? "bg-white/[0.02] border-white/5"
                      : "bg-white border-gray-200/60 shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      isNight
                        ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                        : "bg-[#02BAD6]/10 text-[#02BAD6]"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span
                    className={cn(
                      "font-medium",
                      isNight ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
