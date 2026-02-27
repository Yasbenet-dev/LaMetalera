//useUsers.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./useAuthSession";
import bcrypt from "bcryptjs";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const adminId = getCurrentUserId();

  // --- READ
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email, username, fecha_nacimiento")
        .order("id", { ascending: false });

      if (error) throw error;
      setUsers(data ?? []);
    } catch (err) {
      console.error("[fetchUsers] error:", err);
      setError(err.message || "No se pudieron cargar los usuarios");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- CREATE
  const createUser = async (nuevoUsuario) => {
    const {
      email,
      password,
      username,
      nombre,
      apellido,
      fecha_nacimiento,
      tipo_pago,
      pago,
    } = nuevoUsuario;

    if (
      !email ||
      !password ||
      !username ||
      !nombre ||
      !apellido ||
      !fecha_nacimiento
    ) {
      throw new Error("Completa todos los campos obligatorios.");
    }

    // Primero intenta insertar en la tabla usuarios
    const { error: insertError } = await supabase.from("usuarios").insert([
      {
        username,
        email,
        nombre,
        apellido,
        fecha_nacimiento,
        tipo_pago,
        pago,
      },
    ]);

    //Si falla el insert, no sigas
    if (insertError) {
      console.error("[createUser] Error al insertar en usuarios:", insertError);
      throw new Error(
        "Error al registrar en la base de datos: " + insertError.message
      );
    }

    //Si todo bien, crea usuario en Supabase Auth
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error("[createUser] Error al registrar en Auth:", authError);
      throw new Error("Error al registrar en Auth: " + authError.message);
    }
    await fetchUsers();
    return true;
  };

  // --- UPDATE
  const updateUser = async (id, userData) => {
    try {
      setLoading(true);
      setError(null);
      const idUUID = String(id);
      console.log("[updateUser] id:", idUUID, "payload:", userData);

      let hashedPassword;

      if (userData?.password && userData.password.trim() !== "") {
        // Hay contraseña nueva
        hashedPassword = bcrypt.hashSync(userData.password, 10);
      } else {
        // No se quiere cambiar la contraseña => usamos la actual
        const { data: existingUser, error: existingError } = await supabase
          .from("usuarios")
          .select("password")
          .eq("id", idUUID)
          .single();

        if (existingError) throw existingError;

        hashedPassword = existingUser.password;
      }
      // const hashedPassword = userData?.password
      // ? bcrypt.hashSync(userData.password, 10)
      //  : null;//

      // Llamar a la función RPC para actualizar usuario
      const { data, error } = await supabase.rpc("admin_update_usuario", {
        _admin_id: adminId, // ID del admin autenticado
        _id: idUUID, // ID del usuario a actualizar
        _username: userData?.username,
        _nombre: userData?.nombre,
        _apellido: userData?.apellido,
        _email: userData?.email,
        _password: hashedPassword, // Solo si hay nueva contraseña
      });
      console.log("[WEB] adminId:", adminId);
      if (error) {
        console.error("[updateUser] supabase.error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(error.message || "Error en Supabase al actualizar.");
      }

      // Recargar la lista de usuarios para obtener los datos actualizados
      await fetchUsers();
      setEditingUser(null);

      return data;
    } catch (err) {
      console.error("[updateUser] CATCH:", err?.message || err, err);
      setError(err?.message || "No se pudo actualizar el usuario");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE
  const deleteUser = async (id) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Admin ID:", adminId, "User to delete:", id);

      // Llamar a la función RPC con los parámetros correctos
      const { error } = await supabase.rpc("admin_delete_usuario", {
        _admin_id: adminId, // ID del admin autenticado
        _user_id: id, // ID del usuario a eliminar
      });

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("[deleteUser] error:", err);
      setError(err.message || "No se pudo eliminar el usuario");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    editingUser,
    setEditingUser,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers,
  };
};
