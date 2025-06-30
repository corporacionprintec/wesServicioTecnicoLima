import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

// Recibe: ordenes (array)
function TechnicianOrdersList({ ordenes }) {
  const navigate = useNavigate();
  const [searchCliente, setSearchCliente] = useState('');
  const [searchEstado, setSearchEstado] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTechnicianData = sessionStorage.getItem('selectedTechnician');
    if (storedTechnicianData) {
      try {
        setSelectedTechnician(JSON.parse(storedTechnicianData));
      } catch (error) {
        console.error("Error parsing technician data from sessionStorage:", error);
      }
    }
    setLoading(false);
  }, []);

  const tecnicoId = selectedTechnician?.id;

  // Filtrar órdenes donde el técnico participó en cualquier rol relevante y no estén eliminadas
  const ordenesTecnico = useMemo(() => {
    if (!tecnicoId) return [];
    return ordenes.filter(orden => {
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
    });
  }, [ordenes, tecnicoId]);

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

  if (loading) {
    return <div style={{padding: 24, textAlign: 'center', color: '#e0e7ff', background: '#232946', borderRadius: 16}}>Cargando...</div>;
  }

  if (!selectedTechnician) {
    return <div style={{padding: 24, textAlign: 'center', color: '#e0e7ff', background: '#232946', borderRadius: 16}}>No se pudo cargar la información del técnico. Por favor, regrese y seleccione uno.</div>;
  }

  if (ordenesTecnico.length === 0) {
    return (
      <div style={{padding: 24, textAlign: 'center', color: '#e0e7ff', background: '#232946', borderRadius: 16}}>
        No hay órdenes asignadas a este técnico. {window.innerWidth < 768 ? <br /> : null}
        <button
          onClick={handleGoBack}
          style={{
            marginTop: 16,
            background: '#38bdf8',
            color: '#232946',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0ea5e955',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#232946'; e.currentTarget.style.color = '#38bdf8'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#38bdf8'; e.currentTarget.style.color = '#232946'; }}
        >
          ⬅️ Regresar
        </button>
      </div>
    );
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
        justifyContent: 'flex-start',
      }}>
        <h2 style={{
          fontWeight: 900,
          fontSize: window.innerWidth < 500 ? 16 : window.innerWidth < 768 ? 18 : 22,
          marginBottom: window.innerWidth < 500 ? 10 : 18,
          color: '#38bdf8',
          letterSpacing: 0.5,
          marginTop: window.innerWidth < 768 ? 10 : 0,
          background: 'linear-gradient(90deg, #232946 60%, #38bdf8 100%)',
          borderRadius: 14,
          padding: window.innerWidth < 500 ? '8px 0' : '16px 0',
          boxShadow: '0 2px 12px #0ea5e955',
          textAlign: 'center',
          border: '2px solid #38bdf8',
          textShadow: '0 2px 8px #23294644',
          width: window.innerWidth < 500 ? '98vw' : 'auto',
        }}>
          <span style={{filter: 'drop-shadow(0 2px 4px #23294688)'}}>🗂️</span> Historial de Órdenes de {selectedTechnician.nombre}
        </h2>
        <div style={{
          display: 'flex',
          gap: window.innerWidth < 500 ? 6 : 16,
          marginBottom: window.innerWidth < 500 ? 8 : 18,
          flexWrap: 'wrap',
          width: window.innerWidth < 500 ? '99vw' : '95%',
          maxWidth: 1200,
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchCliente}
            onChange={e => setSearchCliente(e.target.value)}
            style={{
              background: '#181a2a', color: '#e0e7ff', border: '1.5px solid #0ea5e9', borderRadius: 8, padding: window.innerWidth < 500 ? '5px 8px' : '7px 14px', fontSize: window.innerWidth < 500 ? 12 : 15, minWidth: window.innerWidth < 500 ? 90 : 180, width: window.innerWidth < 500 ? '40vw' : undefined
            }}
          />
          <select
            value={searchEstado}
            onChange={e => setSearchEstado(e.target.value)}
            style={{
              background: '#181a2a', color: '#e0e7ff', border: '1.5px solid #0ea5e9', borderRadius: 8, padding: window.innerWidth < 500 ? '5px 8px' : '7px 14px', fontSize: window.innerWidth < 500 ? 12 : 15, minWidth: window.innerWidth < 500 ? 70 : 140, width: window.innerWidth < 500 ? '30vw' : undefined
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
              padding: window.innerWidth < 500 ? '5px 10px' : '8px 18px',
              fontWeight: 700,
              fontSize: window.innerWidth < 500 ? 12 : 16,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0ea5e955',
              transition: 'background 0.2s, color 0.2s',
              minWidth: window.innerWidth < 500 ? 60 : undefined
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#38bdf8'; e.currentTarget.style.color = '#232946'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#232946'; e.currentTarget.style.color = '#38bdf8'; }}
          >
            ⬅️ Regresar
          </button>
          <div style={{flex: 1}}></div>
          <span style={{color: '#38bdf8', fontWeight: 700, alignSelf: 'center', fontSize: window.innerWidth < 500 ? 12 : 15}}>Total: {ordenesFiltradas.length}</span>
        </div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: window.innerWidth < 500 ? 6 : 18 }}>
        </div>
        <div style={{overflowX: 'auto', borderRadius: 12, width: window.innerWidth < 500 ? '99vw' : '100vw', maxWidth: '100vw', padding: 0}}>
          <table style={{width: '100%', minWidth: window.innerWidth < 500 ? 400 : 600, background: '#232946', borderRadius: 0, boxShadow: 'none', overflow: 'hidden', color: '#e0e7ff', fontSize: window.innerWidth < 500 ? 12 : 15}}>
            <thead style={{background: '#181a2a', color: '#38bdf8'}}>
              <tr>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>ID</th>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>Cliente</th>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>Estado</th>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>Fecha creación</th>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>Fecha diagnóstico</th>
                <th style={{padding: window.innerWidth < 500 ? 6 : 10}}>Fecha entrega</th>
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
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.id}</td>
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.dispositivo?.cliente?.nombre} {orden.dispositivo?.cliente?.apellido}</td>
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.estado}</td>
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.createdAt ? new Date(orden.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.fecha_diagnostico ? new Date(orden.fecha_diagnostico).toLocaleDateString() : '-'}</td>
                  <td style={{padding: window.innerWidth < 500 ? 5 : 8}}>{orden.fecha_entrega ? new Date(orden.fecha_entrega).toLocaleDateString() : '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: window.innerWidth < 500 ? 10 : 18, color: '#b0b8d1'}}>No hay órdenes que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Gráfico de estadísticas */}
        {/*
        <div style={{ width: '100%', maxWidth: 1200, margin: '32px auto', background: '#181a2a', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px #0ea5e955' }}>
          <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 24, textAlign: 'center', letterSpacing: 1 }}>Estadísticas de órdenes</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={[{
              nombre: "Resumen",
              recibidas: ordenesTecnico.filter(orden => String(orden.dispositivo?.tecnico_recibio) === String(tecnicoId)).length,
              diagnosticadas: ordenesTecnico.filter(orden => String(orden.dispositivo?.tecnico_id) === String(tecnicoId)).length,
              entregadas: ordenesTecnico.filter(orden => String(orden.dispositivo?.tecnico_entrego) === String(tecnicoId)).length,
              enProceso: ordenesTecnico.filter(orden => orden.estado === 'en_proceso').length
            }]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="nombre" stroke="#e0e7ff" tick={{ fontWeight: 700, fontSize: 14 }} />
              <YAxis stroke="#e0e7ff" tick={{ fontWeight: 700, fontSize: 14 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: '#23263a', color: '#e0e7ff', borderRadius: 8, border: '1.5px solid #0ea5e9' }}
                cursor={{ fill: '#313552' }}
              />
              <Legend wrapperStyle={{ color: '#e0e7ff', fontWeight: 700 }} />
              <Bar dataKey="recibidas" name="Recibidas" fill="#38bdf8">
                <LabelList dataKey="recibidas" position="top" fill="#e0e7ff" fontWeight={700} />
              </Bar>
              <Bar dataKey="diagnosticadas" name="Diagnosticadas" fill="#fbbf24">
                <LabelList dataKey="diagnosticadas" position="top" fill="#e0e7ff" fontWeight={700} />
              </Bar>
              <Bar dataKey="entregadas" name="Entregadas" fill="#10b981">
                <LabelList dataKey="entregadas" position="top" fill="#e0e7ff" fontWeight={700} />
              </Bar>
              <Bar dataKey="enProceso" name="En proceso" fill="#f87171">
                <LabelList dataKey="enProceso" position="top" fill="#e0e7ff" fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        */}

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
