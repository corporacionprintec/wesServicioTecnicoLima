import React, { useState } from 'react';

const GastoFloatingButton = ({ onOpen }) => (
  <button
    className="button is-primary is-rounded"
    style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 1000,
      width: 36,
      height: 36,
      minWidth: 0,
      minHeight: 0,
      padding: 0,
      borderRadius: '50%',
      fontSize: 18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
    }}
    onClick={onOpen}
    title="Registrar gasto"
  >
    <span role="img" aria-label="gasto" style={{ fontSize: 20, lineHeight: 1 }}>
      💸
    </span>
  </button>
);

const GastoFormModal = ({ show, onClose, onSubmit }) => {
  // Obtener ID técnico logeado desde currentUser en localStorage
  function getResponsableId() {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      if (user && user.id) return user.id;
    } catch (e) {}
    return '';
  }
  // Fecha actual Perú (YYYY-MM-DD)
  const getPeruDate = () => {
    const date = new Date();
    // Ajustar a zona horaria Perú (UTC-5)
    const peruOffset = -5 * 60;
    const localOffset = date.getTimezoneOffset();
    const peruDate = new Date(date.getTime() + (peruOffset - localOffset) * 60000);
    return peruDate.toISOString().slice(0, 10);
  };
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  // No usar useState para responsable, siempre obtener el valor actual de localStorage al enviar
  const [fecha] = useState(getPeruDate());
  const [tipo, setTipo] = useState('taller');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Obtener responsable dinámicamente de localStorage (currentUser)
    const responsable = getResponsableId();
    if (!responsable || responsable === '') {
      setError('No se encontró el ID del técnico logeado. Vuelva a iniciar sesión.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, cantidad, responsable, fecha, tipo })
      });
      if (!res.ok) throw new Error('Error al crear gasto');
      onSubmit();
      onClose();
    } catch (err) {
      setError('Error al crear gasto');
    } finally {
      setLoading(false);
    }
  };

  // Colores del sistema (verde más suave)
  const verdeLima = '#43c97f'; // menos fluorescente
  const verdeClaro = '#e6f7ee'; // verde pastel suave
  const grisClaro = '#f6fff9';
  const grisBorde = '#43c97f';
  const textoInput = '#1e293b';

  return (
    <div
      className="modal is-active"
      style={{ zIndex: 1100, background: 'rgba(67,201,127,0.08)', transition: 'background 0.4s' }}
    >
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card" style={{ minWidth: 340, maxWidth: '90vw', background: verdeClaro, border: `2px solid ${verdeLima}`, boxShadow: '0 4px 16px #43c97f44', borderRadius: 18, overflow: 'hidden', transition: 'box-shadow 0.3s' }}>
        <header className="modal-card-head" style={{ background: verdeLima, color: '#fff', borderBottom: `2px solid ${grisBorde}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', boxShadow: '0 2px 8px #43c97f22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span role="img" aria-label="gasto" style={{ fontSize: 28, marginRight: 4, filter: 'drop-shadow(0 2px 4px #23263A88)' }}>💸</span>
            <p className="modal-card-title" style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>Nuevo Gasto</p>
          </div>
          <button className="delete" aria-label="close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#fff', cursor: 'pointer', transition: 'color 0.2s' }}></button>
        </header>
        <section className="modal-card-body" style={{ background: grisClaro, position: 'relative', minHeight: 220, padding: '24px 18px', transition: 'background 0.3s' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(67,201,127,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center' }}>
                <span className="loader is-loading" style={{
                  display: 'inline-block',
                  width: 48,
                  height: 48,
                  border: '5px solid #43c97f',
                  borderTop: '5px solid #e6f7ee',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: 12,
                  boxShadow: '0 2px 8px #43c97f33'
                }}></span>
                <div style={{ color: verdeLima, fontWeight: 700, fontSize: 18 }}>Guardando gasto...</div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} style={loading ? { pointerEvents: 'none', opacity: 0.5 } : { transition: 'opacity 0.3s' }}>
            <input type="hidden" name="fecha" value={fecha} />
            <div className="field">
              <label className="label" style={{ color: verdeLima, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Descripción</label>
              <div className="control">
                <textarea
                  className="textarea"
                  required
                  placeholder="Descripción detallada del gasto"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  style={{ background: verdeClaro, borderColor: verdeLima, color: textoInput, fontWeight: 600, minHeight: 70, borderRadius: 10, boxShadow: '0 2px 8px #43c97f22', transition: 'box-shadow 0.2s' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="label" style={{ color: verdeLima, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Precio</label>
              <div className="control">
                <input className="input" required type="number" min="0" step="0.01" placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} style={{ background: verdeClaro, borderColor: verdeLima, color: textoInput, fontWeight: 600, borderRadius: 10, boxShadow: '0 2px 8px #43c97f22', transition: 'box-shadow 0.2s' }} />
              </div>
            </div>
            <div className="field">
              <label className="label" style={{ color: verdeLima, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Tipo</label>
              <div className="control">
                <select className="input" required value={tipo} onChange={e => setTipo(e.target.value)} style={{ background: verdeClaro, borderColor: verdeLima, color: textoInput, fontWeight: 600, borderRadius: 10, boxShadow: '0 2px 8px #43c97f22', transition: 'box-shadow 0.2s' }}>
                  <option value="taller">Taller 🛠️</option>
                  <option value="tienda">Tienda 🏪</option>
                </select>
              </div>
            </div>
            {error && <div className="notification is-danger is-light" style={{ marginTop: 10 }}>{error}</div>}
            <button
              className={`button is-primary is-fullwidth has-text-weight-bold${loading ? ' is-loading' : ''}`}
              type="submit"
              disabled={loading}
              style={{ marginTop: 18, background: verdeLima, borderColor: verdeLima, fontSize: 18, borderRadius: 10, boxShadow: '0 2px 8px #43c97f33', transition: 'box-shadow 0.2s', color: '#fff' }}
            >
              {loading ? 'Guardando...' : <span><span role="img" aria-label="save">💾</span> Crear Gasto</span>}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default function GastoFloatingWidget() {
  const [show, setShow] = useState(false);
  const handleOpen = () => setShow(true);
  const handleClose = () => setShow(false);
  const handleSubmit = () => {};
  return (
    <>
      <GastoFloatingButton onOpen={handleOpen} />
      <GastoFormModal show={show} onClose={handleClose} onSubmit={handleSubmit} />
    </>
  );
}
