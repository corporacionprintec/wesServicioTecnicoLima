import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Recibe: ordenes (array), tecnicoId (string|number)
function TechnicianOrdersList({ ordenes, tecnicoId }) {
  const navigate = useNavigate();
  const [searchCliente, setSearchCliente] = useState('');
  const [searchEstado, setSearchEstado] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filtrar órdenes donde el técnico participó en cualquier rol relevante y no estén eliminadas
  const ordenesTecnico = useMemo(() => ordenes.filter(orden => {
    if (!orden.dispositivo) return false;
    const id = String(tecnicoId);
    const match = [
      orden.dispositivo.tecnico_id,
      orden.dispositivo.tecnico_recibio,
      orden.dispositivo.tecnico_entrego
    ].map(String).includes(id);
    // No contar eliminadas: si tiene costo_acordado, se considera eliminada
    const noEliminado = !orden.costo_acordado;
    return match && noEliminado;
  }), [ordenes, tecnicoId]);

  // Filtros por cliente y estado
  const ordenesFiltradas = useMemo(() => {
    return ordenesTecnico.filter(orden => {
      const cliente = `${orden.dispositivo?.cliente?.nombre || ''} ${orden.dispositivo?.cliente?.apellido || ''}`.toLowerCase();
      const estado = (orden.estado || '').toLowerCase();
      const matchCliente = cliente.includes(searchCliente.toLowerCase());
      const matchEstado = searchEstado ? estado === searchEstado.toLowerCase() : true;
      return matchCliente && matchEstado;
    });
  }, [ordenesTecnico, searchCliente, searchEstado]);

  // Paginación
  const totalPages = Math.ceil(ordenesFiltradas.length / limit);
  const paginatedOrdenes = ordenesFiltradas.slice((page - 1) * limit, page * limit);

  if (ordenesTecnico.length === 0) {
    return <div style={{padding: 24, textAlign: 'center', color: '#e0e7ff', background: '#232946', borderRadius: 16}}>No se encontraron reparaciones para este técnico.</div>;
  }

  const handleRowClick = (ordenId) => {
    // Guardar el ID de la orden en sessionStorage para que EmployeeDashboard la abra
    sessionStorage.setItem('selectedOrderId', ordenId);
    navigate('/employee-dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Estados únicos para el filtro
  const estadosUnicos = Array.from(new Set(ordenesTecnico.map(o => o.estado))).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#181a2a', overflowX: 'hidden', padding: 0, margin: 0 }}>
      <div style={{
        margin: 0,
        width: '100vw',
        maxWidth: '100vw',
        background: '#232946',
        borderRadius: 0,
        boxShadow: 'none',
        padding: window.innerWidth < 768 ? '0' : '32px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        <h2 style={{
          fontWeight: 900,
          fontSize: 22,
          marginBottom: 18,
          color: '#38bdf8',
          letterSpacing: 0.5,
          marginTop: window.innerWidth < 768 ? 18 : 0,
          background: 'linear-gradient(90deg, #232946 60%, #38bdf8 100%)',
          borderRadius: 14,
          padding: '16px 0',
          boxShadow: '0 2px 12px #0ea5e955',
          textAlign: 'center',
          border: '2px solid #38bdf8',
          textShadow: '0 2px 8px #23294644',
        }}>
          <span style={{filter: 'drop-shadow(0 2px 4px #23294688)'}}>🗂️</span> Historial de órdenes donde el técnico participó
        </h2>
        <div style={{display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', width: '95%', maxWidth: 1200, alignItems: 'center'}}>
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchCliente}
            onChange={e => setSearchCliente(e.target.value)}
            style={{
              background: '#181a2a', color: '#e0e7ff', border: '1.5px solid #0ea5e9', borderRadius: 8, padding: '7px 14px', fontSize: 15, minWidth: 180
            }}
          />
          <select
            value={searchEstado}
            onChange={e => setSearchEstado(e.target.value)}
            style={{
              background: '#181a2a', color: '#e0e7ff', border: '1.5px solid #0ea5e9', borderRadius: 8, padding: '7px 14px', fontSize: 15, minWidth: 140
            }}
          >
            <option value="">Todos los estados</option>
            {estadosUnicos.map(estado => (
              <option key={estado} value={estado}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={handleGoBack}
            style={{
              background: '#232946',
              color: '#38bdf8',
              border: '2px solid #38bdf8',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0ea5e955',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#38bdf8'; e.currentTarget.style.color = '#232946'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#232946'; e.currentTarget.style.color = '#38bdf8'; }}
          >
            ⬅️ Regresar
          </button>
          <div style={{flex: 1}}></div>
          <span style={{color: '#38bdf8', fontWeight: 700, alignSelf: 'center'}}>Total: {ordenesFiltradas.length}</span>
        </div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: 18 }}>
        </div>
        <div style={{overflowX: 'auto', borderRadius: 12, width: '100vw', maxWidth: '100vw', padding: 0}}>
          <table style={{width: '100%', minWidth: 600, background: '#232946', borderRadius: 0, boxShadow: 'none', overflow: 'hidden', color: '#e0e7ff'}}>
            <thead style={{background: '#181a2a', color: '#38bdf8'}}>
              <tr>
                <th style={{padding: 10}}>ID</th>
                <th style={{padding: 10}}>Cliente</th>
                <th style={{padding: 10}}>Estado</th>
                <th style={{padding: 10}}>Fecha creación</th>
                <th style={{padding: 10}}>Fecha diagnóstico</th>
                <th style={{padding: 10}}>Fecha entrega</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrdenes.length > 0 ? paginatedOrdenes.map(orden => (
                <tr
                  key={orden.id}
                  style={{textAlign: 'center', cursor: 'pointer', transition: 'background 0.15s'}}
                  onClick={() => handleRowClick(orden.id)}
                  onMouseOver={e => e.currentTarget.style.background = '#313552'}
                  onMouseOut={e => e.currentTarget.style.background = ''}
                >
                  <td style={{padding: 8}}>{orden.id}</td>
                  <td style={{padding: 8}}>{orden.dispositivo?.cliente?.nombre} {orden.dispositivo?.cliente?.apellido}</td>
                  <td style={{padding: 8}}>{orden.estado}</td>
                  <td style={{padding: 8}}>{orden.createdAt ? new Date(orden.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={{padding: 8}}>{orden.fecha_diagnostico ? new Date(orden.fecha_diagnostico).toLocaleDateString() : '-'}</td>
                  <td style={{padding: 8}}>{orden.fecha_entrega ? new Date(orden.fecha_entrega).toLocaleDateString() : '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: 18, color: '#b0b8d1'}}>No hay órdenes que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '24px 0' }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{ background: '#181a2a', color: '#38bdf8', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 16, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              ⬅️
            </button>
            <span style={{ color: '#e0e7ff', fontWeight: 700 }}>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              style={{ background: '#181a2a', color: '#38bdf8', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 16, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
            >
              ➡️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TechnicianOrdersList;
