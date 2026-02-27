import { useState } from "react";
import { supabase } from "../lib/supabase"; 

export function useSupabaseData() {
  const [asistencias, setAsistencias] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);

  //Traer asistencias con usuarios
  const fetchAsistencias = async () => {
    setLoading(true);

    const { data: asistenciasData, error: errorAsistencias } = await supabase
      .from("asistencias")
      .select("id, fecha, hora_entrada, hora_salida, observaciones, user_id")
      .order("fecha", { ascending: false });

    if (errorAsistencias) {
      console.error("❌ Error asistencias:", errorAsistencias);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(asistenciasData.map(a => a.user_id))];

    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("usuarios")
      .select("id, nombre, apellido")
      .in("id", userIds);

    if (errorUsuarios) {
      console.error("❌ Error usuarios (asistencias):", errorUsuarios);
      setAsistencias(asistenciasData);
      setLoading(false);
      return;
    }

    const asistenciasConUsuarios = asistenciasData.map(a => ({
      ...a,
      usuario: usuarios.find(u => u.id === a.user_id) || null,
    }));

    setAsistencias(asistenciasConUsuarios);
    setLoading(false);
  };

  //  Traer horarios con usuarios
  const fetchHorarios = async () => {
    setLoading(true);

    const { data: horariosData, error: errorHorarios } = await supabase
      .from("horarios")
      .select("id, user_id, hora_inicio, hora_fin, dias");

    if (errorHorarios) {
      console.error("❌ Error horarios:", errorHorarios);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(horariosData.map(h => h.user_id))];

    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("usuarios")
      .select("id, nombre, apellido")
      .in("id", userIds);

    if (errorUsuarios) {
      console.error("❌ Error usuarios (horarios):", errorUsuarios);
      setHorarios(horariosData);
      setLoading(false);
      return;
    }

    const horariosConUsuarios = horariosData.map(h => ({
      ...h,
      usuario: usuarios.find(u => u.id === h.user_id) || null,
    }));

    setHorarios(horariosConUsuarios);
    setLoading(false);
  };

  // Exponer funciones y datos
  return {
    asistencias,
    horarios,
    loading,
    fetchAsistencias,
    fetchHorarios,
  };
}
