import React, { useState, useRef, useEffect } from "react";
import '../../cssGeneral/osDetail/qrScannerSection/qrScannerSection.css';
import QrScanner from "qr-scanner";

const QrVinculador = ({ 
  qrResult,
  setQrResult,
  machineHistory,
  setMachineHistory,
  dniTecnico,
  showToast,
  hasCamera,
  allDataOfCurrentRequest,
  selectedTipoServicio,
  setSelectedTipoServicio,
  canVincular,
  setCanVincular,
  isUpdating,
  handleVincularQR,
  showHistory,
  setShowHistory,
  setShowModelInput,
  setShowLocationModal,
  autoStartCamera = false,
  clienteRegistradoInfo
}) => {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Detener el escáner QR cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    };
  }, []);

  // Disparar la cámara automáticamente si autoStartCamera está activo
  useEffect(() => {
    if (autoStartCamera) {
      handleScanQR();
    }
    // eslint-disable-next-line
  }, [autoStartCamera]);

  // Única fuente de verdad para los mensajes de feedback
  useEffect(() => {
    if (clienteRegistradoInfo) {
      if (clienteRegistradoInfo.registrado) {
        setFeedbackMessage(`👤 CLIENTE YA REGISTRADO: ${clienteRegistradoInfo.nombre || ''}\nPor favor seleccione el lugar de atención.`);
      } else {
        setFeedbackMessage("🆕 CLIENTE NUEVO\nPor favor seleccione el lugar de atención.");
      }
    } else {
      setFeedbackMessage("");
    }
  }, [clienteRegistradoInfo]);

  const handleScanQR = () => {
    if (!hasCamera) {
      showToast("El dispositivo no tiene cámara.", "warning");
      return;
    }
    if (videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // Extraer deviceId del backend tras validación
          fetch(
            `https://servidorserviciotecnicolima-production.up.railway.app/dispositivos/validar-qr?qr=${encodeURIComponent(result.data)}`
          )
            .then((response) => response.json())
            .then((data) => {
              if (data.valid && Array.isArray(data.data) && data.data.length > 0) {
                const deviceId = data.data[0]?.id;
                setQrResult({ ...result, deviceId });
                const newEntries = data.data.map((item, index) => ({
                  id: index + 1,
                  fecha: new Date().toLocaleDateString(),
                  descripcion: item.problemas_descritos?.[0] || "Sin descripción",
                  cliente: {
                    nombre: item.nombre || "",
                    apellido: item.apellido || "",
                    telefono: item.telefono || "",
                  },
                  dispositivo: {
                    tipo_dispositivo: item.tipo_dispositivo || "",
                    marca: item.marca || "",
                    modelo: item.modelo || "",
                    diagnostico: item.diagnostico || "Sin diagnóstico",
                    imagenen_diagnostico: item.imagenen_diagnostico || "",
                    dni_tecnico: dniTecnico,
                  },
                }));

                setMachineHistory(newEntries);
                setSelectedTipoServicio('En Taller M.');
                setCanVincular(true);
              } else {
                setQrResult(result); // fallback: no deviceId
                setCanVincular(false);
              }
            })
            .catch((error) => {
              setQrResult(result); // fallback: no deviceId
              console.error("Error al validar el QR:", error);
              setFeedbackMessage("❌ Error al validar el QR. Por favor intente nuevamente.");
            });
          setSelectedTipoServicio('');
          setCanVincular(false);
          qrScannerRef.current.stop();
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScannerRef.current.start();
    }
  };

  // Patch handleVincularQR to set feedback
  const handleVincularQRWithFeedback = async () => {
    setFeedbackMessage("");
    try {
      // Wrap the original handler
      const maybePromise = handleVincularQR();
      if (maybePromise && maybePromise.then) {
        await maybePromise;
      }
      setFeedbackMessage("✅ QR vinculado correctamente.");
    } catch (err) {
      setFeedbackMessage("❌ Error al vincular el QR. Intente nuevamente.");
    }
  };

  return (
    <div className="qrs-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div className="qrs-card-body" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {feedbackMessage && (
          <div style={{ 
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '8px',
            backgroundColor: clienteRegistradoInfo?.registrado ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${clienteRegistradoInfo?.registrado ? '#27ae60' : '#3498db'}`,
            color: clienteRegistradoInfo?.registrado ? '#27ae60' : '#2980b9',
            fontWeight: '500',
            whiteSpace: 'pre-line',
            textAlign: 'center'
          }}>
            {feedbackMessage}
          </div>
        )}
        {allDataOfCurrentRequest?.data?.dispositivo?.qr_scan ? (
          <>
            <p style={{ width: '100%', marginBottom: 12 }}>
              <label style={{ fontWeight: 500, color: '#265d97', marginBottom: 4, display: 'block' }}>QR vinculado:</label>
              <input
                type="text"
                value={allDataOfCurrentRequest.data.dispositivo.qr_scan}
                readOnly
                style={{ width: '100%', fontSize: 14, background: '#f5faff', border: '1px solid #e3e8ee', borderRadius: 6, padding: '0.5em 0.7em', color: '#265d97', overflowX: 'auto', whiteSpace: 'nowrap' }}
                onFocus={e => e.target.select()}
              />
            </p>
            <div className="qrs-btn-group">
              <button
                className="qrs-btn"
                onClick={() => {
                  setShowModelInput(true); 
                  setShowHistory(false);
                }}
                disabled={!allDataOfCurrentRequest?.data?.dispositivo?.qr_scan}
              >
                Diagnosticar
              </button>
              <button
                className="qrs-btn qrs-btn-outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "Ocultar Historial" : "Ver Historial de la Máquina"}
              </button>
              <button
                className="qrs-btn qrs-btn-outline-info"
                onClick={() => setShowLocationModal(true)}
              >
                Máquina trasladada
              </button>
            </div>
          </>
        ) : (
          <>
            {!qrResult ? (
              <>
                {hasCamera === false ? (
                  <p>El dispositivo no tiene cámara para escanear QR.</p>
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="qrs-qr-video-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                      <video
                        ref={videoRef}
                        className="qrs-qr-video"
                        playsInline
                        muted
                        style={{ width: '100%', height: 'auto', maxWidth: 400, borderRadius: 12 }}
                      ></video>
                      {/* Overlay de guías visuales */}
                      <div className="qrs-qr-guide-overlay">
                        <div className="qrs-qr-corner qrs-qr-corner-tl"></div>
                        <div className="qrs-qr-corner qrs-qr-corner-tr"></div>
                        <div className="qrs-qr-corner qrs-qr-corner-bl"></div>
                        <div className="qrs-qr-corner qrs-qr-corner-br"></div>
                      </div>
                    </div>
                    <button className="qrs-btn" onClick={handleScanQR} style={{ marginTop: '1em', alignSelf: 'center' }}>
                      Escanear QR
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="qrs-alert-info">QR escaneado: {qrResult.data}</p>
                <div style={{ marginTop: '1em' }}>
                  <div style={{ marginBottom: '1.5em' }}>
                    <h6 style={{ marginBottom: '1em', fontWeight: 600, color: '#265d97' }}>Seleccione lugar de atención:</h6>
                    <div className="qrs-radio-group">
                      <label className="qrs-radio-option">
                        <input
                          type="radio"
                          name="tipoServicio"
                          value="En Taller M."
                          checked={selectedTipoServicio === "En Taller M."}
                          onChange={(e) => {
                            setSelectedTipoServicio(e.target.value);
                            setCanVincular(true);
                          }}
                        />
                        <span className="qrs-radio-label">En Taller M.</span>
                      </label>
                      <label className="qrs-radio-option">
                        <input
                          type="radio"
                          name="tipoServicio"
                          value="En Tienda H."
                          checked={selectedTipoServicio === "En Tienda H."}
                          onChange={(e) => {
                            setSelectedTipoServicio(e.target.value);
                            setCanVincular(true);
                          }}
                        />
                        <span className="qrs-radio-label">En Tienda H.</span>
                      </label>
                    </div>
                  </div>
                  <div className="qrs-btn-group">
                    <button
                      className="qrs-btn"
                      onClick={e => { e.preventDefault(); handleVincularQRWithFeedback(); }}
                      disabled={!canVincular || !selectedTipoServicio || isUpdating}
                    >
                      {isUpdating ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: '1em', height: '1em', borderWidth: '2px', marginRight: '0.5em' }}></span>
                          Actualizando...
                        </span>
                      ) : (
                        'Vincular QR'
                      )}
                    </button>
                    <button
                      className="qrs-btn qrs-btn-outline"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? "Ocultar Historial" : "Ver Historial de la Máquina"}
                    </button>
                    <button
                      className="qrs-btn qrs-btn-outline"
                      onClick={() => {
                        setShowModelInput(true);
                        setShowHistory(false);
                      }}
                      disabled={!allDataOfCurrentRequest?.data?.dispositivo?.qr_scan}
                    >
                      Diagnosticar
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(QrVinculador);