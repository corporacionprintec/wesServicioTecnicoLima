import React, { useState, useEffect } from 'react';
import '../cssGeneral/estadisticasPersonal.css';

import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EstadisticasPersonal() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [technicianData, setTechnicianData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  
  // Añadir estados para el gráfico
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartData, setChartData] = useState([]);
  // Añadir estado para la paginación del gráfico
  const [chartPage, setChartPage] = useState(1);
  const itemsPerChartPage = 6;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', text: '' });
  // Estado para mostrar/ocultar historial de caja
  const [showCaja, setShowCaja] = useState(false);
  
  // Detectar si es móvil
  const isMobile = window.innerWidth < 768;
  
  const [pagos, setPagos] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let tecnicoIdSeleccionado = sessionStorage.getItem('selectedTechnicianId') || id || currentUser?.id;
        let nombre = sessionStorage.getItem('selectedTechnicianName') || currentUser?.name || '';
        let apellido = sessionStorage.getItem('selectedTechnicianLastname') || currentUser?.lastname || '';

        // Obtener pagos realizados (por fecha_pago) para este técnico
        const pagosResponse = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/pagos?page=1&limit=10000');
        const pagosData = await pagosResponse.json();
        let pagosFiltrados = [];
        if (pagosData && pagosData.pagos) {
          pagosFiltrados = pagosData.pagos.filter(pago => {
            if (!pago.fecha_pago) return false;
            if (!pago.orden || !pago.orden.dispositivo) return false;
            const idTec = pago.orden.dispositivo.tecnico_id || pago.orden.tecnico_id;
            return String(idTec) === String(tecnicoIdSeleccionado);
          });
        }
        const ingresosTotales = pagosFiltrados.reduce((acc, pago) => acc + parseFloat(pago.monto || 0), 0);
        const detallesReparaciones = pagosFiltrados.map(pago => ({
          id: pago.orden_id || pago.orden?.id || pago.id,
          problema: pago.orden?.problema_descrito || 'Sin especificar',
          diagnostico: pago.orden?.dispositivo?.diagnostico || 'Sin diagnóstico',
          costo: parseFloat(pago.monto || 0).toFixed(2),
          fecha_pago: pago.fecha_pago
        }));

        setTechnicianData({
          id: tecnicoIdSeleccionado,
          nombre,
          apellido,
          especialidad: `${nombre} ${apellido}`,
          stats: {
            totalReparaciones: detallesReparaciones.length,
            reparacionesExitosas: detallesReparaciones.length, // Asumimos que si hay pago, fue exitosa
            reparacionesFallidas: 0,
            reparacionesPendientes: 0,
            tiempoPromedioReparacion: 'Variable',
            reparacionesDiarias: [],
            tiposReparacion: [],
            ultimasReparaciones: [],
            ingresosTotales,
            calificacionPromedio: 4.8,
            detallesReparaciones
          }
        });
      } catch (error) {
        console.error('Error al obtener datos:', error);
        setTechnicianData({
          id: id || currentUser?.id || '001',
          nombre: currentUser?.name || 'Técnico',
          apellido: currentUser?.lastname || '',
          especialidad: `${currentUser?.name || ''} ${currentUser?.lastname || ''}`,
          stats: {
            totalReparaciones: 0,
            reparacionesExitosas: 0,
            reparacionesFallidas: 0,
            reparacionesPendientes: 0,
            tiempoPromedioReparacion: 'N/A',
            reparacionesDiarias: [],
            tiposReparacion: [],
            ultimasReparaciones: [],
            ingresosTotales: 0,
            calificacionPromedio: 0,
            detallesReparaciones: []
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      sessionStorage.removeItem('technicianStats');
    };
  }, [id, currentUser, startDate, endDate]);

  const handleGoBack = () => {
    sessionStorage.removeItem('selectedTechnician');
    sessionStorage.removeItem('technicianStats');
    sessionStorage.removeItem('selectedTechnicianId');
    sessionStorage.removeItem('selectedTechnicianName');
    sessionStorage.removeItem('selectedTechnicianLastname');
    navigate('/employee-dashboard');
  };

  const renderStatusBadge = (status) => {
    let className = "tag ";
    let text = status;
    
    switch (status) {
      case 'pendiente':
        className += "is-warning";
        text = "Pendiente";
        break;
      case 'en_proceso':
        className += "is-info";
        text = "En Proceso";
        break;
      case 'completado':
      case 'entregado':
        className += "is-success";
        text = "Completado";
        break;
      case 'cancelado':
        className += "is-danger";
        text = "Cancelado";
        break;
      default:
        className += "is-light";
        break;
    }
    
    return <span className={className}>{text}</span>;
  };

  const openModal = (title, text) => {
    setModalContent({ title, text });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  if (loading) {
    return (
      <div className="container py-5 has-text-centered">
        <div className="is-flex is-flex-direction-column is-align-items-center is-justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="loader is-loading" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-4 is-size-5 has-text-primary">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-personal-container">
      <div className="container py-4 px-0 px-4" style={{ maxWidth: '100%', minHeight: '100vh', background: '#181A20', color: '#F3F4F6', overflowX: 'hidden' }}>
        <div className="mb-4" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {/* Botón para volver al panel de técnicos debajo de Exportar Contactos */}
        </div>
        <div className="is-flex is-justify-content-start" style={{ marginTop: 0, marginBottom: 24 }}>
          <button
            type="button"
            className="button is-link"
            style={{ borderRadius: 12, fontWeight: 700, background: '#23263A', color: '#A5B4FC', border: '2px solid #6366f1', marginTop: 0 }}
            onClick={() => navigate('/employee-dashboard', { replace: true })}
          >
            ⬅️ Volver al Panel de Técnicos
          </button>
        </div>

        <div className="card mb-4 is-shadowless" style={{ borderRadius: 18, background: '#23263A', boxShadow: '0 4px 24px rgba(80, 112, 255, 0.10)' }}>
          <div className="card-content">
            <div className="columns is-vcentered is-mobile">
              <div className="column is-12-mobile is-6-tablet">
                <div className="is-flex is-align-items-center mb-2">
                  <button 
                    type="button"
                    className="button is-outlined is-primary mr-3" 
                    onClick={() => {
                      sessionStorage.removeItem('selectedTechnician');
                      sessionStorage.removeItem('technicianStats');
                      sessionStorage.removeItem('selectedTechnicianId');
                      sessionStorage.removeItem('selectedTechnicianName');
                      sessionStorage.removeItem('selectedTechnicianLastname');
                      navigate('/employee-dashboard', { replace: true });
                    }}
                    style={{ borderRadius: 12, fontWeight: 700, background: '#23263A', color: '#F3F4F6', border: '2px solid #6366f1' }}
                  >
                    ⬅️ Volver
                  </button>
                  <div>
                    <h4 className="is-size-4 mb-1 has-text-weight-bold" style={{ color: '#F3F4F6', fontSize: 26 }}>
                      {sessionStorage.getItem('selectedTechnician') 
                        ? <span>🧑‍🔧 Estadísticas de {technicianData?.nombre || ''} {technicianData?.apellido || ''}</span>
                        : <span>🧑‍🔧 Mis Estadísticas</span>}
                    </h4>
                    <p className="mb-0" style={{ fontSize: 15, color: '#A1A1AA' }}>
                      {sessionStorage.getItem('selectedTechnician')
                        ? 'Vista detallada del rendimiento del técnico'
                        : 'Vista detallada de tu rendimiento y métricas'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="column is-12-mobile is-6-tablet has-text-right-tablet mt-3 mt-0-tablet">
                <span className="tag is-primary is-medium mr-2 p-2" style={{ borderRadius: 10, fontSize: 16, background: '#23263A', color: '#A5B4FC', fontWeight: 700, border: '1.5px solid #6366f1' }}>
                  👤 ID: {technicianData?.id || ''}
                </span>
                <span className="tag is-success is-medium p-2" style={{ borderRadius: 10, fontSize: 16, background: '#23263A', color: '#6EE7B7', fontWeight: 700, border: '1.5px solid #22c55e' }}>
                  ⭐ {technicianData?.stats?.calificacionPromedio || 4.5}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="columns mb-4 mx-0 mx-3">
          <div className="column is-12 px-0 px-3-tablet">
            <div className="card has-shadow" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #23263A 0%, #181A20 100%)', boxShadow: '0 4px 24px rgba(80, 112, 255, 0.10)' }}>
              <div className="card-content py-3 py-4-tablet">
                <div className="columns is-vcentered is-mobile">
                  <div className="column is-3-mobile is-2-tablet has-text-centered mb-3 mb-0-tablet">
                    <div 
                      className="is-rounded has-background-white is-flex is-align-items-center is-justify-content-center mx-auto has-shadow"
                      style={{ width: 70, height: 70, borderRadius: '50%', background: '#23263A', boxShadow: '0 2px 8px #6366f1' }}
                    >
                      🛠️
                    </div>
                  </div>
                  <div className="column is-9-mobile is-10-tablet has-text-centered has-text-left-tablet">
                    <h1 className="title is-2 has-text-white has-text-weight-bold" style={{ fontSize: 32, color: '#F3F4F6' }}>{technicianData.nombre} {technicianData.apellido}</h1>
                    <p className="mb-2 is-size-5" style={{ fontWeight: 500, color: '#A1A1AA' }}>{technicianData.especialidad}</p>
                    <span className="tag is-light has-text-primary has-text-weight-bold px-3 py-2" style={{ borderRadius: 10, fontSize: 15, background: '#23263A', color: '#A5B4FC', border: '1.5px solid #6366f1' }}>
                      ID: {technicianData.id}
                    </span>
                    {/* Botón solo si hay datos de técnico */}
                    {technicianData && (
                      <div className="mt-3">
                        <button
                          className="button is-info"
                          style={{ borderRadius: 12, fontWeight: 700, background: '#23263A', color: '#A5B4FC', border: '2px solid #6366f1' }}
                          onClick={() => setShowCaja(prev => !prev)}
                        >
                          {showCaja ? 'Ocultar Caja' : 'Caja'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="columns is-multiline mb-4 mx-0 mx-3">
          <div className="column is-12 px-0 px-3-tablet">
            <div className="card has-shadow" style={{ borderRadius: '14px', borderLeft: '5px solid #22c55e', background: '#23263A', boxShadow: '0 2px 8px #22c55e33' }}>
              <div className="card-content has-text-centered py-4">
                <span style={{ fontSize: 38, marginBottom: 8, display: 'inline-block' }}>✅</span>
                <h2 className="title is-1 has-text-success has-text-weight-bold" style={{ fontSize: 38, color: '#6EE7B7' }}>{technicianData.stats.reparacionesExitosas}</h2>
                <p className="mb-0 is-size-5" style={{ fontWeight: 500, color: '#A1A1AA' }}>Reparaciones Exitosas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de caja solo si showCaja está activo */}
        {showCaja && (
          <div className="columns is-multiline mb-4 is-flex is-justify-content-center mx-0 mx-3">
            <div className="column is-12-mobile is-10-tablet px-0 px-3-tablet">
              <div className="card has-shadow" style={{ borderRadius: '14px', boxShadow: '0 2px 8px #2563eb33', background: '#23263A' }}>
                <header className="card-header has-background-primary has-text-white py-3" style={{ borderRadius: '14px 14px 0 0', background: 'linear-gradient(90deg, #23263A 0%, #181A20 100%)' }}>
                  <p className="card-header-title has-text-white is-flex is-align-items-center is-justify-content-center" style={{ fontSize: 20, fontWeight: 700, color: '#F3F4F6' }}>
                    💰 Historial de Caja
                  </p>
                </header>
                <div className="card-content p-2 p-4-tablet">
                  <div className="has-text-centered mb-4 p-3" style={{ borderRadius: '8px', background: '#181A20' }}>
                    {!isMobile && (
                      <h2 className="title is-2 has-text-success has-text-weight-bold" style={{ fontSize: 32, color: '#6EE7B7' }}>
                        ${technicianData.stats.ingresosTotales ? technicianData.stats.ingresosTotales.toFixed(2) : '0.00'}
                      </h2>
                    )}
                  </div>
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    {/* Modal para mostrar texto completo */}
                    {modalOpen && (
                      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(24,26,32,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#23263A', color: '#F3F4F6', borderRadius: 16, maxWidth: 400, width: '90vw', padding: 24, boxShadow: '0 8px 32px #0008', position: 'relative' }}>
                          <button onClick={closeModal} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#A1A1AA', fontSize: 22, cursor: 'pointer' }}>✖</button>
                          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{modalContent.title}</h3>
                          <div style={{ whiteSpace: 'pre-line', fontSize: 16 }}>{modalContent.text}</div>
                        </div>
                      </div>
                    )}
                    <table className="table is-fullwidth is-hoverable is-striped" style={{ fontSize: 15, borderRadius: 8, background: '#181A20', color: '#F3F4F6' }}>
                      <thead style={{ background: '#23263A' }}>
                        <tr>
                          <th style={{ color: '#F3F4F6', background: '#23263A', border: 'none' }}>Problema</th>
                          <th style={{ color: '#F3F4F6', background: '#23263A', border: 'none' }}>Diagnóstico</th>
                          <th className="has-text-right" style={{ color: '#F3F4F6', background: '#23263A', border: 'none' }}>Costo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicianData.stats.detallesReparaciones && technicianData.stats.detallesReparaciones.length > 0 ? (
                          technicianData.stats.detallesReparaciones
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((detalle, index) => (
                              <tr key={index} style={{ background: index % 2 === 0 ? '#23263A' : '#181A20' }}>
                                <td className="has-text-weight-bold has-text-grey" style={{ fontWeight: 600, color: '#F3F4F6', maxWidth: 180 }}>
                                  {detalle.problema && detalle.problema.length > 80 ? (
                                    <>
                                      {detalle.problema.slice(0, 80)}...{' '}
                                      <button onClick={() => openModal('Problema', detalle.problema)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}>Ver más</button>
                                    </>
                                  ) : (
                                    detalle.problema
                                  )}
                                </td>
                                <td style={{ color: '#F3F4F6', maxWidth: 180 }}>
                                  {detalle.diagnostico && detalle.diagnostico.length > 80 ? (
                                    <>
                                      {detalle.diagnostico.slice(0, 80)}...{' '}
                                      <button onClick={() => openModal('Diagnóstico', detalle.diagnostico)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}>Ver más</button>
                                    </>
                                  ) : (
                                    detalle.diagnostico
                                  )}
                                </td>
                                <td className="has-text-right has-text-weight-bold has-text-success" style={{ color: '#6EE7B7' }}>${detalle.costo}</td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="has-text-centered py-4" style={{ color: '#A1A1AA' }}>
                              <div className="is-flex is-flex-direction-column is-align-items-center">
                                📋
                                <span>No hay reparaciones registradas</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {technicianData.stats.detallesReparaciones && technicianData.stats.detallesReparaciones.length > itemsPerPage && (
                    <div className="is-flex is-justify-content-center mt-4">
                      <nav className="pagination" role="navigation" aria-label="pagination">
                        <a 
                          className={`pagination-previous ${currentPage === 1 ? 'is-disabled' : ''}`}
                          onClick={() => currentPage > 1 && setCurrentPage(prev => Math.max(prev - 1, 1))}
                          style={{ background: '#23263A', color: '#A5B4FC', border: '1.5px solid #6366f1', borderRadius: 8 }}
                        >
                          Anterior
                        </a>
                        <a 
                          className={`pagination-next ${currentPage === Math.ceil(technicianData.stats.detallesReparaciones.length / itemsPerPage) ? 'is-disabled' : ''}`}
                          onClick={() => currentPage < Math.ceil(technicianData.stats.detallesReparaciones.length / itemsPerPage) && setCurrentPage(prev => 
                            Math.min(prev + 1, Math.ceil(technicianData.stats.detallesReparaciones.length / itemsPerPage))
                          )}
                          style={{ background: '#23263A', color: '#A5B4FC', border: '1.5px solid #6366f1', borderRadius: 8 }}
                        >
                          Siguiente
                        </a>
                        <ul className="pagination-list">
                          {[...Array(Math.ceil(technicianData.stats.detallesReparaciones.length / itemsPerPage))].map((_, i) => (
                            <li key={i + 1}>
                              <a 
                                className={`pagination-link ${i + 1 === currentPage ? 'is-current' : ''}`}
                                onClick={() => setCurrentPage(i + 1)}
                                style={{ background: i + 1 === currentPage ? '#6366f1' : '#23263A', color: '#F3F4F6', border: 'none', borderRadius: 8 }}
                              >
                                {i + 1}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EstadisticasPersonal;