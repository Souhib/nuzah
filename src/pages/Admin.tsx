import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { UnauthorizedError, getSchema } from "@/lib/nocodb";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReservationForm } from "@/components/admin/ReservationForm";
import { ReservationList } from "@/components/admin/ReservationList";
import { List, Loader2, LogOut, Plus, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const SESSION_KEY = "nc_token";

type Tab = "form" | "list";

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("form");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setChecking(false);
      return;
    }
    getSchema(stored)
      .then(() => setToken(stored))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          sessionStorage.removeItem(SESSION_KEY);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogin(newToken: string) {
    sessionStorage.setItem(SESSION_KEY, newToken);
    setToken(newToken);
  }

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
  }, []);

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
  }

  function handleCreated() {
    setRefreshKey((k) => k + 1);
  }

  if (checking) {
    return (
      <div className="h-dvh bg-gray-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#02BAD6] animate-spin" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    );
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const tabs: { key: Tab; label: string; icon: typeof Plus }[] = [
    { key: "form", label: "Nouvelle reservation", icon: Plus },
    { key: "list", label: "Reservations", icon: List },
  ];

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Waves className="w-5 h-5 text-[#02BAD6]" />
            <span className="text-white font-bold text-lg font-heading">Noozha</span>
          </div>

          <nav className="bg-white/[0.04] rounded-xl p-1 flex gap-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === tab.key
                      ? "bg-[#02BAD6] text-white shadow-lg shadow-[#02BAD6]/20"
                      : "text-gray-400 hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Deconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ReservationForm
                token={token}
                onUnauthorized={handleUnauthorized}
                onCreated={handleCreated}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ReservationList
                token={token}
                onUnauthorized={handleUnauthorized}
                refreshKey={refreshKey}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
