import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface FAQProps {
  isNight: boolean;
}

interface FaqItem {
  q: string;
  a: string;
}

export function FAQ({ isNight }: FAQProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = t("faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <section
      ref={ref}
      id="faq"
      className={cn(
        "py-24 md:py-32 px-6",
        isNight ? "bg-[#0A0F1A]" : "bg-[#F0FDFF]"
      )}
    >
      <div className="mx-auto max-w-3xl">
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
            {t("faq.sectionTitle")}
          </span>
          <h2
            className={cn(
              "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
              isNight ? "text-white" : "text-[#0A1628]"
            )}
          >
            {t("faq.title")}
          </h2>
        </motion.div>

        <div className="space-y-3">
          {items.map((item: FaqItem, i: number) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={cn(
                  "rounded-2xl border transition-all duration-200",
                  isOpen
                    ? isNight
                      ? "bg-white/[0.03] border-[#00E5FF]/10"
                      : "bg-white border-[#02BAD6]/20 shadow-md"
                    : isNight
                      ? "border-white/5 hover:bg-white/[0.02]"
                      : "border-gray-200/60 hover:bg-white"
                )}
              >
                <button
                  onClick={() => {
                    if (!isOpen) trackEvent("faq-expand", { question: item.q });
                    setOpenIndex(isOpen ? null : i);
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      "text-base font-medium text-start transition-colors",
                      isOpen
                        ? isNight
                          ? "text-white"
                          : "text-[#0A1628]"
                        : isNight
                          ? "text-gray-300"
                          : "text-gray-700"
                    )}
                  >
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 ms-4"
                  >
                    <ChevronDown
                      className={cn(
                        "w-5 h-5",
                        isOpen
                          ? isNight
                            ? "text-[#00E5FF]"
                            : "text-[#02BAD6]"
                          : isNight
                            ? "text-gray-500"
                            : "text-gray-400"
                      )}
                    />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: { duration: 0.2, ease: "easeOut" },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: { duration: 0.15, ease: "easeIn" },
                      }}
                      className="overflow-hidden"
                    >
                      <p
                        className={cn(
                          "px-6 pb-5 text-sm leading-relaxed",
                          isNight ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
