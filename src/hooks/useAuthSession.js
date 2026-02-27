// src/hooks/useAuthSession.js
import { useState } from "react";
import { loginUser } from "./useAuth";

export const getCurrentUserId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      throw new Error("No hay usuario autenticado");
    }
    const user = JSON.parse(storedUser);
    if (!user?.id) {
      throw new Error("Usuario sin ID válido");
    }
    return user.id;
  } catch (error) {
    console.error("Error obteniendo ID de usuario:", error);
    throw error;
  }
};

export const getCurrentUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
};

export function useAuthSession() {
  const [user, setUser] = useState(null);

  const login = async (identifier, password) => {
    const usuario = await loginUser(identifier, password);
    setUser(usuario);
    localStorage.setItem("user", JSON.stringify(usuario)); // guarda rol también
    return usuario;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const loadSession = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  };

  return { user, login, logout, loadSession, getCurrentUser, getCurrentUserId };
}
