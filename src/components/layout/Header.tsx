import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface HeaderProps {
  isNight: boolean;
  onToggleTheme: () => void;
}

const navKeys = [
  "experience",
  "gallery",
  "pricing",
  "howItWorks",
  "location",
  "contact",
  "faq",
] as const;

const langFlags: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇵🇸",
};

const sectionIds: Record<string, string> = {
  experience: "experience",
  gallery: "gallery",
  pricing: "pricing",
  howItWorks: "how-it-works",
  location: "location",
  contact: "contact",
  faq: "faq",
};

export function Header({ isNight, onToggleTheme }: HeaderProps) {
  const { t, i18n } = useTranslation("common");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
    trackEvent("language-change", { lang: lng });
    setLangOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4">
      <nav
        className={cn(
          "mx-auto mt-3 max-w-6xl px-6 transition-all duration-500 rounded-2xl",
          scrolled
            ? isNight
              ? "bg-[#070B14]/80 border border-white/10 backdrop-blur-xl max-w-5xl"
              : "bg-white/80 border border-gray-200/50 backdrop-blur-xl shadow-lg shadow-black/5 max-w-5xl"
            : "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between py-3 lg:py-4">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="cursor-pointer"
          >
            <span
              className={cn(
                "font-heading text-2xl font-bold tracking-tight",
                isNight ? "text-white" : "text-[#0A1628]"
              )}
            >
              Nuz<span className="text-[#02BAD6]">ha</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-4">
            {navKeys.map((key) => (
              <button
                key={key}
                onClick={() => scrollTo(sectionIds[key])}
                className={cn(
                  "text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
                  isNight
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-[#0A1628]"
                )}
              >
                {t(`nav.${key}`)}
              </button>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => {
                onToggleTheme();
                trackEvent("theme-toggle", { theme: isNight ? "day" : "night" });
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                isNight
                  ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20"
                  : "bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20"
              )}
              aria-label={isNight ? t("theme.day") : t("theme.night")}
            >
              {isNight ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isNight ? t("theme.day") : t("theme.night")}
              </span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  isNight
                    ? "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                    : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                )}
              >
                <span className="text-sm leading-none">{langFlags[i18n.language]}</span>
                {t(`language.${i18n.language}`)}
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute end-0 top-full mt-2 rounded-xl border p-1.5 min-w-[120px] z-50",
                      isNight
                        ? "bg-[#0F1923] border-white/10"
                        : "bg-white border-gray-200 shadow-lg"
                    )}
                  >
                    {(["fr", "en", "ar"] as const).map((lng) => (
                      <button
                        key={lng}
                        onClick={() => changeLang(lng)}
                        className={cn(
                          "w-full text-start px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                          i18n.language === lng
                            ? isNight
                              ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                              : "bg-[#02BAD6]/10 text-[#02BAD6]"
                            : isNight
                              ? "text-gray-400 hover:text-white hover:bg-white/5"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm leading-none">{langFlags[lng]}</span>
                          {t(`language.${lng}`)}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "lg:hidden p-2 rounded-lg cursor-pointer",
                isNight ? "text-white" : "text-gray-800"
              )}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="pb-4 space-y-1">
                {navKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => scrollTo(sectionIds[key])}
                    className={cn(
                      "block w-full text-start px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isNight
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {t(`nav.${key}`)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
