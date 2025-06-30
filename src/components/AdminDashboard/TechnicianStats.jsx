import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import TechnicianStatsPDFExport from './TechnicianStatsPDFExport';
import PrintecGPTChat from '../PrintecGPTChat';
import TechnicianStatsDoughnut from './TechnicianStatsDoughnut';
import { TECH_COLORS } from '../../utils/colors';

const TechnicianStats = ({ ordenes, tecnicos = [], filterLabel = '' }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('reparaciones'); // 'reparaciones' o 'ingresos'
  const [showModal, setShowModal] = useState(false);
  const [modalTechnician, setModalTechnician] = useState(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  // Estados para selects de fecha
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const chartContainerRef = useRef(null);
  const navigate = useNavigate();

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const goToTechnicianStats = (technicianName, technicianData) => {
    // Buscar el técnico seleccionado
    const tecnico = tecnicos.find(t => `${t.nombre} ${t.apellido}`.trim() === technicianName);
    if (tecnico) {
      sessionStorage.setItem('selectedTechnician', JSON.stringify(tecnico));
      sessionStorage.setItem('selectedTechnicianId', tecnico.id);
      sessionStorage.setItem('selectedTechnicianName', tecnico.nombre);
      sessionStorage.setItem('selectedTechnicianLastname', tecnico.apellido);
      // Redirigir a la ruta de historial de órdenes del técnico
      navigate(`/admin-dashboard/tecnico-stats?tecnicoId=${tecnico.id}`);
    }
  };

  // Memoiza el cálculo de estadísticas para evitar loops infinitos
  const technicianStats = useMemo(() => {
    if (!ordenes || !Array.isArray(ordenes) || ordenes.length === 0 || !tecnicos || !Array.isArray(tecnicos) || tecnicos.length === 0) {
      return [];
    }
    const ordenesValidas = ordenes.filter(orden => {
      const tieneTecnico = orden.dispositivo && (
        orden.dispositivo.tecnico_id !== null && orden.dispositivo.tecnico_id !== undefined ||
        orden.dispositivo.tecnico_recibio !== null && orden.dispositivo.tecnico_recibio !== undefined ||
        orden.dispositivo.tecnico_entrego !== null && orden.dispositivo.tecnico_entrego !== undefined
      );
      // No contar eliminados: si tiene costo_acordado, se considera eliminada
      const noEliminado = !orden.costo_acordado;
      return tieneTecnico && noEliminado;
    });
    const ordenesPorTecnico = {};
    ordenesValidas.forEach(orden => {
      // Contar para cada técnico involucrado
      const ids = [];
      if (orden.dispositivo.tecnico_id) ids.push(orden.dispositivo.tecnico_id);
      if (orden.dispositivo.tecnico_recibio) ids.push(orden.dispositivo.tecnico_recibio);
      if (orden.dispositivo.tecnico_entrego) ids.push(orden.dispositivo.tecnico_entrego);
      ids.forEach(tecnicoId => {
        if (!ordenesPorTecnico[tecnicoId]) {
          ordenesPorTecnico[tecnicoId] = [];
        }
        ordenesPorTecnico[tecnicoId].push(orden);
      });
    });
    return tecnicos.map(tecnico => {
      const tecnicoId = tecnico.id;
      // Solo contar órdenes donde el técnico diagnosticó
      const ordenesDiagnostico = ordenesValidas.filter(orden => orden.dispositivo.tecnico_id === tecnicoId);
      // Reparaciones: solo las órdenes donde el técnico entregó
      const entregadasPorTecnico = ordenesValidas.filter(orden => orden.dispositivo.tecnico_entrego === tecnicoId);
      // Recibió y entregó
      const totalRecibio = ordenesValidas.filter(orden => orden.dispositivo.tecnico_recibio === tecnicoId).length;
      const totalEntrego = entregadasPorTecnico.length;
      const totalDiagnostico = ordenesDiagnostico.length;
      const reparacionesExitosas = entregadasPorTecnico.length;
      const totalIngresos = entregadasPorTecnico.reduce((acc, orden) => {
        const costoTotal = parseFloat(orden.dispositivo?.costo_total) || 0;
        return acc + costoTotal;
      }, 0);
      const nombreSolo = tecnico.nombre.split(' ')[0];
      return {
        tecnicoId,
        nombre: `${tecnico.nombre} ${tecnico.apellido}`.trim(),
        nombreSolo,
        rol: tecnico.rol,
        reparacionesDiarias: entregadasPorTecnico.length,
        reparacionesExitosas,
        totalIngresos,
        reparacionesNoEliminadas: entregadasPorTecnico.length,
        totalDiagnostico,
        totalRecibio,
        totalEntrego
      };
    });
  }, [ordenes, tecnicos]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0 || !payload[0] || payload[0].value === undefined) {
      return null;
    }
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: '#181a2a', // Fondo oscuro
        padding: '12px 16px',
        border: '1.5px solid #0ea5e9',
        borderRadius: '10px',
        boxShadow: '0 2px 8px #0ea5e955',
        color: '#e0e7ff',
        minWidth: 180,
        fontWeight: 700,
      }}>
        <p className="label" style={{ margin: 0, fontWeight: 'bold', color: '#0ea5e9', fontSize: 16 }}>{`${label}`}</p>
        {payload[0] && payload[0].value !== undefined && (
          <p style={{ margin: '6px 0', color: '#0ea5e9', fontWeight: 900 }}>
            {`Reparaciones Exitosas: ${payload[0].value}`}
          </p>
        )}
        {payload[1] && payload[1].value !== undefined && (
          <p style={{ margin: '6px 0', color: '#22c55e', fontWeight: 900 }}>
            {`Ingresos: S/ ${payload[1].value}`}
          </p>
        )}
        <p style={{ margin: 0, fontSize: '0.85em', color: '#a5b4fc', fontWeight: 500 }}>
          (Toca para ver detalles)
        </p>
      </div>
    );
  };

  const renderPlaceholder = () => (
    <div className="notification is-light has-text-centered" style={{ color: '#1a202c' }}>Cargando técnicos...</div>
  );

  // Calcula el ancho mínimo necesario para el gráfico en móvil
  const calculateChartWidth = () => {
    // Asigna un espacio mínimo de 80px por técnico
    const minWidth = Math.max(technicianStats.length * 80, 320);
    return isMobile ? minWidth : '100%';
  };

  // Altura del gráfico ajustada para móvil y escritorio (más grande)
  const chartHeight = isMobile ? 600 : 500;

  // Centrar el scroll horizontal del gráfico al cargar o al cambiar los datos
  useEffect(() => {
    if (isMobile && chartContainerRef.current && technicianStats.length > 3) {
      const container = chartContainerRef.current;
      // Centra el scroll horizontal
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }
  }, [isMobile, technicianStats]);

  // Función para obtener iniciales del nombre
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0]?.toUpperCase() || '')
      .join('');
  };

  // NUEVO: Datos para el doughnut y tabla resumen, filtrados por técnico si corresponde
  const doughnutData = useMemo(() => {
    if (!ordenes || !Array.isArray(ordenes) || ordenes.length === 0 || !tecnicos || !Array.isArray(tecnicos) || tecnicos.length === 0) {
      return [];
    }
    // Ordenar tecnicosFiltrados igual que tecnicos original para mantener el color
    const tecnicosFiltrados = selectedTechnicianId
      ? tecnicos.filter(t => String(t.id) === String(selectedTechnicianId))
      : tecnicos.filter(t => {
          // Solo mostrar técnicos que tengan al menos un diagnóstico o pago
          const idx = tecnicos.findIndex(tt => tt.id === t.id);
          return idx !== -1;
        });
    // Primero filtrar órdenes válidas (no eliminadas)
    const ordenesValidas = ordenes.filter(orden => {
      const tieneTecnico = orden.dispositivo && (
        orden.dispositivo.tecnico_id !== null && orden.dispositivo.tecnico_id !== undefined ||
        orden.dispositivo.tecnico_recibio !== null && orden.dispositivo.tecnico_recibio !== undefined ||
        orden.dispositivo.tecnico_entrego !== null && orden.dispositivo.tecnico_entrego !== undefined
      );
      const noEliminado = !orden.costo_acordado;
      return tieneTecnico && noEliminado;
    });
    // Filtrar por año, mes y día si corresponde
    const filtrarPorFecha = (orden) => {
      if (!orden.fecha_ingreso) return false;
      const fechaUTC = new Date(orden.fecha_ingreso);
      if (isNaN(fechaUTC)) return false;
      const fechaPeru = new Date(fechaUTC.getUTCFullYear(), fechaUTC.getUTCMonth(), fechaUTC.getUTCDate(), fechaUTC.getUTCHours() - 5, fechaUTC.getUTCMinutes(), fechaUTC.getUTCSeconds());
      const y = fechaPeru.getFullYear();
      const m = fechaPeru.getMonth() + 1;
      const d = fechaPeru.getDate();
      if (filterYear && Number(filterYear) !== y) return false;
      if (filterMonth && Number(filterMonth) !== m) return false;
      if (filterDay && Number(filterDay) !== d) return false;
      return true;
    };
    // Agrupar órdenes por técnico que diagnosticó
    const diagnosticosPorTecnico = {};
    const pagosPorTecnico = {};
    let totalPagos = 0;
    // Asignar colorIdx global por técnico (según tecnicos original, no tecnicosFiltrados)
    const tecnicoIdToColorIdx = {};
    tecnicos.forEach((t, idx) => {
      tecnicoIdToColorIdx[t.id] = idx;
    });
    tecnicosFiltrados.forEach(tecnico => {
      const tecnicoId = tecnico.id;
      // Solo contar órdenes donde el técnico diagnosticó y cumple filtro de fecha
      const ordenesDiagnostico = ordenesValidas.filter(orden => orden.dispositivo.tecnico_id === tecnicoId && filtrarPorFecha(orden));
      diagnosticosPorTecnico[tecnicoId] = ordenesDiagnostico.length;
      // Pagos
      pagosPorTecnico[tecnicoId] = 0;
      ordenesDiagnostico.forEach(orden => {
        if (orden.pagos && Array.isArray(orden.pagos)) {
          orden.pagos.forEach(pago => {
            pagosPorTecnico[tecnicoId] += parseFloat(pago.monto || 0);
            totalPagos += parseFloat(pago.monto || 0);
          });
        }
      });
    });
    // Construir el array para el gráfico y la tabla
    return tecnicosFiltrados.map((tecnico) => {
      const ctd = diagnosticosPorTecnico[tecnico.id] || 0;
      const valor = pagosPorTecnico[tecnico.id] || 0;
      const porcentaje = totalPagos > 0 ? (valor / totalPagos) * 100 : 0;
      return {
        nombre: `${tecnico.nombre} ${tecnico.apellido}`.trim(),
        ctd,
        valor,
        porcentaje,
        colorIdx: tecnicos.findIndex(t => t.id === tecnico.id) // colorIdx global, siempre igual y según orden original
      };
    }).filter(t => t.ctd > 0 || t.valor > 0);
  }, [ordenes, tecnicos, selectedTechnicianId, filterYear, filterMonth, filterDay]);

  // Obtener años, meses y días únicos de las órdenes (diagnóstico, zona Perú)
  const availableYears = useMemo(() => {
    const years = new Set();
    if (Array.isArray(ordenes)) {
      ordenes.forEach(orden => {
        if (orden && orden.fecha_ingreso) {
          const fechaUTC = new Date(orden.fecha_ingreso);
          if (!isNaN(fechaUTC)) {
            const fechaPeru = new Date(fechaUTC.getUTCFullYear(), fechaUTC.getUTCMonth(), fechaUTC.getUTCDate(), fechaUTC.getUTCHours() - 5, fechaUTC.getUTCMinutes(), fechaUTC.getUTCSeconds());
            years.add(fechaPeru.getFullYear());
          }
        }
      });
    }
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }, [ordenes]);
  const availableMonths = useMemo(() => {
    const months = new Set();
    if (Array.isArray(ordenes)) {
      ordenes.forEach(orden => {
        if (orden && orden.fecha_ingreso) {
          const fechaUTC = new Date(orden.fecha_ingreso);
          if (!isNaN(fechaUTC)) {
            const fechaPeru = new Date(fechaUTC.getUTCFullYear(), fechaUTC.getUTCMonth(), fechaUTC.getUTCDate(), fechaUTC.getUTCHours() - 5, fechaUTC.getUTCMinutes(), fechaUTC.getUTCSeconds());
            if (!filterYear || fechaPeru.getFullYear() === Number(filterYear)) {
              months.add(fechaPeru.getMonth() + 1);
            }
          }
        }
      });
    }
    return Array.from(months).filter(Boolean).sort((a, b) => a - b);
  }, [ordenes, filterYear]);
  const availableDays = useMemo(() => {
    const days = new Set();
    if (Array.isArray(ordenes)) {
      ordenes.forEach(orden => {
        if (orden && orden.fecha_ingreso) {
          const fechaUTC = new Date(orden.fecha_ingreso);
          if (!isNaN(fechaUTC)) {
            const fechaPeru = new Date(fechaUTC.getUTCFullYear(), fechaUTC.getUTCMonth(), fechaUTC.getUTCDate(), fechaUTC.getUTCHours() - 5, fechaUTC.getUTCMinutes(), fechaUTC.getUTCSeconds());
            if (
              (!filterYear || fechaPeru.getFullYear() === Number(filterYear)) &&
              (!filterMonth || fechaPeru.getMonth() + 1 === Number(filterMonth))
            ) {
              days.add(fechaPeru.getDate());
            }
          }
        }
      });
    }
    return Array.from(days).filter(Boolean).sort((a, b) => a - b);
  }, [ordenes, filterYear, filterMonth]);

  // Nombres de los meses en español
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Calcular totales generales usando doughnutData filtrado
  const totalDiagnosticosFiltrados = doughnutData.reduce((acc, t) => acc + (t.ctd || 0), 0);
  const totalPagosFiltrados = doughnutData.reduce((acc, t) => acc + (t.valor || 0), 0);

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#181a2a', overflowX: 'hidden', padding: 0, margin: 0 }}>
      <div
        className="box mt-4 px-2 py-4 mx-2 mx-md-0"
        style={{
          background: '#232946',
          minHeight: '100vh',
          width: '100vw',
          maxWidth: '100vw',
          boxShadow: '0 2px 18px #0ea5e955',
          color: '#e0e7ff',
          borderRadius: 0,
          border: 'none',
          margin: 0,
          padding: isMobile ? 0 : 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            padding: isMobile ? 8 : 24,
            width: '100%',
            maxWidth: isMobile ? '100vw' : 1200,
          }}
        >
          <button
            onClick={() => navigate('/admin-dashboard')}
            style={{
              background: '#232946',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              fontWeight: 700,
              fontSize: isMobile ? '1rem' : '1.1rem',
              padding: isMobile ? '0.5em 1em' : '0.7em 1.5em',
              marginBottom: isMobile ? 12 : 24,
              cursor: 'pointer',
              boxShadow: '0 2px 12px #0ea5e955',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#313552')}
            onMouseOut={e => (e.currentTarget.style.background = '#232946')}
          >
            ⬅️ Volver al Panel de Administrador
          </button>
        </div>
        {/* Cuadro de totales generales más compacto */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: isMobile ? 12 : 24,
            marginTop: isMobile ? 4 : 8,
            width: '100%',
          }}
        >
          <div
            style={{
              background: '#23263a',
              color: '#fff',
              borderRadius: 14,
              padding: isMobile ? '8px 8px' : '12px 28px',
              fontWeight: 900,
              fontSize: isMobile ? 14 : 16,
              boxShadow: '0 2px 8px #0ea5e955',
              textAlign: 'center',
              border: '2px solid #0ea5e9',
              minWidth: isMobile ? 160 : 260,
              width: isMobile ? '90vw' : undefined,
            }}
          >
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, marginBottom: 8, letterSpacing: 1, color: '#0ea5e9' }}>
              Total general
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 700, color: '#fff' }}>
                Máquinas diagnosticadas:{' '}
                <span style={{ color: '#0ea5e9', fontWeight: 900 }}>{totalDiagnosticosFiltrados}</span>
              </span>
              <span style={{ fontWeight: 700, color: '#fff' }}>
                Ingresos:{' '}
                <span style={{ color: '#22c55e', fontWeight: 900 }}>S/ {totalPagosFiltrados.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>
        <h3
          className="title is-4 has-text-centered mt-5 mb-4"
          style={{
            color: '#e0e7ff',
            fontWeight: 900,
            letterSpacing: 1,
            textShadow: '0 2px 8px #0ea5e955',
            fontSize: isMobile ? 18 : 24,
            margin: isMobile ? '12px 0 8px 0' : '32px 0 24px 0',
          }}
        >
          Estadísticas por Técnico
        </h3>
        {/* Contenedor principal */}
        <div
          style={{
            width: '100%',
            maxWidth: isMobile ? '100vw' : 1000,
            margin: isMobile ? '0' : '0 auto',
            marginBottom: isMobile ? 12 : 32,
            background: '#23263a',
            borderRadius: 18,
            padding: isMobile ? 8 : 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Título */}
          <h2
            style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: isMobile ? 16 : 28,
              margin: isMobile ? '0 0 12px 0' : '0 0 24px 0',
              textAlign: 'center',
              letterSpacing: 1,
            }}
          >
            Ventas por técnico (diagnóstico)
          </h2>

          {/* Gráfico único (doughnut o barra según filtros) */}
          <div style={{ width: '100%', marginBottom: isMobile ? 12 : 24, overflowX: isMobile ? 'auto' : 'visible' }}>
            {doughnutData.length > 0 ? (
              filterYear || filterMonth || filterDay ? (
                <div style={{ width: isMobile ? '98vw' : '100%' }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 320 : 400}>
                    <BarChart data={doughnutData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="nombre" tick={false} />
                      <YAxis stroke="#fff" />
                      <Tooltip
                        contentStyle={{
                          background: '#181a2a',
                          border: '1.5px solid #0ea5e9',
                          borderRadius: 10,
                          color: '#e0e7ff',
                          fontWeight: 700,
                          minWidth: 120,
                        }}
                        itemStyle={{ color: '#e0e7ff', fontWeight: 700 }}
                        labelStyle={{ color: '#0ea5e9', fontWeight: 900, fontSize: isMobile ? 12 : 16 }}
                        cursor={{ fill: '#232946', opacity: 0.2 }}
                        formatter={(value, name) => {
                          if (name === 'Diagnósticos') return [value, 'Reparaciones Exitosas'];
                          if (name === 'Valor (S/)') return [`S/ ${value}`, 'Ingresos'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="ctd" name="Diagnósticos" fill={TECH_COLORS[0]}>
                        <LabelList dataKey="ctd" position="top" fill="#fff" fontSize={isMobile ? 10 : 14} />
                      </Bar>
                      <Bar dataKey="valor" name="Valor (S/)" fill={TECH_COLORS[1]}>
                        <LabelList dataKey="valor" position="top" fill="#fff" fontSize={isMobile ? 10 : 14} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ width: isMobile ? '98vw' : '100%' }}>
                  <TechnicianStatsDoughnut data={doughnutData} />
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: isMobile ? '10px' : '20px', color: '#fff' }}>
                No hay datos para mostrar con los filtros seleccionados
              </div>
            )}
          </div>

          {/* Filtros */}
          <div
            style={{
              display: 'flex',
              gap: isMobile ? 6 : 16,
              margin: isMobile ? '0 0 12px 0' : '0 0 24px 0',
              flexWrap: 'wrap',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <select
              value={selectedTechnicianId}
              onChange={e => setSelectedTechnicianId(e.target.value)}
              style={{
                padding: isMobile ? 4 : 8,
                borderRadius: 8,
                border: '1px solid #0ea5e9',
                fontWeight: 700,
                fontSize: isMobile ? 12 : 16,
                minWidth: isMobile ? 90 : 120,
              }}
            >
              <option value=''>Todos los técnicos</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{`${t.nombre} ${t.apellido}`.trim()}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => {
                setFilterYear(e.target.value);
                setFilterMonth('');
                setFilterDay('');
              }}
              style={{
                padding: isMobile ? 4 : 8,
                borderRadius: 8,
                border: '1px solid #0ea5e9',
                fontWeight: 700,
                fontSize: isMobile ? 12 : 16,
                minWidth: isMobile ? 70 : 90,
              }}
            >
              <option value=''>Año</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={filterMonth}
              onChange={e => {
                setFilterMonth(e.target.value);
                setFilterDay('');
              }}
              style={{
                padding: isMobile ? 4 : 8,
                borderRadius: 8,
                border: '1px solid #0ea5e9',
                fontWeight: 700,
                fontSize: isMobile ? 12 : 16,
                minWidth: isMobile ? 70 : 90,
              }}
            >
              <option value=''>Mes</option>
              {availableMonths.map(m => <option key={m} value={m}>{monthNames[m-1]}</option>)}
            </select>
            <select
              value={filterDay}
              onChange={e => setFilterDay(e.target.value)}
              style={{
                padding: isMobile ? 4 : 8,
                borderRadius: 8,
                border: '1px solid #0ea5e9',
                fontWeight: 700,
                fontSize: isMobile ? 12 : 16,
                minWidth: isMobile ? 60 : 80,
              }}
            >
              <option value=''>Día</option>
              {availableDays.map(d => <option key={d} value={d}>{d.toString().padStart(2, '0')}</option>)}
            </select>
            <button
              onClick={() => {
                setFilterYear('');
                setFilterMonth('');
                setFilterDay('');
                setSelectedTechnicianId('');
              }}
              style={{
                padding: isMobile ? '4px 8px' : '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#0ea5e9',
                color: '#fff',
                fontWeight: 700,
                fontSize: isMobile ? 12 : 16,
                minWidth: isMobile ? 70 : 100,
              }}
            >
              Limpiar filtros
            </button>
          </div>

          {/* Tabla de resumen */}
          <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible' }}>
            <TablaResumenTecnicos data={doughnutData} onRowClick={goToTechnicianStats} isMobile={isMobile} />
          </div>
        </div>
      </div>
      {/* Chat flotante PrintecGPT para empleados */}
      <PrintecGPTChat />
    </div>
  );
};

