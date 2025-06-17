import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TechnicianStatsPDFExport from './TechnicianStatsPDFExport';
import PrintecGPTChat from '../PrintecGPTChat';

const TechnicianStats = ({ ordenes, tecnicos = [], filterLabel = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('reparaciones'); // 'reparaciones' o 'ingresos'
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
      const tieneTecnicoId = orden.dispositivo && orden.dispositivo.tecnico_id !== null && orden.dispositivo.tecnico_id !== undefined;
      const noEliminado = orden.costo_acordado === null || orden.costo_acordado === undefined;
      return tieneTecnicoId && noEliminado;
    });
    const ordenesPorTecnico = {};
    ordenesValidas.forEach(orden => {
      const tecnicoId = orden.dispositivo.tecnico_id;
      if (!ordenesPorTecnico[tecnicoId]) {
        ordenesPorTecnico[tecnicoId] = [];
      }
      ordenesPorTecnico[tecnicoId].push(orden);
    });
    return tecnicos.map(tecnico => {
      const tecnicoId = tecnico.id;
      const ordenesDelTecnico = ordenesPorTecnico[tecnicoId] || [];
      let reparacionesExitosas = ordenesDelTecnico.length;
      let totalIngresos = ordenesDelTecnico.reduce((acc, orden) => {
        const costoTotal = parseFloat(orden.dispositivo?.costo_total) || 0;
        return acc + costoTotal;
      }, 0);
      const nombreSolo = tecnico.nombre.split(' ')[0];
      return {
        tecnicoId,
        nombre: `${tecnico.nombre} ${tecnico.apellido}`.trim(),
        nombreSolo,
        rol: tecnico.rol,
        reparacionesDiarias: ordenesDelTecnico.length,
        reparacionesExitosas,
        totalIngresos,
        reparacionesNoEliminadas: ordenesDelTecnico.length
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
    <div className="container" style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <div className="box mt-4 px-2 py-4 mx-2 mx-md-0" style={{ background: '#fff', minHeight: '80vh', boxShadow: '0 2px 12px #b5d0ee33', color: '#1a202c' }}>
        <div className="field has-addons is-justify-content-center" style={{ color: '#1a202c' }}>
          <div className="control has-icons-left is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Buscar técnico..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ fontSize: 16, background: '#fff', color: '#1a202c', border: '2px solid #2563eb', fontWeight: 700, '::placeholder': { color: '#ff8800', fontWeight: 700 } }}
            />
            <span className="icon is-left">
              <i className="fas fa-search"></i>
            </span>
          </div>
          {searchTerm && (
            <div className="control">
              <button className="button is-light" style={{ color: '#1a202c' }} onClick={() => setSearchTerm('')}>Limpiar</button>
            </div>
          )}
        </div>
        <style>{`
          input::placeholder {
            color: #ff8800 !important;
            font-weight: 700 !important;
            opacity: 1;
          }
        `}</style>
        <h3 className="title is-4 has-text-centered mt-5 mb-4" style={{ color: '#1a202c', fontWeight: 900 }}>Estadísticas por Técnico</h3>
        {/* Cards de técnicos */}
        <div className="columns is-multiline is-centered">
          {filteredStats.length > 0 ? (
            filteredStats.map((tecnico, idx) => (
              <div key={tecnico.tecnicoId} className="column is-12-mobile is-6-tablet is-4-desktop">
                <div className="card" style={{ borderRadius: 16, boxShadow: '0 2px 12px #b5d0ee33', background: '#f5f6fa', marginBottom: 24 }}>
                  <div className="card-content">
                    <div className="is-flex is-align-items-center mb-2">
                      <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#2563eb', marginRight: 16 }}>
                        {tecnico.nombreSolo[0]?.toUpperCase() || 'T'}
                      </div>
                      <div>
                        <h4 className="is-size-5 has-text-weight-bold" style={{ color: '#1a202c', marginBottom: 2 }}>{tecnico.nombre}</h4>
                        <span className="tag is-info is-light" style={{ fontWeight: 700, color: '#2563eb', borderRadius: 8, fontSize: 14 }}>ID: {tecnico.tecnicoId}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="tag is-success is-light" style={{ fontWeight: 700, color: '#10b981', borderRadius: 8, fontSize: 15, marginRight: 8 }}>
                        Reparaciones: {tecnico.reparacionesExitosas}
                      </span>
                      <span className="tag is-link is-light" style={{ fontWeight: 700, color: '#2563eb', borderRadius: 8, fontSize: 15 }}>
                        Ingresos: S/ {tecnico.totalIngresos.toFixed(2)}
                      </span>
                    </div>
                    <button className="button is-small is-link mt-2" style={{ borderRadius: 8, fontWeight: 700 }} onClick={() => goToTechnicianStats(tecnico.nombre, tecnico)}>
                      Ver detalles personales
                    </button>
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
      </div>
      {/* Chat flotante PrintecGPT para empleados */}
      <PrintecGPTChat />
    </div>
  );
};

export default TechnicianStats;