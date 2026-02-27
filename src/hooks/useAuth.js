// src/hooks/useAuth.js
import { supabase } from "../lib/supabase";

export async function loginUser(identifier, password) {
  if (!identifier || !password) {
    throw new Error("Ingresa usuario/email y contraseña.");
  }

  const rawIdentifier = identifier.trim();
  let emailToUse = rawIdentifier;

  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawIdentifier);

  // Si NO parece correo, asumimos username y buscamos su email
  if (!looksLikeEmail) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("email")
      .eq("username", rawIdentifier)
      .maybeSingle(); // mejor que .limit(1)

    if (error || !data?.email) {
      throw new Error("Usuario no encontrado");
    }

    emailToUse = data.email;
  }

  // 1) Auth real
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (authError) {
    console.error("[loginUser] auth error:", authError);

    // Supabase suele usar "Invalid login credentials" en message
    if (
      authError.code === "invalid_credentials" ||
      /invalid login credentials/i.test(authError.message || "")
    ) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    if (/email not confirmed/i.test(authError.message || "")) {
      throw new Error("Debes confirmar tu email (demo: confirma el usuario en Supabase Auth).");
    }

    throw new Error("No se pudo iniciar sesión, intenta nuevamente.");
  }

  const authUser = authData.user;

  // 2) Traer perfil de tu tabla usuarios (rol vive aquí)
  const { data: usuarioDB, error: usuarioErr } = await supabase
    .from("usuarios")
    .select("id, email, nombre, username, rol")
    .eq("id", authUser.id)
    .maybeSingle();

  if (usuarioErr) {
    console.error("[loginUser] usuarios select error:", usuarioErr);
  }

  // 3) Construir appUser (lo que necesita tu app)
  const appUser = {
    id: authUser.id,
    email: authUser.email,
    nombre: usuarioDB?.nombre ?? authUser.email,
    username: usuarioDB?.username ?? null,
    rol: usuarioDB?.rol ?? "trabajador", // estándar: admin / trabajador
  };

  return {
    user: authUser,
    session: authData.session,
    appUser,
  };
}