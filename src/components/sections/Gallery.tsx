import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef } from "react";
import { X, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface GalleryProps {
  isNight: boolean;
}

interface GalleryItem {
  key: string;
  type: "video" | "image";
  src: string;
  poster?: string;
}

const galleryItems: GalleryItem[] = [
  {
    key: "dayLabel",
    type: "video",
    src: "/videos/pool-day.mp4",
    poster: "/images/pool-day.jpg",
  },
  {
    key: "nightLabel",
    type: "video",
    src: "/videos/pool-night.mp4",
    poster: "/images/pool-night-cyan.jpg",
  },
  {
    key: "gardenLabel",
    type: "video",
    src: "/videos/pool-night-green.mp4",
    poster: "/images/pool-night-green.jpg",
  },
  {
    key: "foodLabel",
    type: "video",
    src: "/videos/food-setup.mp4",
    poster: "/images/food-setup.jpg",
  },
  {
    key: "foodPlatterLabel",
    type: "video",
    src: "/videos/food-platter.mp4",
    poster: "/images/food-platter.jpg",
  },
  {
    key: "foodBurgersLabel",
    type: "video",
    src: "/videos/food-burgers.mp4",
    poster: "/images/food-burgers.jpg",
  },
];

export function Gallery({ isNight }: GalleryProps) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  return (
    <>
      <section
        ref={ref}
        id="gallery"
        className={cn(
          "py-24 md:py-32 px-6",
          isNight ? "bg-[#0A0F1A]" : "bg-[#F0FDFF]"
        )}
      >
        <div className="mx-auto max-w-6xl">
          {/* Header */}
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
              {t("gallery.sectionTitle")}
            </span>
            <h2
              className={cn(
                "mt-3 font-heading text-4xl md:text-5xl font-bold tracking-tight",
                isNight ? "text-white" : "text-[#0A1628]"
              )}
            >
              {t("gallery.title")}
            </h2>
          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                onClick={() => {
                  setLightbox(item);
                  trackEvent("gallery-interact", { type: item.type });
                }}
                className={cn(
                  "relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300",
                  isNight
                    ? "border-white/5 hover:border-[#00E5FF]/20"
                    : "border-gray-200/60 hover:border-[#02BAD6]/30 hover:shadow-xl"
                )}
              >
                {item.type === "video" ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={item.poster}
                    className="w-full h-auto block rounded-2xl"
                  >
                    <source src={item.src} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={item.src}
                    alt={t(`gallery.${item.key}`)}
                    className="w-full h-auto block rounded-2xl"
                    loading="lazy"
                  />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-2xl" />

                {/* Play icon for videos */}
                {item.type === "video" && (
                  <div className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                )}

                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <span className="text-white text-sm font-semibold drop-shadow-lg">
                    {t(`gallery.${item.key}`)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 end-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.type === "video" ? (
                <video
                  autoPlay
                  loop
                  controls
                  playsInline
                  className="max-w-[90vw] max-h-[90vh] rounded-lg"
                >
                  <source src={lightbox.src} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={lightbox.src}
                  alt=""
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
