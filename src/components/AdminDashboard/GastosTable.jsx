import React, { useState, useEffect } from 'react';

export default function GastosTable() {
  // Estado de gastos y paginación
  const [gastos, setGastos] = useState([]);
  const [filteredGastos, setFilteredGastos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredGastos.length / itemsPerPage);
  const paginatedGastos = filteredGastos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const fetchGastos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/gastos/resumen');
        const data = await res.json();
        if (Array.isArray(data.gastos)) {
          setGastos(data.gastos);
        } else if (data.id) {
          setGastos([data]);
        } else {
          setGastos([]);
        }
      } catch (err) {
        setError('Error al cargar los gastos');
      } finally {
        setLoading(false);
      }
    };
    fetchGastos();
  }, []);

  // Actualizar gastos filtrados cuando cambian los filtros
  useEffect(() => {
    let result = [...gastos];
    // Filtro por rango de fechas
    if (rangeStart) {
      result = result.filter(g => {
        const fecha = new Date(g.fecha);
        return fecha >= new Date(rangeStart);
      });
    }
    if (rangeEnd) {
      result = result.filter(g => {
        const fecha = new Date(g.fecha);
        return fecha <= new Date(rangeEnd);
      });
    }
    // Filtro por año
    if (filterYear) {
      result = result.filter(g => {
        const year = new Date(g.fecha).getFullYear();
        return year === parseInt(filterYear);
      });
    }
    // Filtro por mes
    if (filterMonth) {
      result = result.filter(g => {
        const month = new Date(g.fecha).getMonth() + 1;
        return month === parseInt(filterMonth);
      });
    }
    // Filtro por día
    if (filterDay) {
      result = result.filter(g => {
        const day = new Date(g.fecha).getDate();
        return day === parseInt(filterDay);
      });
    }
    // Filtro por tipo
    if (filterTipo) {
      result = result.filter(g => g.tipo === filterTipo);
    }
    setFilteredGastos(result);
    setCurrentPage(1);
  }, [gastos, filterYear, filterMonth, filterDay, rangeStart, rangeEnd, filterTipo]);

  if (loading) return <div className="has-text-centered py-4">Cargando gastos...</div>;
  if (error) return <div className="has-text-danger py-4">{error}</div>;
  if (!gastos.length) return <div className="has-text-grey py-4">No hay gastos registrados</div>;

  // Calcular el total de los gastos filtrados
  const totalGastos = filteredGastos.reduce((acc, g) => acc + (parseFloat(g.cantidad) || 0), 0);

  return (
    <div
      style={{
        borderRadius: 22,
        background: '#fff',
        boxShadow: '0 6px 32px #e5e7eb',
        padding: 'clamp(10px, 3vw, 28px)',
        margin: '0 auto',
        maxWidth: 900,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      {/* Filtros */}
      <div style={{ width: '100%', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setRangeStart(''); setRangeEnd(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }}>
          <option value="">Año</option>
          {[...new Set(gastos.map(g => new Date(g.fecha).getFullYear()))].sort((a,b) => b-a).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setRangeStart(''); setRangeEnd(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }}>
          <option value="">Mes</option>
          {[...Array(12)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1}</option>
          ))}
        </select>
        <select value={filterDay} onChange={e => { setFilterDay(e.target.value); setRangeStart(''); setRangeEnd(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }}>
          <option value="">Día</option>
          {[...Array(31)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1}</option>
          ))}
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }}>
          <option value="">Tipo</option>
          <option value="taller">Taller</option>
          <option value="tienda">Tienda</option>
        </select>
        <span style={{ fontWeight: 700, margin: '0 8px' }}>o</span>
        <input type="date" value={rangeStart} onChange={e => { setRangeStart(e.target.value); setFilterYear(''); setFilterMonth(''); setFilterDay(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }} />
        <span style={{ fontWeight: 700 }}>a</span>
        <input type="date" value={rangeEnd} onChange={e => { setRangeEnd(e.target.value); setFilterYear(''); setFilterMonth(''); setFilterDay(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', fontWeight: 600 }} />
        <button onClick={() => {
          setFilterYear('');
          setFilterMonth('');
          setFilterDay('');
          setRangeStart('');
          setRangeEnd('');
          setFilterTipo('');
        }} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid #000', background: '#F59E42', color: '#fff', fontWeight: 700, marginLeft: 8 }}>Limpiar filtros</button>
      </div>
      <div
        className="table-container"
        style={{
          overflowX: 'auto',
          borderRadius: 18,
          background: 'linear-gradient(135deg, #e6f7ee 0%, #c7f5e9 100%)',
          WebkitOverflowScrolling: 'touch',
          minWidth: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          boxShadow: '0 2px 12px #43c97f22',
        }}
      >
        <table
          className="table is-fullwidth is-hoverable"
          style={{
            fontSize: 'clamp(13px, 2.5vw, 16px)',
            borderRadius: 18,
            background: 'transparent',
            color: '#23263A',
            minWidth: 340,
            maxWidth: '100%',
            tableLayout: 'auto',
            margin: 0,
            boxShadow: '0 1px 8px #43c97f11',
            borderCollapse: 'separate',
            borderSpacing: 0,
            border: '2px solid #000',
          }}
        >
          <thead
            style={{
              background: '#5B21B6',
              position: 'sticky',
              top: 0,
              zIndex: 2,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 0.5,
              boxShadow: '0 2px 8px #5B21B633',
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <tr>
              <th style={{ borderTopLeftRadius: 18, minWidth: 90, padding: '14px 10px', textAlign: 'center', border: '2px solid #000' }}>Descripción</th>
              <th style={{ minWidth: 70, padding: '14px 10px', textAlign: 'center', border: '2px solid #000' }}>Monto</th>
              <th style={{ minWidth: 60, padding: '14px 10px', textAlign: 'center', border: '2px solid #000' }}>Tipo</th>
              <th style={{ borderTopRightRadius: 18, minWidth: 80, padding: '14px 10px', textAlign: 'center', border: '2px solid #000' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGastos.map((g, idx) => {
              // Mostrar descripción completa, celda grande y multilinea
              return (
                <tr key={g.id} style={{ background: idx % 2 === 0 ? '#D1FAE5' : '#F3F4F6', borderRadius: 14, boxShadow: '0 1px 8px #5B21B622', borderBottom: '3px solid #2563EB' }}>
                  <td
                    style={{
                      borderRadius: 8,
                      wordBreak: 'break-word',
                      maxWidth: 320,
                      minWidth: 120,
                      minHeight: 38,
                      padding: '14px 12px',
                      fontWeight: 600,
                      color: '#23263A',
                      border: '2px solid #000',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'pre-line',
                      verticalAlign: 'middle',
                      background: '#F3F4F6',
                      lineHeight: 1.5,
                      fontSize: 15,
                      display: 'table-cell',
                    }}
                  >{g.descripcion}</td>
                  <td style={{ fontWeight: 700, color: '#10B981', padding: '12px 10px', textAlign: 'center', border: '2px solid #000' }}>S/ {parseFloat(g.cantidad).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td style={{
                    color: '#2563EB',
                    fontWeight: 600,
                    padding: '12px 10px',
                    textAlign: 'center',
                    border: '2px solid #000',
                    background: g.tipo === 'taller' ? '#E0F2FF' : '#FFF5E0',
                  }}>{g.tipo === 'taller' ? 'Taller' : 'Tienda'}</td>
                  <td style={{ color: '#23263A', padding: '12px 10px', textAlign: 'center', border: '2px solid #000' }}>{g.fecha}</td>
                </tr>
              );
            })}
      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, margin: '18px 0 0 0' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >Anterior</button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: currentPage === i + 1 ? '#10B981' : '#F3F4F6',
                color: currentPage === i + 1 ? '#fff' : '#23263A',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: currentPage === i + 1 ? '0 2px 8px #10B98144' : 'none',
                margin: '0 2px'
              }}
            >{i + 1}</button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >Siguiente</button>
        </div>
      )}
            {/* Fila de total bien alineada a la izquierda */}
            <tr style={{ background: '#F59E42', fontWeight: 900, color: '#fff', boxShadow: '0 1px 6px #F59E4222' }}>
              <td colSpan={4} style={{
                textAlign: 'left',
                borderTop: '2px solid #F59E42',
                paddingTop: 18,
                fontWeight: 900,
                fontSize: 19,
                color: '#fff',
                letterSpacing: 0.5,
                border: '2px solid #000',
              }}>
                Total de gastos: S/ {totalGastos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Estilos responsivos para móvil */}
      <style>{`
        @media (max-width: 600px) {
          .table-container {
            padding: 0;
            background: #D1FAE5;
            justify-content: center;
          }
          table {
            font-size: 13px !important;
            min-width: 320px !important;
            margin: 0 auto !important;
          }
          th {
            background: #10B981 !important;
            color: #fff !important;
          }
          td {
            padding: 9px 4px !important;
            word-break: break-word;
            color: #23263A !important;
            background: #D1FAE5 !important;
          }
        }
      `}</style>
    </div>
  );
}
