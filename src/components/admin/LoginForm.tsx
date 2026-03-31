import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";
import { signin } from "@/lib/nocodb";
import { AlertCircle, Loader2, Lock, LogIn, Mail, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await signin(email, password);
      onLogin(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur de connexion",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-950 bg-[radial-gradient(ellipse_at_top,rgba(2,186,214,0.08)_0%,transparent_50%)] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/50"
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#02BAD6]/50 to-transparent" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#02BAD6]/10 flex items-center justify-center mb-4">
            <Waves className="w-7 h-7 text-[#02BAD6]" />
          </div>
          <h1 className="text-2xl font-bold text-white glow-text-cyan font-heading">
            Noozha
          </h1>
          <p className="text-gray-500 text-sm mt-1">Espace administration</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <label className="block mb-4">
          <span className="text-gray-400 text-sm mb-1.5 block">Email</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 placeholder-gray-600 rounded-xl pl-11 pr-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors"
              placeholder="admin@noozha.fr"
            />
          </div>
        </label>

        <label className="block mb-6">
          <span className="text-gray-400 text-sm mb-1.5 block">Mot de passe</span>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/[0.08] text-gray-50 placeholder-gray-600 rounded-xl pl-11 pr-4 py-3 focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none hover:border-white/[0.15] transition-colors"
            />
          </div>
        </label>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full bg-[#02BAD6] hover:bg-[#00d4f5] text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2",
            loading && "opacity-60 cursor-not-allowed",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Se connecter
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
