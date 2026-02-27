import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getLocalUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CurrentUserName({ className = "font-semibold" }) {
  const [display, setDisplay] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) Primero: localStorage
        const ls = getLocalUser();
        if (ls?.nombre) {
          if (!cancelled) {
            const name = [ls.nombre, ls.apellido].filter(Boolean).join(" ").trim();
            setDisplay(name || ls.email || "");
            setLoading(false);
          }
          return;
        }

        // 2) Luego: sesión de Supabase
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth?.user;
        if (!authUser) {
          if (!cancelled) {
            setDisplay("");
            setLoading(false);
          }
          return;
        }

        // 3) Buscar en tabla 'usuarios' por id; si no, por email
        let profile = null;

        const { data: byId } = await supabase
          .from("usuarios")
          .select("nombre, apellido, email")
          .eq("id", authUser.id)
          .limit(1);
        profile = byId?.[0] || null;

        if (!profile) {
          const { data: byEmail } = await supabase
            .from("usuarios")
            .select("nombre, apellido, email")
            .eq("email", authUser.email)
            .limit(1);
          profile = byEmail?.[0] || null;
        }

        if (!cancelled) {
          if (profile?.nombre) {
            setDisplay(
              [profile.nombre, profile.apellido].filter(Boolean).join(" ").trim()
            );
          } else {
            setDisplay(authUser.email || "");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <span className={className}>…</span>;
  return <span className={className}>{display || "Usuario"}</span>;
}
