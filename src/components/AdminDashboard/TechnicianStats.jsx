import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactDatePicker from 'react-datepicker';
// Custom input para el datepicker que solo muestra el calendario y nunca abre el teclado
const CalendarButtonInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    style={{
      minWidth: 120,
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid #0ea5e9',
      background: '#fff',
      color: '#e53935',
      fontWeight: 700,
      fontSize: 16,
      cursor: 'pointer',
      boxShadow: '0 2px 8px #0ea5e955',
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
    tabIndex={0}
  >
    <span style={{ color: '#e53935', fontWeight: 900, fontSize: 18 }}>
      <i className="fas fa-calendar-alt"></i>
    </span>
    {value || placeholder || 'Seleccionar'}
  </button>
));
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import TechnicianStatsPDFExport from './TechnicianStatsPDFExport';
import PrintecGPTChat from '../PrintecGPTChat';
import TechnicianStatsDoughnut from './TechnicianStatsDoughnut';
import CajaTradingChart from './CajaTradingChart';
import { TECH_COLORS } from '../../utils/colors';
import PagosPendientesCuadreModal from './PagosPendientesCuadreModal';

// Cards de historial de cierres de caja (usando fetch directo)
function CajaCierresTable({ tecnicoId, cajaFilterYear, cajaFilterMonth, cajaFilterDay, cajaRangeStart, cajaRangeEnd, cajaRangeType }) {
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const cierresPorPagina = 5;

  // Reiniciar paginación cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [tecnicoId, cajaFilterYear, cajaFilterMonth, cajaFilterDay, cajaRangeStart, cajaRangeEnd, cajaRangeType]);

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

  // Calcular suma total de ingresos en el rango personalizado
  let sumaIngresosRango = 0;
  if (cajaRangeType === 'personalizado' && cajaRangeStart && cajaRangeEnd && cierresFiltrados.length > 0) {
    sumaIngresosRango = cierresFiltrados.reduce((acc, cierre) => acc + (parseFloat(cierre.monto_total) || 0), 0);
  }

  // Ordenar de más reciente a más antiguo
  cierresFiltrados = [...cierresFiltrados].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Estado para ver detalle de cierre
  const [detalleCierre, setDetalleCierre] = useState(null);
  const [pagosCierre, setPagosCierre] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  // Paginación para pagos en el modal
  const [paginaPagos, setPaginaPagos] = useState(1);
  const pagosPorPagina = 5;
  useEffect(() => {
    if (!modalDetalleVisible) setPaginaPagos(1);
  }, [modalDetalleVisible, pagosCierre]);

  // Función para cargar el detalle de un cierre
  const verDetalleCierre = async (cierreId) => {
    setLoadingDetalle(true);
    setDetalleCierre(null);
    setPagosCierre([]);
    setModalDetalleVisible(true);
    try {
      const res = await fetch(`https://servidorserviciotecnicolima-production.up.railway.app/api/cierres-caja/${cierreId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setDetalleCierre(data.data);
        setPagosCierre(data.data.Pagos || data.data.pagos || []);
      } else {
        setDetalleCierre({ error: 'No se pudo cargar el detalle.' });
      }
    } catch (e) {
      setDetalleCierre({ error: 'Error de conexión.' });
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Paginación
  const totalPaginas = Math.ceil(cierresFiltrados.length / cierresPorPagina);
  const indiceUltimoCierre = paginaActual * cierresPorPagina;
  const indicePrimerCierre = indiceUltimoCierre - cierresPorPagina;
  const cierresPaginados = cierresFiltrados.slice(indicePrimerCierre, indiceUltimoCierre);

  if (loading) {
    return <div style={{ color: '#fff', fontSize: 16 }}>Cargando cierres de caja...</div>;
  }
  if (!cierresFiltrados || cierresFiltrados.length === 0) {
    return (<div style={{ color: '#fff', fontSize: 16 }}>No hay cierres de caja registrados.</div>);
  }
  return (
    <div style={{ marginTop: 8 }}>
      {/* Suma total de ingresos en rango personalizado */}
      {cajaRangeType === 'personalizado' && cajaRangeStart && cajaRangeEnd && cierresFiltrados.length > 0 && (
        <div style={{
          background: '#23263a',
          color: '#22c55e',
          borderRadius: 12,
          padding: '12px 24px',
          fontWeight: 900,
          fontSize: 18,
          boxShadow: '0 2px 8px #6366f1',
          textAlign: 'center',
          border: '2px solid #6366f1',
          marginBottom: 18,
          width: '100%',
          maxWidth: 500,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Total ingresos en rango: <span style={{ color: '#fff', fontWeight: 900 }}>S/ {sumaIngresosRango.toFixed(2)}</span>
        </div>
      )}
      {/* Grid de cards de cierres de caja */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20,
        marginBottom: 32,
        padding: '0 8px',
      }}>
        {cierresPaginados.map((cierre) => {
          const fechaObj = cierre.createdAt ? new Date(cierre.createdAt) : null;
          const fechaStr = fechaObj ? fechaObj.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
          return (
            <div key={cierre.id + cierre.createdAt} style={{
              background: 'linear-gradient(135deg, #181a2a 70%, #6366f1 100%)',
              borderRadius: 18,
              boxShadow: '0 2px 12px #6366f1',
              padding: 22,
              color: '#fff',
              fontWeight: 700,
              fontSize: 17,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              border: '2px solid #6366f1',
              position: 'relative',
              minHeight: 90,
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#A5B4FC', marginBottom: 2 }}>
                  S/ {parseFloat(cierre.monto_total || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 16, color: '#22c55e', fontWeight: 900 }}>
                  <span style={{ marginRight: 6 }}>Efectivo:</span>
                  S/ {parseFloat(cierre.total_efectivo || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 16, color: '#0ea5e9', fontWeight: 900 }}>
                  <span style={{ marginRight: 6 }}>Elec.:</span>
                  S/ {parseFloat(cierre.total_debito || 0).toFixed(2)}
                </div>
              </div>
              <div style={{
                minWidth: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                height: '100%',
              }}>
                <span style={{
                  background: '#6366f1',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '2px 7px',
                  fontWeight: 600,
                  fontSize: 11,
                  boxShadow: '0 1px 3px #6366f1',
                  marginBottom: 0,
                  letterSpacing: 0.3,
                  whiteSpace: 'nowrap',
                  opacity: 0.85,
                  minWidth: 0,
                  textAlign: 'center',
                  display: 'inline-block',
                }}>{fechaStr}</span>
                <button onClick={() => verDetalleCierre(cierre.id)} style={{ marginTop: 6, padding: '2px 7px', borderRadius: 6, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer', minWidth: 0, height: 22, lineHeight: '1.1' }}>Ver detalle</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETALLE CIERRE */}
      {modalDetalleVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(99, 102, 241, 0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#23263a',
            borderRadius: 18,
            padding: '32px 24px',
            boxShadow: '0 2px 18px #6366f1',
            minWidth: 320,
            maxWidth: 420,
            position: 'relative',
            color: '#fff',
            border: '2px solid #6366f1',
          }}>
            <button
              onClick={() => setModalDetalleVisible(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#6366f1',
                cursor: 'pointer',
                fontWeight: 700
              }}
              aria-label="Cerrar"
            >×</button>
            <h4 style={{ color: '#A5B4FC', fontWeight: 900, marginBottom: 12, fontSize: '1.18rem', textAlign: 'center', letterSpacing: 1, textShadow: '0 2px 8px #6366f1' }}>Detalle del cierre</h4>
            {loadingDetalle && <div style={{ color: '#A5B4FC', marginTop: 12 }}>Cargando detalle...</div>}
            {detalleCierre && (
              detalleCierre.error ? (
                <div style={{ color: '#f87171', fontWeight: 700 }}>{detalleCierre.error}</div>
              ) : (
                <>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#A5B4FC', marginBottom: 8 }}>S/ {parseFloat(detalleCierre.monto_total).toFixed(2)}</div>
                  <div style={{ fontSize: 15, color: '#22c55e', fontWeight: 900, marginBottom: 4 }}>
                    <span style={{ marginRight: 6 }}>Efectivo:</span>
                    S/ {parseFloat(detalleCierre.total_efectivo || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 15, color: '#0ea5e9', fontWeight: 900, marginBottom: 4 }}>
                    <span style={{ marginRight: 6 }}>Elec.:</span>
                    S/ {parseFloat(detalleCierre.total_debito || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 14, color: '#A5B4FC', fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ marginRight: 6 }}>Fecha:</span>
                    {detalleCierre.createdAt ? new Date(detalleCierre.createdAt).toLocaleString('es-PE') : ''}
                  </div>
                  <div style={{ fontSize: 14, color: '#0ea5e9', fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ marginRight: 6 }}>Técnico:</span>
                    {detalleCierre.Tecnico ? `${detalleCierre.Tecnico.nombre} ${detalleCierre.Tecnico.apellido}` : 'N/A'}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <b style={{ color: '#fbbf24', fontWeight: 900 }}>Pagos incluidos en este cierre:</b>
                    {pagosCierre.length === 0 ? (
                      <div style={{ color: '#A5B4FC', marginTop: 6 }}>No hay pagos asociados a este cierre.</div>
                    ) : (
                      <>
                        <table style={{ background: '#181a2a', marginTop: 8, width: '100%', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px #6366f1' }}>
                          <thead style={{ background: '#6366f1' }}>
                            <tr>
                              <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Monto</th>
                              <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Método</th>
                              <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagosCierre.slice((paginaPagos - 1) * pagosPorPagina, paginaPagos * pagosPorPagina).map((pago, idx) => (
                              <tr key={idx + (paginaPagos - 1) * pagosPorPagina} style={{ background: ((idx + (paginaPagos - 1) * pagosPorPagina) % 2 === 0 ? '#23263a' : '#232946') }}>
                                <td style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>S/. {parseFloat(pago.monto || 0).toFixed(2)}</td>
                                <td style={{ color: '#22c55e', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>{pago.metodo_pago || pago.metodo || '-'}</td>
                                <td style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>{pago.createdAt ? new Date(pago.createdAt).toLocaleDateString('es-PE') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Paginación de pagos */}
                        {pagosCierre.length > pagosPorPagina && (
                          <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 }}>
                            <button
                              onClick={() => setPaginaPagos(p => Math.max(1, p - 1))}
                              disabled={paginaPagos === 1}
                              style={{ padding: '6px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: paginaPagos === 1 ? 'not-allowed' : 'pointer', opacity: paginaPagos === 1 ? 0.6 : 1 }}
                            >Anterior</button>
                            <span style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 15 }}>Página {paginaPagos} de {Math.ceil(pagosCierre.length / pagosPorPagina)}</span>
                            <button
                              onClick={() => setPaginaPagos(p => Math.min(Math.ceil(pagosCierre.length / pagosPorPagina), p + 1))}
                              disabled={paginaPagos === Math.ceil(pagosCierre.length / pagosPorPagina)}
                              style={{ padding: '6px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: paginaPagos === Math.ceil(pagosCierre.length / pagosPorPagina) ? 'not-allowed' : 'pointer', opacity: paginaPagos === Math.ceil(pagosCierre.length / pagosPorPagina) ? 0.6 : 1 }}
                            >Siguiente</button>
                          </nav>
                        )}
                      </>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
      {/* Paginación */}
      {totalPaginas > 1 && (
        <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 }}>
          <button
            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            style={{ padding: '6px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', opacity: paginaActual === 1 ? 0.6 : 1 }}
          >Anterior</button>
          <span style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 15 }}>Página {paginaActual} de {totalPaginas}</span>
          <button
            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            style={{ padding: '6px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', opacity: paginaActual === totalPaginas ? 0.6 : 1 }}
          >Siguiente</button>
        </nav>
      )}
    </div>
  );
}

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
  // Filtros de rango para Estadísticas por Técnico
  const [filterRangeStart, setFilterRangeStart] = useState('');
  const [filterRangeEnd, setFilterRangeEnd] = useState('');
  // Filtros para cierre de caja
  const [cajaFilterYear, setCajaFilterYear] = useState('');
  const [cajaFilterMonth, setCajaFilterMonth] = useState('');
  const [cajaFilterDay, setCajaFilterDay] = useState('');
  const [cajaRangeStart, setCajaRangeStart] = useState('');
  const [cajaRangeEnd, setCajaRangeEnd] = useState('');
  const [cajaRangeType, setCajaRangeType] = useState('personalizado');
  const chartContainerRef = useRef(null);
  const navigate = useNavigate();
  // Estado para mostrar/ocultar historial de caja
  const [showCaja, setShowCaja] = useState(false);
  const [modalPendientesVisible, setModalPendientesVisible] = useState(false);

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
      </div>
    );
  }
  {/* ...existing code... */}

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
    let ordenesValidas = ordenes.filter(orden => {
      const tieneTecnico = orden.dispositivo && (
        orden.dispositivo.tecnico_id !== null && orden.dispositivo.tecnico_id !== undefined ||
        orden.dispositivo.tecnico_recibio !== null && orden.dispositivo.tecnico_recibio !== undefined ||
        orden.dispositivo.tecnico_entrego !== null && orden.dispositivo.tecnico_entrego !== undefined
      );
      const noEliminado = !orden.costo_acordado;
      // Si hay técnico seleccionado, filtrar solo las órdenes donde ese técnico diagnosticó
      if (selectedTechnicianId && (!orden.dispositivo || String(orden.dispositivo.tecnico_id) !== String(selectedTechnicianId))) {
        return false;
      }
      return tieneTecnico && noEliminado;
    });

    // Filtrar por año, mes, día y rango si corresponde
    ordenesValidas = ordenesValidas.filter(orden => {
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
      // Filtro de rango personalizado
      if (filterRangeStart && filterRangeEnd) {
        const start = new Date(filterRangeStart);
        const end = new Date(filterRangeEnd);
        end.setHours(23,59,59,999);
        if (!(fechaPeru >= start && fechaPeru <= end)) return false;
      }
      return true;
    });

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
      // Solo contar órdenes donde el técnico diagnosticó y cumple filtro de fecha y rango
      const ordenesDiagnostico = ordenesValidas.filter(orden => orden.dispositivo.tecnico_id === tecnicoId);
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
  }, [ordenes, tecnicos, selectedTechnicianId, filterYear, filterMonth, filterDay, filterRangeStart, filterRangeEnd]);

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
          {/* Solo mostrar ventas por técnico y gráfico si NO está seleccionada la vista de Caja */}
          {!showCaja && (
            <>
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
              <div style={{ width: '100%', marginBottom: isMobile ? 12 : 24, overflowX: isMobile ? 'auto' : 'visible' }}>
                {doughnutData.length > 0 ? (
                  (filterYear || filterMonth || filterDay || (filterRangeStart && filterRangeEnd)) ? (
                    <div style={{ width: isMobile ? '98vw' : '100%' }}>
                      <ResponsiveContainer width="100%" height={isMobile ? 320 : 400}>
                        <BarChart data={doughnutData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <XAxis dataKey="nombre" tick={false} />
                          <YAxis stroke="#fff" />
                          <Tooltip
                            contentStyle={{ background: '#181a2a', border: '1.5px solid #0ea5e9', borderRadius: 10, color: '#e0e7ff', fontWeight: 700, minWidth: 120 }}
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
            </>
          )}

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
            {showCaja ? (
              <>
                {/* Filtro unificado por fecha (año/mes/día) */}
                <ReactDatePicker
                  selected={cajaFilterDay ? new Date(`${cajaFilterYear}-${cajaFilterMonth.padStart(2,'0')}-${cajaFilterDay.padStart(2,'0')}`) : null}
                  onChange={date => {
                    if (date) {
                      setCajaFilterYear(date.getFullYear().toString());
                      setCajaFilterMonth((date.getMonth() + 1).toString());
                      setCajaFilterDay(date.getDate().toString());
                    } else {
                      setCajaFilterYear('');
                      setCajaFilterMonth('');
                      setCajaFilterDay('');
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Fecha"
                  customInput={<CalendarButtonInput placeholder="Fecha" />}
                  showPopperArrow={false}
                />
                {/* Filtro de rango personalizado con color diferenciado */}
                <ReactDatePicker
                  selected={cajaRangeStart ? new Date(cajaRangeStart) : null}
                  onChange={date => setCajaRangeStart(date ? date.toISOString().slice(0,10) : '')}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Inicio"
                  customInput={<CalendarButtonInput placeholder="Inicio" />}
                  showPopperArrow={false}
                />
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>a</span>
                <ReactDatePicker
                  selected={cajaRangeEnd ? new Date(cajaRangeEnd) : null}
                  onChange={date => setCajaRangeEnd(date ? date.toISOString().slice(0,10) : '')}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Fin"
                  customInput={<CalendarButtonInput placeholder="Fin" />}
                  showPopperArrow={false}
                />
                <button onClick={() => { setCajaFilterYear(''); setCajaFilterMonth(''); setCajaFilterDay(''); setCajaRangeStart(''); setCajaRangeEnd(''); }} style={{ padding: isMobile ? '4px 8px' : '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: isMobile ? 12 : 16, minWidth: isMobile ? 70 : 100 }}>Limpiar filtros</button>
                <button onClick={() => setShowCaja(false)} style={{ padding: isMobile ? '4px 8px' : '8px 16px', borderRadius: 8, border: '2px solid #6366f1', background: '#23263A', color: '#A5B4FC', fontWeight: 700, fontSize: isMobile ? 12 : 16, minWidth: isMobile ? 70 : 100 }}>Ocultar Caja</button>
              </>
            ) : (
              <>
          {/* Filtros normales + rango personalizado */}
          <select value={selectedTechnicianId} onChange={e => setSelectedTechnicianId(e.target.value)} style={{ padding: isMobile ? 4 : 8, borderRadius: 8, border: '1px solid #0ea5e9', fontWeight: 700, fontSize: isMobile ? 12 : 16, minWidth: isMobile ? 90 : 120 }}>
            <option value=''>Todos los técnicos</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{`${t.nombre} ${t.apellido}`.trim()}</option>
            ))}
          </select>
          <ReactDatePicker
            selected={filterDate ? new Date(filterDate) : null}
            onChange={date => {
              if (date) {
                setFilterDate(date.toISOString().slice(0,10));
                setFilterYear(date.getFullYear().toString());
                setFilterMonth((date.getMonth() + 1).toString());
                setFilterDay(date.getDate().toString());
              } else {
                setFilterDate('');
                setFilterYear('');
                setFilterMonth('');
                setFilterDay('');
              }
            }}
            dateFormat="yyyy-MM-dd"
            placeholderText="Fecha"
            customInput={<CalendarButtonInput placeholder="Fecha" />}
            showPopperArrow={false}
          />
          {/* Filtro de rango personalizado con color diferenciado */}
          <span style={{ marginLeft: 6, marginRight: 2, color: '#fff', fontSize: isMobile ? 16 : 22 }}>
            <i className="fas fa-calendar-alt"></i>
          </span>
          <ReactDatePicker
            selected={filterRangeStart ? new Date(filterRangeStart) : null}
            onChange={date => setFilterRangeStart(date ? date.toISOString().slice(0,10) : '')}
            dateFormat="yyyy-MM-dd"
            placeholderText="Inicio"
            customInput={<CalendarButtonInput placeholder="Inicio" />}
            showPopperArrow={false}
          />
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>a</span>
          <span style={{ marginLeft: 2, marginRight: 6, color: '#fff', fontSize: isMobile ? 16 : 22 }}>
            <i className="fas fa-calendar-alt"></i>
          </span>
          <ReactDatePicker
            selected={filterRangeEnd ? new Date(filterRangeEnd) : null}
            onChange={date => setFilterRangeEnd(date ? date.toISOString().slice(0,10) : '')}
            dateFormat="yyyy-MM-dd"
            placeholderText="Fin"
            customInput={<CalendarButtonInput placeholder="Fin" />}
            showPopperArrow={false}
          />
          <button onClick={() => { setFilterDate(''); setFilterYear(''); setFilterMonth(''); setFilterDay(''); setSelectedTechnicianId(''); setFilterRangeStart(''); setFilterRangeEnd(''); }} style={{ padding: isMobile ? '4px 8px' : '8px 16px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: isMobile ? 12 : 16, minWidth: isMobile ? 70 : 100 }}>Limpiar filtros</button>
          <button
            onClick={() => { setShowCaja(prev => !prev); }}
            style={{
              padding: isMobile ? '4px 8px' : '8px 16px',
              borderRadius: 8,
              border: showCaja ? '2px solid #22c55e' : '2px solid #22c55e',
              background: showCaja ? '#22c55e' : '#23263A',
              color: showCaja ? '#fff' : '#22c55e',
              fontWeight: 900,
              fontSize: isMobile ? 13 : 18,
              minWidth: isMobile ? 80 : 120,
              boxShadow: showCaja ? '0 2px 12px #22c55e88' : '0 2px 8px #22c55e44',
              transition: 'all 0.2s',
              letterSpacing: 1,
              outline: showCaja ? '2px solid #22c55e' : 'none',
            }}
          >{showCaja ? 'Ocultar Caja' : 'Caja'}</button>
              </>
            )}
          </div>
      {showCaja ? (
        <>
          {/* Gráfico trading de cierres de caja */}
          <CajaTradingChart
            tecnicoId={selectedTechnicianId}
            cajaFilterYear={cajaFilterYear}
            cajaFilterMonth={cajaFilterMonth}
            cajaFilterDay={cajaFilterDay}
            cajaRangeStart={cajaRangeStart}
            cajaRangeEnd={cajaRangeEnd}
            isMobile={isMobile}
          />
          <div style={{ margin: '32px 0', background: 'transparent', borderRadius: 0, boxShadow: 'none', padding: 0 }}>
            <CajaCierresTable
              tecnicoId={selectedTechnicianId}
              cajaFilterYear={cajaFilterYear}
              cajaFilterMonth={cajaFilterMonth}
              cajaFilterDay={cajaFilterDay}
              cajaRangeStart={cajaRangeStart}
              cajaRangeEnd={cajaRangeEnd}
              cajaRangeType={cajaRangeType}
            />
          </div>
        </>
      ) : (
        <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible' }}>
          <TablaResumenTecnicos data={doughnutData} onRowClick={goToTechnicianStats} isMobile={isMobile} />
        </div>
      )}
      {/* Botón flotante y modal de pagos pendientes de cuadre solo en Caja */}
      {showCaja && (
        <>
          <button
            onClick={() => setModalPendientesVisible(true)}
            style={{
              position: 'fixed',
              right: 24,
              bottom: 32,
              zIndex: 9999,
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontWeight: 900,
              fontSize: 20,
              padding: '18px 28px',
              boxShadow: '0 2px 18px #22c55e88',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: '2px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
            title="Pagos pendientes de cuadre"
          >
            💸 Pendientes
          </button>
          <PagosPendientesCuadreModal visible={modalPendientesVisible} onClose={() => setModalPendientesVisible(false)} />
        </>
      )}
        </div>
      </div>

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