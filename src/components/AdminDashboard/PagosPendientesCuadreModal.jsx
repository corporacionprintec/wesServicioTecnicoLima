import React, { useEffect, useState } from 'react';

const PagosPendientesCuadreModal = ({ visible, onClose }) => {
  // Estados de paginación
  const [paginaEfectivo, setPaginaEfectivo] = useState(1);
  const [paginaElectronico, setPaginaElectronico] = useState({});
  const pagosPorPagina = 5;
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [mensajeCierre, setMensajeCierre] = useState('');
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [pagosEfectivo, setPagosEfectivo] = useState([]);
  const [pagosElectronicos, setPagosElectronicos] = useState([]);
  const [pagosPorMetodo, setPagosPorMetodo] = useState({});
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalElectronico, setTotalElectronico] = useState(0);

  useEffect(() => {
    if (visible) {
      setLoadingPendientes(true);
      setPaginaEfectivo(1);
      setPaginaElectronico({});
      fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/pagos/no-cuadrados')
        .then(res => res.json())
        .then(data => {
          let pagos = [];
          if (data.status === 'success' && Array.isArray(data.data)) {
            // Si la API no trae pagos, intentar usar la propiedad 'pagos' como en pagos/no-cuadrados
            pagos = data.data.length > 0 ? data.data : (data.pagos || []);
          } else if (Array.isArray(data.pagos)) {
            pagos = data.pagos;
          }
          if (pagos.length > 0) {
            setPagosPendientes(pagos);
            setTotalPendiente(pagos.reduce((acc, pago) => acc + (parseFloat(pago.monto) || 0), 0));
            // Agrupar pagos
            const efectivo = pagos.filter(p => p.metodo_pago === 'Efectivo');
            const electronicos = pagos.filter(p => ['Yape', 'Plin', 'Transferencia', 'Tarjeta'].includes(p.metodo_pago));
            setPagosEfectivo(efectivo);
            setPagosElectronicos(electronicos);
            setTotalEfectivo(efectivo.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0));
            setTotalElectronico(electronicos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0));
            // Agrupar electrónicos por método
            const agrupados = {};
            electronicos.forEach(p => {
              if (!agrupados[p.metodo_pago]) agrupados[p.metodo_pago] = [];
              agrupados[p.metodo_pago].push(p);
            });
            setPagosPorMetodo(agrupados);
          } else {
            setPagosPendientes([]);
            setTotalPendiente(0);
            setPagosEfectivo([]);
            setPagosElectronicos([]);
            setPagosPorMetodo({});
            setTotalEfectivo(0);
            setTotalElectronico(0);
          }
        })
        .catch(() => {
          setPagosPendientes([]);
          setTotalPendiente(0);
          setPagosEfectivo([]);
          setPagosElectronicos([]);
          setPagosPorMetodo({});
          setTotalEfectivo(0);
          setTotalElectronico(0);
        })
        .finally(() => setLoadingPendientes(false));
    }
  }, [visible]);

  if (!visible) return null;

  // Helpers para paginación
  const pagosEfectivoPaginados = pagosEfectivo.slice((paginaEfectivo - 1) * pagosPorPagina, paginaEfectivo * pagosPorPagina);
  const totalPaginasEfectivo = Math.ceil(pagosEfectivo.length / pagosPorPagina);
  const pagosElectronicosPaginados = {};
  const totalPaginasElectronico = {};
  Object.entries(pagosPorMetodo).forEach(([metodo, pagos]) => {
    pagosElectronicosPaginados[metodo] = pagos.slice((paginaElectronico[metodo] ? paginaElectronico[metodo] - 1 : 0) * pagosPorPagina, (paginaElectronico[metodo] ? paginaElectronico[metodo] : 1) * pagosPorPagina);
    totalPaginasElectronico[metodo] = Math.ceil(pagos.length / pagosPorPagina);
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(34, 197, 94, 0.18)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#23263a',
        borderRadius: 18,
        padding: '32px 24px',
        boxShadow: '0 2px 18px #22c55e',
        minWidth: 320,
        maxWidth: 420,
        position: 'relative',
        color: '#fff',
        border: '2px solid #22c55e',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 22,
            color: '#22c55e',
            cursor: 'pointer',
            fontWeight: 700
          }}
          aria-label="Cerrar"
        >×</button>
        <h4 style={{ color: '#22c55e', fontWeight: 900, marginBottom: 12, fontSize: '1.18rem', textAlign: 'center', letterSpacing: 1, textShadow: '0 2px 8px #22c55e' }}>Pagos pendientes de cuadre</h4>
        {loadingPendientes ? (
          <div style={{ color: '#A5B4FC', marginTop: 12 }}>Cargando pagos pendientes...</div>
        ) : pagosPendientes.length === 0 ? (
          <div style={{ color: '#A5B4FC', marginTop: 6 }}>No hay pagos pendientes de cuadre.</div>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>Total pendiente: S/ {totalPendiente.toFixed(2)}</div>
            {/* Pagos en efectivo */}
            {pagosEfectivo.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h5 style={{ color: '#65cfa0', fontWeight: 700, marginBottom: 6 }}>Pagos en Efectivo</h5>
                <table style={{ background: '#181a2a', width: '100%', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px #22c55e' }}>
                  <thead style={{ background: '#22c55e' }}>
                    <tr>
                      <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Monto</th>
                      <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosEfectivoPaginados.map((pago, idx) => (
                      <tr key={idx} style={{ background: (idx % 2 === 0 ? '#23263a' : '#232946') }}>
                        <td style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>S/. {parseFloat(pago.monto || 0).toFixed(2)}</td>
                        <td style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-PE') : (pago.createdAt ? new Date(pago.createdAt).toLocaleDateString('es-PE') : '-')}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#ecfdf5' }}>
                      <td style={{ color: '#22c55e', fontWeight: 900 }}>S/. {totalEfectivo.toFixed(2)}</td>
                      <td style={{ color: '#22c55e', fontWeight: 900 }}>Total Efectivo</td>
                    </tr>
                  </tbody>
                </table>
                {/* Paginación efectivo */}
                {totalPaginasEfectivo > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <button
                      className="button is-small"
                      onClick={() => setPaginaEfectivo(p => Math.max(1, p - 1))}
                      disabled={paginaEfectivo === 1}
                      style={{ marginRight: 6 }}
                    >Anterior</button>
                    <span style={{ color: '#22c55e', fontWeight: 700, margin: '0 8px' }}>{paginaEfectivo} / {totalPaginasEfectivo}</span>
                    <button
                      className="button is-small"
                      onClick={() => setPaginaEfectivo(p => Math.min(totalPaginasEfectivo, p + 1))}
                      disabled={paginaEfectivo === totalPaginasEfectivo}
                    >Siguiente</button>
                  </div>
                )}
              </div>
            )}
            {/* Pagos electrónicos agrupados por método */}
            {Object.entries(pagosPorMetodo).map(([metodo, pagos]) => (
              <div key={metodo} style={{ marginBottom: 18 }}>
                <h5 style={{ color: '#0ea5e9', fontWeight: 700, marginBottom: 6 }}>Pagos {metodo}</h5>
                <table style={{ background: '#181a2a', width: '100%', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px #22c55e' }}>
                  <thead style={{ background: '#0ea5e9' }}>
                    <tr>
                      <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Monto</th>
                      <th style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosElectronicosPaginados[metodo].map((pago, idx) => (
                      <tr key={idx} style={{ background: (idx % 2 === 0 ? '#23263a' : '#232946') }}>
                        <td style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>S/. {parseFloat(pago.monto || 0).toFixed(2)}</td>
                        <td style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 13, padding: '6px 8px' }}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-PE') : (pago.createdAt ? new Date(pago.createdAt).toLocaleDateString('es-PE') : '-')}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#eff6ff' }}>
                      <td style={{ color: '#0ea5e9', fontWeight: 900 }}>S/. {pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0).toFixed(2)}</td>
                      <td style={{ color: '#0ea5e9', fontWeight: 900 }}>Total {metodo}</td>
                    </tr>
                  </tbody>
                </table>
                {/* Paginación electrónicos */}
                {totalPaginasElectronico[metodo] > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <button
                      className="button is-small"
                      onClick={() => setPaginaElectronico(p => ({ ...p, [metodo]: Math.max(1, (p[metodo] || 1) - 1) }))}
                      disabled={(paginaElectronico[metodo] || 1) === 1}
                      style={{ marginRight: 6 }}
                    >Anterior</button>
                    <span style={{ color: '#0ea5e9', fontWeight: 700, margin: '0 8px' }}>{paginaElectronico[metodo] || 1} / {totalPaginasElectronico[metodo]}</span>
                    <button
                      className="button is-small"
                      onClick={() => setPaginaElectronico(p => ({ ...p, [metodo]: Math.min(totalPaginasElectronico[metodo], (p[metodo] || 1) + 1) }))}
                      disabled={(paginaElectronico[metodo] || 1) === totalPaginasElectronico[metodo]}
                    >Siguiente</button>
                  </div>
                )}
              </div>
            ))}
            {/* Monto total a cuadrar y botón de cierre de caja */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoadingCierre(true);
                setMensajeCierre('');
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
                  // Body igual que en flujo de caja
                  const bodyToSend = {
                    tecnico_id,
                    monto_cierre: Number(totalPendiente),
                    monto_efectivo: Number(totalEfectivo),
                    monto_debito: Number(totalElectronico)
                  };
                  const response = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/cierres-caja', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyToSend)
                  });
                  const data = await response.json();
                  if (response.ok) {
                    setMensajeCierre('Cierre de caja realizado correctamente.');
                  } else {
                    setMensajeCierre(data.message || 'Error al realizar el cierre de caja.');
                  }
                } catch (err) {
                  setMensajeCierre('Error de conexión.');
                } finally {
                  setLoadingCierre(false);
                }
              }}
              style={{ marginTop: 18 }}
            >
              <div style={{ marginBottom: 10 }}>
                <label style={{ color: '#22c55e', fontWeight: 700, marginBottom: 4, display: 'block' }}>Monto total a cuadrar</label>
                <input
                  className="input"
                  type="number"
                  value={totalPendiente.toFixed(2)}
                  readOnly
                  style={{ background: '#f0f9ff', color: '#22c55e', border: '1.5px solid #b6d0f7', fontWeight: 700, fontSize: '1.1rem', width: '100%' }}
                />
              </div>
              <button
                className="button is-link"
                type="submit"
                disabled={loadingCierre}
                style={{ fontWeight: 700, background: '#22c55e', color: '#fff', border: 'none', boxShadow: '0 2px 8px #22c55e', fontSize: '1rem', width: '100%' }}
              >
                {loadingCierre ? 'Procesando...' : 'Realizar cierre de caja'}
              </button>
              {mensajeCierre && (
                <div style={{ color: '#22c55e', background: '#f0f9ff', border: '1.5px solid #7dd3fc', fontWeight: 600, marginTop: 10, borderRadius: 8, padding: 8 }}>
                  {mensajeCierre}
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PagosPendientesCuadreModal;
