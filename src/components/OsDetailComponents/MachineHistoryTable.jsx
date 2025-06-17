import React, { useState } from "react";
import '../../cssGeneral/osDetail/machineHistoryTable/machineHistoryTable.css';

// Función auxiliar para extraer el ID de un enlace de Google Drive
const extractFileIdFromUrl = (url) => {
  const regex = /\/file\/d\/([^/]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const MachineHistoryTable = ({ machineHistory, showHistory }) => {
  if (!showHistory || !machineHistory) {
    return null;
  }

  return (
    <div className="mht-section" style={{ maxHeight: 260, overflowY: 'auto', width: '100%', background: '#fafdff', borderRadius: 10, boxShadow: '0 1px 4px rgba(26,77,124,0.07)', border: '1px solid #e3e8ee', marginBottom: 12, padding: 8 }}>
      <h6 className="mht-title" style={{ fontSize: '1em', fontWeight: 600, margin: '0.7em 0 0.5em 0', color: '#265d97' }}>Historial de la Máquina:</h6>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
        {machineHistory.map((historial) => {
          const [showFullDesc, setShowFullDesc] = useState(false);
          const [showFullDiag, setShowFullDiag] = useState(false);
          const maxChars = 60;
          const descripcion = historial.descripcion || "Sin descripción";
          const diagnostico = historial.dispositivo.diagnostico || "Sin diagnóstico";
          const isLongDesc = descripcion.length > maxChars;
          const isLongDiag = diagnostico.length > maxChars;
          const displayDesc = showFullDesc || !isLongDesc
            ? descripcion
            : descripcion.slice(0, maxChars) + '...';
          const displayDiag = showFullDiag || !isLongDiag
            ? diagnostico
            : diagnostico.slice(0, maxChars) + '...';
          return (
            <div key={historial.id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(26,77,124,0.07)', border: '1px solid #e3e8ee', padding: '0.7em 1em', fontSize: '0.97em', display: 'flex', flexDirection: 'column', gap: 2, color: '#1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: '#265d97' }}>{historial.fecha}</span>
                {historial.dispositivo.imagenen_diagnostico ? (
                  (() => {
                    const fileId = extractFileIdFromUrl(historial.dispositivo.imagenen_diagnostico);
                    if (fileId) {
                      return (
                        <button
                          className="mht-btn"
                          style={{ fontSize: '0.95em', padding: '2px 8px', background: '#eaf3fb', border: '1px solid #b6d4fe', borderRadius: 5, color: '#265d97', cursor: 'pointer' }}
                          onClick={() => {
                            window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
                          }}
                        >
                          📷 Ver imagen
                        </button>
                      );
                    } else {
                      return <span style={{ color: '#888' }}>Enlace no válido.</span>;
                    }
                  })()
                ) : (
                  <span style={{ color: '#888', fontSize: '0.95em' }}>Sin imagen</span>
                )}
              </div>
              <div style={{ marginBottom: 2, color: '#222' }}>
                <span style={{ fontWeight: 500 }}>Descripción: </span>
                {displayDesc}
                {isLongDesc && (
                  <button
                    className="mht-btn"
                    style={{ marginLeft: 8, fontSize: '0.95em', padding: '2px 8px', background: 'none', border: 'none', color: '#265d97', cursor: 'pointer' }}
                    onClick={() => setShowFullDesc((prev) => !prev)}
                  >
                    {showFullDesc ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
              <div style={{ marginBottom: 2, color: '#222' }}>
                <span style={{ fontWeight: 500 }}>Cliente: </span>
                {historial.cliente.nombre} {historial.cliente.apellido}
              </div>
              <div style={{ marginBottom: 2, color: '#222' }}>
                <span style={{ fontWeight: 500 }}>Teléfono: </span>
                {historial.cliente.telefono}
              </div>
              <div style={{ color: '#222' }}>
                <span style={{ fontWeight: 500 }}>Diagnóstico: </span>
                {displayDiag}
                {isLongDiag && (
                  <button
                    className="mht-btn"
                    style={{ marginLeft: 8, fontSize: '0.95em', padding: '2px 8px', background: 'none', border: 'none', color: '#265d97', cursor: 'pointer' }}
                    onClick={() => setShowFullDiag((prev) => !prev)}
                  >
                    {showFullDiag ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(MachineHistoryTable); 