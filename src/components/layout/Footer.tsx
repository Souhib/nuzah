import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  isNight: boolean;
}

export function Footer({ isNight }: FooterProps) {
  const { t } = useTranslation("common");
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t py-12 px-6",
        isNight ? "border-white/5 bg-[#050A12]" : "border-gray-200 bg-[#F8FAFC]"
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-heading text-2xl font-bold",
                isNight ? "text-white" : "text-[#0A1628]"
              )}
            >
              Nooz<span className="text-[#02BAD6]">ha</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span
              className={cn(
                isNight ? "text-gray-500" : "text-gray-400"
              )}
            >
              {t("footer.legal")}
            </span>
            <span
              className={cn(
                isNight ? "text-gray-500" : "text-gray-400"
              )}
            >
              {t("footer.privacy")}
            </span>
            <span
              className={cn(
                isNight ? "text-gray-500" : "text-gray-400"
              )}
            >
              {t("footer.terms")}
            </span>
          </div>

          <p
            className={cn(
              "flex items-center gap-1.5 text-sm",
              isNight ? "text-gray-500" : "text-gray-400"
            )}
          >
            {t("footer.madeWith")}{" "}
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />{" "}
            {t("footer.inChelles")} · {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
