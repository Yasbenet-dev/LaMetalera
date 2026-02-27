// src/hooks/useDashboardData.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalAsistencias: 0,
    asistenciasHoy: 0,
    asistenciasPendientes: 0,
    promedioHorasTrabajadas: 0,
  });

  const [recentAsistencias, setRecentAsistencias] = useState([]);
  const [usuariosActivos, setUsuariosActivos] = useState([]);
  const [asistenciasPorDia, setAsistenciasPorDia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---------- Calcular promedio de horas ----------
  const calcularPromedioHoras = (asistencias) => {
    if (!asistencias || asistencias.length === 0) return 0;

    const horasValidas = asistencias.filter(
      (a) => a.hora_entrada && a.hora_salida
    );

    if (horasValidas.length === 0) return 0;

    const totalHoras = horasValidas.reduce((total, asistencia) => {
      try {
        const entrada = new Date(asistencia.hora_entrada);
        const salida = new Date(asistencia.hora_salida);
        return total + (salida - entrada) / (1000 * 60 * 60);
      } catch {
        return total;
      }
    }, 0);

    return parseFloat((totalHoras / horasValidas.length).toFixed(1));
  };

  // ---------- Cargar datos ----------
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

      console.log("📊 Iniciando carga de datos...");

      // 1. Totales
      const { count: totalUsuarios = 0 } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true });

      const { count: totalAsistencias = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true });

      const { count: asistenciasHoy = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("fecha", today);

      const { count: asistenciasPendientes = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .is("hora_salida", null)
        .eq("fecha", today);

      // 2. Asistencias recientes (sin join)
      const { data: asistenciasRecientesRaw = [] } = await supabase
        .from("asistencias")
        .select("id, fecha, hora_entrada, hora_salida, usuario_id")
        .order("hora_entrada", { ascending: false })
        .limit(8);

      // 3. Obtener usuarios de esas asistencias
      let usuariosMap = {};
      if (asistenciasRecientesRaw.length > 0) {
        const userIds = [
          ...new Set(asistenciasRecientesRaw.map((a) => a.usuario_id)),
        ];
        if (userIds.length > 0) {
          const { data: usuariosRaw = [] } = await supabase
            .from("usuarios")
            .select("id, nombre, apellido, email")
            .in("id", userIds);

          usuariosMap = Object.fromEntries(
            usuariosRaw.map((u) => [u.id, u])
          );
        }
      }

      const asistenciasRecientes = asistenciasRecientesRaw.map((a) => ({
        ...a,
        usuario: usuariosMap[a.usuario_id] || null,
      }));

      // 4. Usuarios activos hoy
      const { data: usuariosActivosRaw = [] } = await supabase
        .from("asistencias")
        .select("usuario_id")
        .eq("fecha", today)
        .not("hora_entrada", "is", null);

      let usuariosActivosData = [];
      if (usuariosActivosRaw.length > 0) {
        const userIds = [
          ...new Set(usuariosActivosRaw.map((a) => a.usuario_id)),
        ];
        const { data: usuariosRaw = [] } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido")
          .in("id", userIds);

        usuariosActivosData = usuariosRaw;
      }

      // 5. Asistencias semanales (agrupación manual)
      const { data: asistenciasSemanalesRaw = [] } = await supabase
        .from("asistencias")
        .select("fecha")
        .gte("fecha", startOfWeekStr)
        .lte("fecha", today);

      const conteoPorDia = {};
      asistenciasSemanalesRaw.forEach((a) => {
        conteoPorDia[a.fecha] = (conteoPorDia[a.fecha] || 0) + 1;
      });

      const asistenciasPorDiaData = Object.entries(conteoPorDia).map(
        ([fecha, count]) => ({
          fecha: new Date(fecha).toLocaleDateString("es-ES", {
            weekday: "short",
          }),
          count,
          fechaCompleta: fecha,
        })
      );

      // 6. Promedio de horas trabajadas
      const { data: asistenciasConHoras = [] } = await supabase
        .from("asistencias")
        .select("hora_entrada, hora_salida")
        .gte("fecha", startOfWeekStr)
        .lte("fecha", today);

      const promedioHoras = calcularPromedioHoras(asistenciasConHoras);

      // Guardar estado
      setStats({
        totalUsuarios,
        totalAsistencias,
        asistenciasHoy,
        asistenciasPendientes,
        promedioHorasTrabajadas: promedioHoras,
      });

      setRecentAsistencias(asistenciasRecientes);
      setUsuariosActivos(usuariosActivosData);
      setAsistenciasPorDia(asistenciasPorDiaData);
    } catch (err) {
      console.error("❌ Error crítico en fetchDashboardData:", err);
      setError(err.message);

      // Fallback
      setStats({
        totalUsuarios: 15,
        totalAsistencias: 234,
        asistenciasHoy: 8,
        asistenciasPendientes: 2,
        promedioHorasTrabajadas: 7.2,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calcularHorasTrabajadas = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null;
    try {
      const entrada = new Date(horaEntrada);
      const salida = new Date(horaSalida);
      return ((salida - entrada) / (1000 * 60 * 60)).toFixed(1);
    } catch {
      return null;
    }
  };

  return {
    stats,
    recentAsistencias,
    usuariosActivos,
    asistenciasPorDia,
    loading,
    error,
    fetchDashboardData,
    calcularHorasTrabajadas,
    refetch: fetchDashboardData,
  };
};
