import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function CajaTradingChart({ tecnicoId, cajaFilterYear, cajaFilterMonth, cajaFilterDay, cajaRangeStart, cajaRangeEnd, isMobile }) {
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/cierres-caja')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCierres(data.data || []);
        } else {
          setCierres([]);
        }
      })
      .catch(() => setCierres([]))
      .finally(() => setLoading(false));
  }, []);


  // Filtrar por técnico si se selecciona uno
  let cierresFiltrados = tecnicoId
    ? cierres.filter(cierre => String(cierre.tecnico_id) === String(tecnicoId))
    : cierres;

  // Si no hay filtros, mostrar solo los cierres del mes actual
  const today = new Date();
  const mesActual = (today.getMonth() + 1).toString();
  const anioActual = today.getFullYear().toString();
  const noFiltro = !tecnicoId && !cajaFilterYear && !cajaFilterMonth && !cajaFilterDay && !cajaRangeStart && !cajaRangeEnd;
  if (noFiltro) {
    cierresFiltrados = cierresFiltrados.filter(cierre => {
      if (!cierre.createdAt) return false;
      const fecha = new Date(cierre.createdAt);
      return fecha.getFullYear().toString() === anioActual && (fecha.getMonth() + 1).toString() === mesActual;
    });
  } else {
    // Filtrar por año, mes, día si están seleccionados
    cierresFiltrados = cierresFiltrados.filter(cierre => {
      if (!cierre.createdAt) return false;
      const fecha = new Date(cierre.createdAt);
      if (isNaN(fecha)) return false;
      if (cajaFilterYear && fecha.getFullYear().toString() !== cajaFilterYear) return false;
      if (cajaFilterMonth && (fecha.getMonth() + 1).toString() !== cajaFilterMonth) return false;
      if (cajaFilterDay && fecha.getDate().toString() !== cajaFilterDay) return false;
      // Si hay rango personalizado, filtrar por rango
      if (cajaRangeStart && cajaRangeEnd) {
        const start = new Date(cajaRangeStart);
        const end = new Date(cajaRangeEnd);
        end.setHours(23,59,59,999);
        return fecha >= start && fecha <= end;
      }
      return true;
    });
  }

  // Agrupar por fecha y sumar monto_total
  const dataChart = [];
  const mapFechas = {};
  cierresFiltrados.forEach(cierre => {
    const fechaObj = cierre.createdAt ? new Date(cierre.createdAt) : null;
    if (!fechaObj) return;
    const fechaStr = fechaObj.toLocaleDateString('es-PE', { year: '2-digit', month: '2-digit', day: '2-digit' });
    if (!mapFechas[fechaStr]) {
      mapFechas[fechaStr] = { fecha: fechaStr, monto: 0 };
    }
    mapFechas[fechaStr].monto += parseFloat(cierre.monto_total) || 0;
  });
  Object.values(mapFechas).forEach(obj => dataChart.push(obj));
  // Ordenar por fecha ascendente y luego invertir para mostrar de derecha a izquierda
  dataChart.sort((a, b) => {
    const fa = a.fecha.split('/').reverse().join('-');
    const fb = b.fecha.split('/').reverse().join('-');
    return new Date(fa) - new Date(fb);
  });
  dataChart.reverse();

  // Si no hay filtros, mostrar los cierres del mes actual en orden cronológico ascendente
  // (ya está ordenado por fecha ascendente arriba, así que no se necesita reordenar)

  if (loading) {
    return <div style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>Cargando gráfico de cierres...</div>;
  }
  if (!dataChart.length) {
    return <div style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>No hay datos de cierres para mostrar.</div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: isMobile ? 350 : 500, margin: '0 auto', marginBottom: isMobile ? 12 : 24, background: '#23263a', borderRadius: 14, padding: isMobile ? 8 : 18, boxShadow: '0 2px 8px #0ea5e955', border: '2px solid #fbbf24' }}>
      <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: isMobile ? 14 : 17, textAlign: 'center', marginBottom: 6 }}>
        Evolución de cierres de caja
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 120 : 180}>
        <LineChart data={dataChart} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#6366f1" strokeDasharray="3 3" />
             <XAxis
               dataKey="fecha"
               tick={{ fill: '#fff', fontWeight: 700, fontSize: isMobile ? 10 : 14, angle: -30, textAnchor: 'end' }}
               interval={0}
               dy={isMobile ? 12 : 18}
               height={isMobile ? 60 : 80}
               tickLine={false}
               axisLine={{ stroke: '#6366f1' }}
             />
          <YAxis stroke="#fff" fontSize={isMobile ? 10 : 13} width={isMobile ? 30 : 40} />
          <Tooltip contentStyle={{ background: '#181a2a', border: '1.5px solid #fbbf24', borderRadius: 10, color: '#fbbf24', fontWeight: 700, minWidth: 80 }} labelStyle={{ color: '#fbbf24', fontWeight: 900, fontSize: isMobile ? 11 : 14 }} />
          <Line type="monotone" dataKey="monto" stroke="#fbbf24" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      {/* Si quieres mostrar el cierre con más ingresos como destacado, puedes agregar aquí un resumen */}
    </div>
  );
}

export default CajaTradingChart;
