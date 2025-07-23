import React, { useState, useEffect } from 'react';
import 'bulma/css/bulma.min.css';

// Componente para el cuadre/cierre de caja
const CierreCajaSection = () => {
  const [cierres, setCierres] = useState([]);
  const [pagosNoCuadrados, setPagosNoCuadrados] = useState([]);
  const [loading, setLoading] = useState(false);
  // Eliminados los estados de efectivo y debito manuales
  const [mensaje, setMensaje] = useState('');

  // Estado para mostrar/ocultar historial y paginación
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const cierresPorPagina = 5; // Puedes ajustar la cantidad por página

  // Calcular cierres paginados
  const indiceUltimoCierre = paginaActual * cierresPorPagina;
  const indicePrimerCierre = indiceUltimoCierre - cierresPorPagina;
  const cierresPaginados = cierres.slice(indicePrimerCierre, indiceUltimoCierre);
  const totalPaginas = Math.ceil(cierres.length / cierresPorPagina);

  // Cargar cierres y pagos no cuadrados
  const cargarDatos = () => {
    // Cargar cierres de caja
    fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/cierres-caja')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          console.log('Cierres cargados:', data.data);
          setCierres(data.data || []);
        } else {
          console.error('Error al cargar cierres:', data.message);
        }
      })
      .catch(err => console.error('Error fetching cierres:', err));

    // Cargar pagos no cuadrados
    fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/pagos/no-cuadrados')
      .then(res => res.json())
      .then(data => setPagosNoCuadrados(data.pagos || []))
      .catch(err => console.error('Error fetching pagos:', err));
  };

  // Cargar datos inicialmente
  useEffect(() => {
    cargarDatos();
  }, []);

  // Función para obtener pagos filtrados por tipo
  const getPagosFiltrados = (tipo) => {
    if (tipo === 'efectivo') {
      return pagosNoCuadrados.filter(pago => pago.metodo_pago === 'Efectivo');
    } else if (tipo === 'electronico') {
      return pagosNoCuadrados.filter(pago => 
        ['Yape', 'Plin', 'Transferencia', 'Tarjeta'].includes(pago.metodo_pago)
      );
    }
    return [];
  };

  // Obtener total de pagos por tipo
  const getTotalPagos = (pagos) => {
    return pagos.reduce((total, pago) => total + parseFloat(pago.monto || 0), 0).toFixed(2);
  };

  // Realizar cierre de caja
  const handleCierreCaja = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    try {
      // Buscar el id en cualquier objeto de localStorage
      let tecnico_id = null;
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key);
          const parsed = JSON.parse(value);
          if (
            parsed &&
            typeof parsed.id !== 'undefined' &&
            parsed.id !== null &&
            !isNaN(Number(parsed.id)) &&
            Number(parsed.id) > 0
          ) {
            tecnico_id = Number(parsed.id);
            break;
          }
        } catch (e) {}
      }
      console.log('ID encontrado para cierre de caja:', tecnico_id);
      // Usar solo el total calculado por el sistema
      const bodyToSend = {
        tecnico_id,
        monto_cierre: Number(totalGeneral),
        monto_efectivo: Number(totalEfectivo),
        monto_debito: Number(totalElectronico)
      };
      console.log('Body enviado al backend:', bodyToSend);
      const response = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/cierres-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend)
      });
      const data = await response.json();      
      if (response.ok) {
        setMensaje('Cierre de caja realizado correctamente.');
        cargarDatos();
      } else {
        setMensaje(data.message || 'Error al realizar el cierre de caja.');
      }
    } catch (err) {
      setMensaje('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Variables para pagos filtrados
  const pagosEfectivo = getPagosFiltrados('efectivo');
  const pagosElectronicos = getPagosFiltrados('electronico');
  const totalEfectivo = getTotalPagos(pagosEfectivo);
  const totalElectronico = getTotalPagos(pagosElectronicos);
  const totalGeneral = getTotalPagos(pagosNoCuadrados);

  // Agrupar pagos electrónicos por método
  const pagosPorMetodo = pagosElectronicos.reduce((acc, pago) => {
    if (!acc[pago.metodo_pago]) {
      acc[pago.metodo_pago] = [];
    }
    acc[pago.metodo_pago].push(pago);
    return acc;
  }, {});

  // Estado para el carrusel animado de caja actual
  const [cajaCardIndex, setCajaCardIndex] = useState(0);
  const cajaCards = [
    {
      label: 'Efectivo',
      color: '#065f46',
      bg: '#ecfdf5',
      border: '#6ee7b7',
      value: totalEfectivo,
      valueColor: '#047857',
    },
    {
      label: 'Pagos Electrónicos',
      color: '#1e40af',
      bg: '#eff6ff',
      border: '#93c5fd',
      value: totalElectronico,
      valueColor: '#1d4ed8',
    },
    {
      label: 'Total General',
      color: '#0c4a6e',
      bg: '#f0f9ff',
      border: '#7dd3fc',
      value: totalGeneral,
      valueColor: '#0369a1',
    },
  ];

  // Estado para pausar el carrusel en móvil
  const [carruselPausado, setCarruselPausado] = useState(false);

  // Animación automática del carrusel en móvil (pausable)
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    if (carruselPausado) return;
    const interval = setInterval(() => {
      setCajaCardIndex((prev) => (prev + 1) % cajaCards.length);
    }, 2500); // Cambia cada 2.5 segundos
    return () => clearInterval(interval);
  }, [carruselPausado, cajaCards.length]);

  // Swipe handlers para móvil
  const handleSwipe = (dir) => {
    if (dir === 'left') {
      setCajaCardIndex((prev) => (prev + 1) % cajaCards.length);
    } else if (dir === 'right') {
      setCajaCardIndex((prev) => (prev - 1 + cajaCards.length) % cajaCards.length);
    }
  };

  // Touch events para swipe manual
  const [touchStartX, setTouchStartX] = useState(null);
  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 40) handleSwipe('right');
    else if (diff < -40) handleSwipe('left');
    setTouchStartX(null);
  };

  // Nuevo: estado para el detalle
  const [detalleCierre, setDetalleCierre] = useState(null); 
  const [pagosCierre, setPagosCierre] = useState([]); // Nuevo: pagos del cierre seleccionado
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  // Estado para el modal de detalle de cierre
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);

  // Nuevo: función para cargar el detalle de un cierre
  const verDetalleCierre = async (cierreId) => {
    setLoadingDetalle(true);
    setDetalleCierre(null);
    setPagosCierre([]);
    setModalDetalleVisible(true); // Mostrar modal
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

  // Estado para paginación de pagos incluidos en el cierre
  const [paginaPagos, setPaginaPagos] = useState(1);
  const pagosPorPagina = 3;
  const totalPaginasPagos = Math.ceil(pagosCierre.length / pagosPorPagina);
  const pagosCierrePaginados = pagosCierre.slice((paginaPagos - 1) * pagosPorPagina, paginaPagos * pagosPorPagina);

  // El monto total de cierre es el total general del sistema
  const montoCierreTotal = totalGeneral;

  return (
    <div className="box" style={{ margin: '2em auto', maxWidth: 900, background: '#ffffff', border: '1.5px solid #b6d0f7', borderRadius: 16, color: '#1a3557', boxShadow: '0 2px 8px rgba(91,134,229,0.09)' }}>
      <h2 className="title is-4" style={{ color: '#1a3557', fontWeight: 800 }}>Cierre de Caja</h2>

      {/* Sección de Caja Actual */}
      <div className="box" style={{ background: '#ffffff', marginBottom: 20, border: '1px solid #d1d5db' }}>
        <h3 className="title is-5" style={{ color: '#1a3557', fontWeight: 700, marginBottom: 15 }}>Caja Actual</h3>
        {/* Carrusel animado solo en móvil, fila normal en desktop */}
        <div
          className={window.innerWidth < 768 ? 'caja-carousel-mobile' : 'columns is-mobile is-multiline'}
          style={window.innerWidth < 768 ? { display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 110, overflow: 'hidden' } : { gap: '10px' }}
          onTouchStart={window.innerWidth < 768 ? (e) => { handleTouchStart(e); setCarruselPausado(true); } : undefined}
          onTouchEnd={window.innerWidth < 768 ? (e) => { handleTouchEnd(e); setCarruselPausado(false); } : undefined}
          onMouseDown={window.innerWidth < 768 ? () => setCarruselPausado(true) : undefined}
          onMouseUp={window.innerWidth < 768 ? () => setCarruselPausado(false) : undefined}
          onMouseLeave={window.innerWidth < 768 ? () => setCarruselPausado(false) : undefined}
        >
          {window.innerWidth < 768 ? (
            <div style={{ width: 180, maxWidth: 220, minWidth: 120, margin: '0 auto', transition: 'transform 0.5s cubic-bezier(.4,2,.6,1)', transform: 'translateX(0)' }}>
              <div style={{
                padding: '10px',
                background: cajaCards[cajaCardIndex].bg,
                borderRadius: '8px',
                border: `1px solid ${cajaCards[cajaCardIndex].border}`,
                minWidth: 0,
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(91,134,229,0.07)'
              }}>
                <p style={{ color: cajaCards[cajaCardIndex].color, fontWeight: 'bold', fontSize: '1rem' }}>{cajaCards[cajaCardIndex].label}</p>
                <p style={{ color: cajaCards[cajaCardIndex].valueColor, fontWeight: 'bold', fontSize: '1.2rem', marginTop: '5px' }}>
                  S/. {cajaCards[cajaCardIndex].value}
                </p>
              </div>
              {/* Indicadores de página */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                {cajaCards.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 10, height: 10, borderRadius: '50%', margin: '0 4px',
                      background: i === cajaCardIndex ? '#6366f1' : '#d1d5db',
                      display: 'inline-block', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onClick={() => setCajaCardIndex(i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            cajaCards.map((card, idx) => (
              <div className="column is-4" key={card.label} style={{ flex: '0 0 180px', maxWidth: 180, minWidth: 120 }}>
                <div style={{
                  padding: '10px',
                  background: card.bg,
                  borderRadius: '8px',
                  border: `1px solid ${card.border}`,
                  minWidth: 0,
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(91,134,229,0.07)'
                }}>
                  <p style={{ color: card.color, fontWeight: 'bold', fontSize: '1rem' }}>{card.label}</p>
                  <p style={{ color: card.valueColor, fontWeight: 'bold', fontSize: '1.2rem', marginTop: '5px' }}>
                    S/. {card.value}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formulario de cierre solo con el total */}
      <form onSubmit={handleCierreCaja} className="mb-4">
        <div className="field">
          <label className="label" style={{ color: '#1a3557', fontWeight: 600 }}>Monto total a cuadrar</label>
          <div className="control">
            <input
              className="input"
              type="number"
              value={montoCierreTotal}
              readOnly
              style={{ background: '#f0f9ff', color: '#1a3557', border: '1.5px solid #b6d0f7', fontWeight: 700, fontSize: '1.1rem' }}
            />
          </div>
        </div>
        <button
          className="button is-link"
          type="submit"
          disabled={loading}
          style={{ fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(37,99,235,0.2)', fontSize: '1rem' }}
        >
          {loading ? 'Procesando...' : 'Realizar cierre de caja'}
        </button>
      </form>


      {mensaje && (
        <div className="notification" style={{ 
          color: '#1a3557', 
          background: '#f0f9ff', 
          border: '1.5px solid #7dd3fc',
          fontWeight: 600
        }}>
          {mensaje}
        </div>
      )}

      {/* Historial de cierres (ahora oculto por defecto y paginado) */}
      <div style={{ marginTop: 24 }}>
        <button
          className="button is-info"
          style={{ fontWeight: 700, background: '#1e40af', color: '#fff', border: 'none', marginBottom: 12 }}
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
        >
          {mostrarHistorial ? 'Ocultar historial de cierres' : 'Ver historial de cierres'}
        </button>

        {mostrarHistorial && (
          cierres.length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: '1rem' }}>No hay cierres registrados.</div>
          ) : (
            <>
              {/* Tabla con scroll lateral real y sin restricciones de ancho */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100vw' }}>
                <table className="table is-bordered is-narrow" style={{ background: '#fff', minWidth: 700 }}>
                  <thead style={{ background: '#1a3557' }}>
                    <tr>
                      <th style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.98rem' }}>Monto</th>
                      <th style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.98rem' }}>Efectivo</th>
                      <th style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.98rem' }}>Débito/Electrónico</th>
                      <th style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.98rem' }}>Fecha</th>
                      <th style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.98rem' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierresPaginados.map((cierre, idx) => (
                      <tr key={cierre.id || idx}>
                        <td style={{ color: '#1a3557', fontWeight: 700, fontSize: '1rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>S/. {parseFloat(cierre.monto_total || 0).toFixed(2)}</td>
                        <td style={{ color: '#065f46', fontWeight: 700, fontSize: '1rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>S/. {parseFloat(cierre.total_efectivo || 0).toFixed(2)}</td>
                        <td style={{ color: '#1e40af', fontWeight: 700, fontSize: '1rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>S/. {parseFloat(cierre.total_debito || 0).toFixed(2)}</td>
                        <td style={{ color: '#1a3557', fontSize: '0.97rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>{cierre.createdAt ? new Date(cierre.createdAt).toLocaleString('es-PE') : ''}</td>
                        <td style={{ padding: '6px 12px' }}>
                          <button className="button is-small is-link" onClick={() => verDetalleCierre(cierre.id)}>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Paginación */}
              <nav className="pagination is-centered" role="navigation" aria-label="pagination">
                <button
                  className="pagination-previous button"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  style={{ marginRight: 8 }}
                >Anterior</button>
                <button
                  className="pagination-next button"
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                >Siguiente</button>
                <ul className="pagination-list" style={{ display: 'inline-flex', marginLeft: 16 }}>
                  {Array.from({ length: totalPaginas }, (_, i) => (
                    <li key={i}>
                      <button
                        className={`pagination-link button${paginaActual === i + 1 ? ' is-current' : ''}`}
                        onClick={() => setPaginaActual(i + 1)}
                        style={{ margin: '0 2px', background: paginaActual === i + 1 ? '#1e40af' : '#fff', color: paginaActual === i + 1 ? '#fff' : '#1a3557', border: '1px solid #b6d0f7' }}
                      >{i + 1}</button>
                    </li>
                  ))}
                </ul>
              </nav>
              {/* Detalle de cierre seleccionado */}
              {/* MODAL DETALLE CIERRE */}
              {modalDetalleVisible && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.35)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 14,
                    maxWidth: 420,
                    width: '95vw',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                    padding: 18,
                    position: 'relative',
                    margin: '0 auto',
                    color: '#1a3557',
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
                        color: '#1a3557',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                      aria-label="Cerrar"
                    >×</button>
                    <h4 style={{ color: '#1e40af', fontWeight: 700, marginBottom: 8, fontSize: '1.1rem', textAlign: 'center' }}>Detalle del cierre</h4>
                    {loadingDetalle && <div style={{ color: '#1a3557', marginTop: 12 }}>Cargando detalle...</div>}
                    {detalleCierre && (
                      detalleCierre.error ? (
                        <div style={{ color: 'red' }}>{detalleCierre.error}</div>
                      ) : (
                        <>
                          <div><b>Monto total:</b> S/. {parseFloat(detalleCierre.monto_total).toFixed(2)}</div>
                          <div><b>Efectivo:</b> S/. {parseFloat(detalleCierre.total_efectivo || 0).toFixed(2)}</div>
                          <div><b>Débito/Electrónico:</b> S/. {parseFloat(detalleCierre.total_debito || 0).toFixed(2)}</div>
                          <div><b>Fecha:</b> {detalleCierre.createdAt ? new Date(detalleCierre.createdAt).toLocaleString('es-PE') : ''}</div>
                          <div><b>Técnico:</b> {detalleCierre.Tecnico ? `${detalleCierre.Tecnico.nombre} ${detalleCierre.Tecnico.apellido}` : 'N/A'}</div>
                          <div style={{ marginTop: 10 }}>
                            <b>Pagos incluidos en este cierre:</b>
                            {pagosCierre.length === 0 ? (
                              <div style={{ color: '#4b5563' }}>No hay pagos asociados a este cierre.</div>
                            ) : (
                              <table className="table is-fullwidth is-bordered is-narrow" style={{ background: '#f0f9ff', marginTop: 8 }}>
                                <thead style={{ background: '#1e40af' }}>
                                  <tr>
                                    <th style={{ color: '#fff', fontWeight: 700 }}>Monto</th>
                                    <th style={{ color: '#fff', fontWeight: 700 }}>Método</th>
                                    <th style={{ color: '#fff', fontWeight: 700 }}>Fecha</th>
                                    <th style={{ color: '#fff', fontWeight: 700 }}>Cliente</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagosCierre.map((pago, i) => (
                                    <tr key={pago.id || i}>
                                      <td style={{ color: '#1a3557', fontWeight: 700 }}>S/. {parseFloat(pago.monto).toFixed(2)}</td>
                                      <td style={{ color: '#1e40af' }}>{pago.metodo_pago}</td>
                                      <td style={{ color: '#1a3557' }}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString('es-PE') : ''}</td>
                                      <td style={{ color: '#1a3557' }}>{pago.orden && pago.orden.dispositivo && pago.orden.dispositivo.cliente ? `${pago.orden.dispositivo.cliente.nombre} ${pago.orden.dispositivo.cliente.apellido}` : 'N/A'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      )
                    )}
                  </div>
                </div>
              )}
              {/* Fin modal detalle */}
            </>
          )
        )}
      </div>

      {/* Sección de pagos no cuadrados */}
      <h3 className="title is-5" style={{ 
        marginTop: 24, 
        color: '#1a3557', 
        fontWeight: 700 
      }}>Pagos Pendientes de Cuadre</h3>
      
      {pagosNoCuadrados.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: '1rem' }}>No hay pagos pendientes de cuadre.</div>
      ) : (
        <>
          {/* Tabla de pagos en efectivo */}
          {pagosEfectivo.length > 0 && (
            <div className="mb-5">
              <h4 className="title is-6 mb-2" style={{ color: '#065f46' }}>Pagos en Efectivo</h4>
              <table className="table is-fullwidth is-bordered is-narrow" style={{ background: '#fff' }}>
                <thead style={{ background: '#065f46' }}>
                  <tr>
                    <th style={{ color: '#fff', fontWeight: 700 }}>Monto</th>
                    <th style={{ color: '#fff', fontWeight: 700 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosEfectivo.map((pago, idx) => (
                    <tr key={`efectivo-${pago.id || idx}`}>
                      <td style={{ color: '#1a3557' }}>S/. {parseFloat(pago.monto).toFixed(2)}</td>
                      <td style={{ color: '#1a3557' }}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString('es-PE') : ''}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#ecfdf5' }}>
                    <td style={{ color: '#065f46', fontWeight: 700 }}>S/. {totalEfectivo}</td>
                    <td style={{ color: '#065f46', fontWeight: 700 }}>Total Efectivo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tablas de pagos electrónicos por método */}
          {Object.entries(pagosPorMetodo).map(([metodo, pagos]) => (
            <div key={metodo} className="mb-5">
              <h4 className="title is-6 mb-2" style={{ color: '#1e40af' }}>Pagos with {metodo}</h4>
              <table className="table is-fullwidth is-bordered is-narrow" style={{ background: '#fff' }}>
                <thead style={{ background: '#1e40af' }}>
                  <tr>
                    <th style={{ color: '#fff', fontWeight: 700 }}>Monto</th>
                    <th style={{ color: '#fff', fontWeight: 700 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago, idx) => (
                    <tr key={`${metodo}-${pago.id || idx}`}>
                      <td style={{ color: '#1a3557' }}>S/. {parseFloat(pago.monto).toFixed(2)}</td>
                      <td style={{ color: '#1a3557' }}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString('es-PE') : ''}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#eff6ff' }}>
                    <td style={{ color: '#1e40af', fontWeight: 700 }}>S/. {getTotalPagos(pagos)}</td>
                    <td style={{ color: '#1e40af', fontWeight: 700 }}>Total {metodo}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default CierreCajaSection;
