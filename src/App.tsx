import { Suspense } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home";
import { useTheme } from "@/hooks/useTheme";
import { useDirection } from "@/hooks/useDirection";
import { useLenis } from "@/hooks/useLenis";

function AppContent() {
  const { theme, toggleTheme, isNight } = useTheme();
  const { language } = useDirection();
  const { t } = useTranslation("home");

  useLenis();

  return (
    <HelmetProvider>
      <Helmet>
        <html lang={language} dir={language === "ar" ? "rtl" : "ltr"} data-theme={theme} />
        <title>
          {language === "fr"
            ? "Nuzha — Piscine Privée à Chelles"
            : language === "ar"
              ? "نزهة — مسبح خاص في Chelles"
              : "Nuzha — Private Pool in Chelles"}
        </title>
        <meta
          name="description"
          content={t("hero.subtitle")}
        />
      </Helmet>
      <Header isNight={isNight} onToggleTheme={toggleTheme} />
      <Home isNight={isNight} />
      <Footer isNight={isNight} />
    </HelmetProvider>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#02BAD6] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppContent />
    </Suspense>
  );
}
