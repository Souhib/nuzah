import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { CalendarCheck, MessageCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface HowItWorksProps {
  isNight: boolean;
}

export function HowItWorks({ isNight }: HowItWorksProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      icon: CalendarCheck,
      title: t("howItWorks.step1"),
      desc: t("howItWorks.step1Desc"),
      num: "01",
    },
    {
      icon: MessageCircle,
      title: t("howItWorks.step2"),
      desc: t("howItWorks.step2Desc"),
      num: "02",
    },
    {
      icon: PartyPopper,
      title: t("howItWorks.step3"),
      desc: t("howItWorks.step3Desc"),
      num: "03",
    },
  ];

  return (
    <section
      ref={ref}
      id="how-it-works"
      className={cn(
        "py-24 md:py-32 px-6",
        isNight ? "bg-[#0A0F1A]" : "bg-[#F0FDFF]"
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
            {t("howItWorks.sectionTitle")}
          </span>
          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("howItWorks.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line */}
          <div
            className={cn(
              "hidden md:block absolute top-24 inset-x-0 h-px mx-16",
              isNight
                ? "bg-gradient-to-r from-transparent via-[#00E5FF]/20 to-transparent"
                : "bg-gradient-to-r from-transparent via-[#02BAD6]/20 to-transparent"
            )}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className="relative text-center"
            >
              {/* Step Number */}
              <div className="flex justify-center mb-6">
                <div
                  className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center relative z-10",
                    isNight
                      ? "bg-[#0F1923] border border-[#00E5FF]/20"
                      : "bg-white border border-[#02BAD6]/20 shadow-lg"
                  )}
                >
                  <step.icon
                    className={cn(
                      "w-8 h-8",
                      isNight ? "text-[#00E5FF]" : "text-[#02BAD6]"
                    )}
                  />
                </div>
              </div>

              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  isNight ? "text-gray-500" : "text-gray-400"
                )}
              >
                {step.num}
              </span>
              <h3
                className={cn(
                  "mt-2 text-xl font-semibold",
                  isNight ? "text-white" : "text-[#0A1628]"
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  "mt-2 text-sm",
                  isNight ? "text-gray-400" : "text-gray-600"
                )}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
