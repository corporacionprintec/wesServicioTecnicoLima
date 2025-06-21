import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import TechnicianStatsPDFExport from './TechnicianStatsPDFExport';
import PrintecGPTChat from '../PrintecGPTChat';

const TechnicianStats = ({ ordenes, tecnicos = [], filterLabel = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('reparaciones'); // 'reparaciones' o 'ingresos'
  const [showModal, setShowModal] = useState(false);
  const [modalTechnician, setModalTechnician] = useState(null);
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
      sessionStorage.setItem('selectedTechnicianId', tecnico.id);
      sessionStorage.setItem('selectedTechnicianName', tecnico.nombre);
      sessionStorage.setItem('selectedTechnicianLastname', tecnico.apellido);
    }
    navigate('/Estadistica-personal');
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
      const ordenesDelTecnico = ordenesPorTecnico[tecnicoId] || [];
      // Contar roles específicos
      let totalDiagnostico = 0;
      let totalRecibio = 0;
      let totalEntrego = 0;
      // Reparaciones: solo las órdenes donde el técnico entregó
      const entregadasPorTecnico = ordenesDelTecnico.filter(orden => orden.dispositivo.tecnico_entrego === tecnicoId);
      ordenesDelTecnico.forEach(orden => {
        if (orden.dispositivo.tecnico_id === tecnicoId) totalDiagnostico++;
        if (orden.dispositivo.tecnico_recibio === tecnicoId) totalRecibio++;
        if (orden.dispositivo.tecnico_entrego === tecnicoId) totalEntrego++;
      });
      let reparacionesExitosas = entregadasPorTecnico.length;
      let totalIngresos = entregadasPorTecnico.reduce((acc, orden) => {
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

  // Calcular el filtro directamente, sin estado ni useEffect
  const filteredStats = useMemo(() => {
    return technicianStats.filter(tech =>
      tech.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || String(tech.tecnicoId).includes(searchTerm)
    );
  }, [searchTerm, technicianStats]);

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedItem = data.activePayload[0].payload;
      goToTechnicianStats(clickedItem.nombre, clickedItem);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0 || !payload[0] || payload[0].value === undefined) {
      return null;
    }
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: '#f5f7fa',
        padding: '10px',
        border: '1.5px solid #b5d0ee',
        borderRadius: '8px',
        boxShadow: '0 2px 8px #b5d0ee',
        color: '#2d3a4a',
      }}>
        <p className="label" style={{ margin: 0, fontWeight: 'bold', color: '#2563eb' }}>{`${label}`}</p>
        {payload[0] && payload[0].value !== undefined && (
          <p style={{ margin: '5px 0', color: '#2563eb' }}>
            {`Reparaciones Exitosas: ${payload[0].value}`}
          </p>
        )}
        {payload[1] && payload[1].value !== undefined && (
          <p style={{ margin: '5px 0', color: '#10b981' }}>
            {`Ingresos: S/ ${payload[1].value}`}
          </p>
        )}
        <p style={{ margin: 0, fontSize: '0.8em', color: '#64748b' }}>
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
    const minWidth = Math.max(filteredStats.length * 80, 320);
    return isMobile ? minWidth : '100%';
  };

  // Altura del gráfico ajustada para móvil y escritorio (más grande)
  const chartHeight = isMobile ? 600 : 500;

  // Centrar el scroll horizontal del gráfico al cargar o al cambiar los datos
  useEffect(() => {
    if (isMobile && chartContainerRef.current && filteredStats.length > 3) {
      const container = chartContainerRef.current;
      // Centra el scroll horizontal
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }
  }, [isMobile, filteredStats]);

  // Función para obtener iniciales del nombre
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0]?.toUpperCase() || '')
      .join('');
  };

  // Nuevo: técnico actualmente mostrado (primero del filtro, o null)
  // const currentTechnician = filteredStats.length > 0 ? filteredStats[0] : null;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#181a2a', overflowX: 'hidden', padding: 0, margin: 0 }}>
      <div className="box mt-4 px-2 py-4 mx-2 mx-md-0" style={{ background: '#232946', minHeight: '100vh', width: '100vw', maxWidth: '100vw', boxShadow: '0 2px 18px #0ea5e955', color: '#e0e7ff', borderRadius: 0, border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{padding: 24, width: '100%', maxWidth: 1200}}>
      <button
        onClick={() => navigate('/admin-dashboard')}
        style={{
          background: '#232946',
          color: '#fff',
          border: 'none',
          borderRadius: 16,
          fontWeight: 700,
          fontSize: '1.1rem',
          padding: '0.7em 1.5em',
          marginBottom: 24,
          cursor: 'pointer',
          boxShadow: '0 2px 12px #0ea5e955',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.background = '#313552'}
        onMouseOut={e => e.currentTarget.style.background = '#232946'}
      >
        ⬅️ Volver al Panel de Administrador
      </button>
      </div>
        <div className="field has-addons is-justify-content-center" style={{ color: '#e0e7ff' }}>
          <div className="control has-icons-left is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Buscar técnico..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ fontSize: 16, background: '#23263a', color: '#e0e7ff', border: '2px solid #0ea5e9', fontWeight: 700, '::placeholder': { color: '#0ea5e9', fontWeight: 700 } }}
            />
            <span className="icon is-left">
              <i className="fas fa-search"></i>
            </span>
          </div>
          {searchTerm && (
            <div className="control">
              <button className="button is-light" style={{ color: '#e0e7ff', background: '#0ea5e9', border: 'none' }} onClick={() => setSearchTerm('')}>Limpiar</button>
            </div>
          )}
        </div>
        <style>{`
          input::placeholder {
            color: #0ea5e9 !important;
            font-weight: 700 !important;
            opacity: 1;
          }
        `}</style>
        <h3 className="title is-4 has-text-centered mt-5 mb-4" style={{ color: '#e0e7ff', fontWeight: 900, letterSpacing: 1, textShadow: '0 2px 8px #0ea5e955' }}>Estadísticas por Técnico</h3>
        {/* Cards de técnicos */}
        <div className="columns is-multiline is-centered" style={{ gap: '1.5rem 0.5rem' }}>
          {filteredStats.length > 0 ? (
            filteredStats.map((tecnico, idx) => (
              <div key={tecnico.tecnicoId} className="column is-12-mobile is-6-tablet is-4-desktop">
                <div className="card" style={{ borderRadius: 22, boxShadow: '0 4px 24px #0ea5e955', background: '#232946', marginBottom: 24, border: '2px solid #313552', transition: 'box-shadow 0.2s', minHeight: 270 }}>
                  <div className="card-content" style={{ padding: 24 }}>
                    <div className="is-flex is-align-items-center mb-3" style={{ gap: 16 }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#313552', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#fff', marginRight: 0, boxShadow: '0 2px 8px #0ea5e955' }}>
                        {tecnico.nombreSolo[0]?.toUpperCase() || 'T'}
                      </div>
                      <div>
                        <h4 className="is-size-5 has-text-weight-bold" style={{ color: '#fff', marginBottom: 2, fontSize: 20, letterSpacing: 0.5 }}>{tecnico.nombre}</h4>
                        <span className="tag is-info is-light" style={{ fontWeight: 700, color: '#0ea5e9', borderRadius: 8, fontSize: 14, background: '#23263a' }}>ID: {tecnico.tecnicoId}</span>
                      </div>
                    </div>
                    <div className="mb-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span className="tag is-success is-light" style={{ fontWeight: 700, color: '#10b981', borderRadius: 8, fontSize: 16, background: '#23263a' }}>
                        <i className="fas fa-tools" style={{ marginRight: 6 }}></i> Reparaciones: {tecnico.reparacionesExitosas}
                      </span>
                      <span className="tag is-info is-light" style={{ fontWeight: 700, color: '#38bdf8', borderRadius: 8, fontSize: 15, background: '#23263a' }}>
                        <i className="fas fa-sign-in-alt" style={{ marginRight: 6 }}></i> Recibió: {tecnico.totalRecibio}
                      </span>
                      <span className="tag is-warning is-light" style={{ fontWeight: 700, color: '#fbbf24', borderRadius: 8, fontSize: 15, background: '#23263a' }}>
                        <i className="fas fa-stethoscope" style={{ marginRight: 6 }}></i> Diagnóstico: {tecnico.totalDiagnostico}
                      </span>
                      <span className="tag is-danger is-light" style={{ fontWeight: 700, color: '#f87171', borderRadius: 8, fontSize: 15, background: '#23263a' }}>
                        <i className="fas fa-sign-out-alt" style={{ marginRight: 6 }}></i> Entregó: {tecnico.totalEntrego}
                      </span>
                    </div>
                    <div className="mb-2" style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="button is-small is-primary"
                        style={{ fontWeight: 700, borderRadius: 8, fontSize: 15, marginTop: 4, background: '#0ea5e9', color: '#fff', boxShadow: '0 2px 8px #0ea5e955', border: 'none', padding: '0.6em 1.3em' }}
                        onClick={() => { setShowModal(true); setModalTechnician(tecnico); }}
                      >
                        <i className="fas fa-chart-bar" style={{ marginRight: 7 }}></i> Ver Gráficos
                      </button>
                      <button
                        className="button is-small is-info"
                        style={{ fontWeight: 700, borderRadius: 8, fontSize: 15, marginTop: 4, background: '#232946', color: '#fff', boxShadow: '0 2px 8px #0ea5e955', border: 'none', padding: '0.6em 1.3em' }}
                        onMouseOver={e => e.currentTarget.style.background = '#313552'}
                        onMouseOut={e => e.currentTarget.style.background = '#232946'}
                        onClick={() => navigate(`/admin-dashboard/tecnico-stats?tecnicoId=${tecnico.tecnicoId}`)}
                      >
                        <i className="fas fa-list-alt" style={{ marginRight: 7 }}></i> Ver reparaciones
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="column is-12 has-text-centered">
              {renderPlaceholder()}
            </div>
          )}
        </div>
        {/* Modal de gráficos por técnico */}
        {showModal && modalTechnician && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(24,26,42,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#232946', borderRadius: 18, padding: 32, minWidth: isMobile ? '90vw' : 400, maxWidth: '95vw', boxShadow: '0 8px 32px #0ea5e955', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={() => { setShowModal(false); setModalTechnician(null); }}
                style={{ position: 'absolute', top: 18, right: 18, background: 'none', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', zIndex: 10001 }}
                aria-label="Cerrar modal"
              >
                <i className="fas fa-times"></i>
              </button>
              <h3 style={{ color: '#e0e7ff', fontWeight: 900, fontSize: 24, marginBottom: 24, textAlign: 'center', letterSpacing: 1 }}>Gráficos de {modalTechnician.nombre}</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={[modalTechnician]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="nombreSolo" stroke="#e0e7ff" tick={{ fontWeight: 700, fontSize: 14 }} />
                  <YAxis stroke="#e0e7ff" tick={{ fontWeight: 700, fontSize: 14 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#23263a', color: '#e0e7ff', borderRadius: 8, border: '1.5px solid #0ea5e9' }} />
                  <Legend wrapperStyle={{ color: '#e0e7ff', fontWeight: 700 }} />
                  <Bar dataKey="reparacionesExitosas" fill="#10b981" name="Reparaciones" >
                    <LabelList dataKey="reparacionesExitosas" position="top" fill="#e0e7ff" fontWeight={700} />
                  </Bar>
                  <Bar dataKey="totalDiagnostico" fill="#fbbf24" name="Diagnóstico" >
                    <LabelList dataKey="totalDiagnostico" position="top" fill="#e0e7ff" fontWeight={700} />
                  </Bar>
                  <Bar dataKey="totalRecibio" fill="#38bdf8" name="Recibió" >
                    <LabelList dataKey="totalRecibio" position="top" fill="#e0e7ff" fontWeight={700} />
                  </Bar>
                  <Bar dataKey="totalEntrego" fill="#f87171" name="Entregó" >
                    <LabelList dataKey="totalEntrego" position="top" fill="#e0e7ff" fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <button
                onClick={() => { setShowModal(false); setModalTechnician(null); }}
                style={{ marginTop: 32, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 18, padding: '0.7em 2.2em', boxShadow: '0 2px 8px #0ea5e955', cursor: 'pointer', letterSpacing: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Chat flotante PrintecGPT para empleados */}
      <PrintecGPTChat />
    </div>
  );
};

export default TechnicianStats;