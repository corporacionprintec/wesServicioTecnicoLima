import React from "react";
import '../../cssGeneral/osDetail/deviceInfoCard/deviceInfoCard.css';
import FacturaPagosPDF from './FacturaPagosPDF';

// Función auxiliar para extraer el ID de un enlace de Google Drive
const extractFileIdFromUrl = (url) => {
  const regex = /\/file\/d\/([^/]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const DeviceInfoCard = ({ 
  deviceData, 
  handleSendWhatsApp, 
  reciboURL,
  estado,
  pagos
}) => {
  return (
    <div className="dic-card">
      <div className="dic-card-header">
        <h5 className="dic-card-title">Información del Equipo</h5>
      </div>
      <div className="dic-card-body">
        <p>
          <strong>Diagnóstico:</strong>{" "}
          {deviceData?.diagnostico || "Sin diagnóstico"}
        </p>
        {/* Mostrar técnico que recibió si existe */}
        {deviceData?.tecnicoRecibio && (
          <p>
            <strong>Técnico que recibió:</strong> {`${deviceData.tecnicoRecibio.nombre} ${deviceData.tecnicoRecibio.apellido}`}
          </p>
        )}
        {/* Apartado de Precio Proforma */}
        <p>
          <strong>Precio proforma:</strong>{" "}
          {deviceData?.costo_total !== undefined && deviceData?.costo_total !== null && deviceData?.costo_total !== ''
            ? `S/. ${parseFloat(deviceData.costo_total).toFixed(2)}`
            : 'No registrado'}
        </p>
        {/* Mostrar nombre del técnico solo si el estado es en_proceso y hay detalles */}
        {estado === 'en_proceso' && deviceData?.detalles && (
          <p>
            <strong>Técnico que diagnosticó:</strong> {deviceData.detalles}
          </p>
        )}
        {deviceData?.imagenen_diagnostico && (
          <p>
            <strong>Imagen Diagnóstico:</strong>{" "}
            {(() => {
              const fileId = extractFileIdFromUrl(deviceData.imagenen_diagnostico);
              if (fileId) {
                const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                return (
                  <iframe
                    src={previewUrl}
                    width="100%"
                    height="400px"
                    style={{ border: "none", borderRadius: "8px", marginBottom: "16px" }}
                    title="Imagen del diagnóstico"
                  />
                );
              } else {
                return <span>Enlace no válido.</span>;
              }
            })()}
          </p>
        )}
        
        {/* Sección de Pagos Registrados */}
        {pagos && pagos.length > 0 && (
          <div style={{ 
            marginTop: '1em',
            padding: '1em',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h6 style={{ 
              marginBottom: '1em', 
              fontWeight: 'bold',
              color: '#1e293b',
              fontSize: '1.1rem'
            }}>
              Pagos Registrados:
            </h6>
            {/* Botón para facturar con PDF de pagos reales */}
            <div style={{ marginBottom: 12 }}>
              <FacturaPagosPDF orderData={deviceData?.orderData || { data: { ...deviceData } }} pagos={pagos} />
            </div>
            {pagos.map((pago, index) => (
              <div key={index} style={{
                padding: '1em',
                marginBottom: '0.8em',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ 
                  margin: '0 0 0.5em 0',
                  color: '#0f172a',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  <strong style={{color: '#334155'}}>Monto:</strong> S/. {pago.monto}
                </p>
                <p style={{ 
                  margin: '0 0 0.5em 0',
                  color: '#0f172a',
                  fontSize: '1rem'
                }}>
                  <strong style={{color: '#334155'}}>Método:</strong> {pago.metodo_pago}
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '0.9rem',
                  color: '#475569'
                }}>
                  {new Date(pago.fecha_pago).toLocaleDateString('es-PE')}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {/* Campo Facturado - se muestra cuando hay un recibo */}
        {deviceData?.recibo && (
          <div style={{ marginTop: '1em' }}>
            <span className="dic-badge-success">✅ FACTURADO</span>
            <div style={{ marginTop: '1em', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
              <a
                href={deviceData.recibo}
                target="_blank"
                rel="noopener noreferrer"
                className="dic-btn dic-btn-pdf"
              >
                📄 Ver recibo
              </a>
              <button 
                className="dic-btn dic-btn-whatsapp"
                onClick={handleSendWhatsApp}
              >
                💬 Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DeviceInfoCard);