// Tabla resumen de técnicos con puntos de colores
const TablaResumenTecnicos = ({ data, onRowClick, isMobile }) => {
  let filtered = Array.isArray(data) ? data : [];
  if (!Array.isArray(filtered) || filtered.length === 0) {
    filtered = [{ nombre: 'Sin técnicos', ctd: 0, valor: 0, porcentaje: 0, colorIdx: 0, nombreSolo: 'Sin técnicos' }];
  }

  return (
    <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible' }}>
      <table
        style={{
          width: isMobile ? 400 : '100%', // más compacto
          minWidth: isMobile ? 400 : undefined,
          marginTop: isMobile ? 8 : 24,
          background: '#181a2a',
          borderRadius: 12,
          color: '#fff',
          fontWeight: 700,
          fontSize: isMobile ? 12 : 15, // fuente más pequeña
        }}
      >
        <thead>
          <tr style={{ background: '#0ea5e9', color: '#fff' }}>
            <th style={{ padding: isMobile ? 5 : 10, borderRadius: '12px 0 0 0', minWidth: 80 }}>USUARIO</th>
            <th style={{ padding: isMobile ? 5 : 10, minWidth: 60 }}>DIAG.</th>
            <th style={{ padding: isMobile ? 5 : 10, minWidth: 60 }}>VALOR</th>
            <th style={{ padding: isMobile ? 5 : 10, borderRadius: '0 12px 0 0', minWidth: 40 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr
              key={t.nombre}
              style={{ background: t.colorIdx % 2 === 0 ? '#23263a' : '#232946', cursor: 'pointer' }}
              onClick={() => onRowClick(t.nombre)}
            >
              <td style={{ padding: isMobile ? 5 : 8, display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isMobile ? 9 : 11,
                    height: isMobile ? 9 : 11,
                    borderRadius: '50%',
                    background: TECH_COLORS[t.colorIdx % TECH_COLORS.length],
                    marginRight: 6,
                  }}
                ></span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                  {t.nombre.split(' ')[0]}...
                </span>
              </td>
              <td style={{ padding: isMobile ? 5 : 8 }}>{t.ctd}</td>
              <td style={{ padding: isMobile ? 5 : 8 }}>S/ {t.valor.toFixed(2)}</td>
              <td style={{ padding: isMobile ? 5 : 8, color: t.porcentaje > 0 ? '#fbbf24' : '#fff', fontWeight: t.porcentaje > 0 ? 900 : 700 }}>
                {t.porcentaje ? t.porcentaje.toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TechnicianStats;