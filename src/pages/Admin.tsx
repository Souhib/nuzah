import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { type Reservation, UnauthorizedError, api } from "@/lib/api";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReservationForm } from "@/components/admin/ReservationForm";
import { ReservationList } from "@/components/admin/ReservationList";
import { Calendar } from "@/components/admin/Calendar";
import { CustomerDetail, type CustomerKey } from "@/components/admin/CustomerDetail";
import { CalendarDays, List, Loader2, LogOut, Pencil, Plus, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const SESSION_KEY = "noozha_admin_token";

type Tab = "form" | "list" | "calendar";

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerKey | null>(null);

  // Validate any stored token by calling /me. Failure → clear + show login.
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      setChecking(false);
      return;
    }
    api
      .me(stored)
      .then(() => setToken(stored))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogin(newToken: string) {
    localStorage.setItem(SESSION_KEY, newToken);
    setToken(newToken);
  }

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
  }, []);

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
  }

  function handleSaved() {
    setRefreshKey((k) => k + 1);
    if (editing) {
      // Closing edit overlay returns user to the tab they were on.
      setEditing(null);
    } else {
      setActiveTab("calendar");
    }
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
    { key: "calendar", label: "Calendrier", icon: CalendarDays },
    { key: "form", label: "Nouvelle", icon: Plus },
    { key: "list", label: "Liste", icon: List },
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
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {activeTab === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Calendar
                token={token}
                onUnauthorized={handleUnauthorized}
                refreshKey={refreshKey}
                onEdit={setEditing}
                onViewCustomer={setViewingCustomer}
              />
            </motion.div>
          )}
          {activeTab === "form" && (
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
                onSaved={handleSaved}
              />
            </motion.div>
          )}
          {activeTab === "list" && (
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
                onEdit={setEditing}
                onViewCustomer={setViewingCustomer}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit overlay — covers the whole admin when editing a reservation */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-sm overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/[0.08]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-300">
                  <Pencil className="w-4 h-4 text-[#02BAD6]" />
                  <span className="font-medium text-sm">
                    Modifier — {editing.customer_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <ReservationForm
                key={editing.id}
                token={token}
                initial={editing}
                onUnauthorized={handleUnauthorized}
                onSaved={handleSaved}
                onCancel={() => setEditing(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer history overlay */}
      <AnimatePresence>
        {viewingCustomer && (
          <CustomerDetail
            key={`${viewingCustomer.phone}|${viewingCustomer.name}`}
            customer={viewingCustomer}
            token={token}
            onClose={() => setViewingCustomer(null)}
            onUnauthorized={handleUnauthorized}
            onOpenReservation={(r) => {
              setViewingCustomer(null);
              setEditing(r);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
