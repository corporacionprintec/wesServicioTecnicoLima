import React, { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import '../../cssGeneral/employeeDashboard/qrscannercomponent/qrscannercomponent.css';

/**
 * Componente para escanear códigos QR con cámara o subir una imagen de QR
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.show - Controla si el modal está visible
 * @param {Function} props.onHide - Función para cerrar el modal
 * @param {Function} props.onScan - Función que recibe el resultado del escaneo
 * @param {string} props.title - Título del modal (opcional)
 * @param {string} props.initialMode - Modo inicial de escaneo ('camera' o 'upload')
 * @param {boolean} props.hideOptions - Si es true, oculta las opciones de selección de método
 */
const QrScannerComponent = ({ 
  show, 
  onHide, 
  onScan, 
  title = "Escanear código QR",
  initialMode = "camera",
  hideOptions = false
}) => {
  const [hasCamera, setHasCamera] = useState(true);
  const [scanningMethod, setScanningMethod] = useState(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Aplicar el modo inicial cuando cambia
  useEffect(() => {
    if (initialMode) {
      setScanningMethod(initialMode === 'camera-only' ? 'camera' : initialMode);
    }
  }, [initialMode]);

  // Verificar disponibilidad de cámara
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some(device => device.kind === 'videoinput');
        setHasCamera(hasCam);
        // Si no hay cámara o el modo es 'upload', cambiar a subir imagen
        if (!hasCam && scanningMethod === 'camera') {
          setScanningMethod('upload');
        }
      } catch (error) {
        console.error("Error verificando cámara:", error);
        setHasCamera(false);
        setScanningMethod('upload');
      }
    };

    if (show) {
      checkCameraAvailability();
    }
  }, [show, scanningMethod]);

  // Iniciar el escáner de QR cuando se muestra el modal
  useEffect(() => {
    if (show && scanningMethod === 'camera' && hasCamera && videoRef.current) {
      startQrScanner();
    }

    return () => stopQrScanner();
  }, [show, scanningMethod, hasCamera]);

  // Iniciar el escáner de QR con la cámara
  const startQrScanner = () => {
    if (!videoRef.current) return;
    
    setIsScanning(true);
    setError(null);
    
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
    }
    
    try {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        { 
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );
      
      qrScannerRef.current.start()
        .catch(error => {
          console.error("Error al iniciar el escáner:", error);
          setError("No se pudo acceder a la cámara. Revisa los permisos.");
          setIsScanning(false);
        });
    } catch (error) {
      console.error("Error al crear el escáner:", error);
      setError("Error al inicializar el escáner QR.");
      setIsScanning(false);
    }
  };

  // Detener el escáner QR
  const stopQrScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Manejar el resultado del escaneo
  const handleScanResult = (qrData) => {
    if (qrData) {
      stopQrScanner();
      onScan(qrData);
      onHide();
    }
  };

  // Cambiar entre métodos de escaneo
  const toggleScanningMethod = (method) => {
    if (method === scanningMethod) return;
    
    stopQrScanner();
    setScanningMethod(method);
    setError(null);
    
    if (method === 'camera' && hasCamera) {
      setTimeout(() => startQrScanner(), 300);
    }
  };

  // Manejar la selección de archivos
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    try {
      const result = await QrScanner.scanImage(file);
      if (result) {
        handleScanResult(result);
      }
    } catch (error) {
      console.error("Error al escanear la imagen:", error);
      setError("No se pudo detectar un código QR en la imagen.");
    }
    
    // Resetear input para poder seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Solicitar selección de archivo
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!show) return null;

  return (
    <div className={`qr-modal-backdrop${show ? ' show' : ''}`}>
      <div className="qr-modal">
        <div className="qr-modal-header">
          <span className="qr-modal-title">{title}</span>
          <button className="qr-modal-close" onClick={onHide} title="Cerrar">❌</button>
        </div>
        <div className="qr-modal-body">
          {!hideOptions && (
            <div className="qr-methods">
              <button 
                className={`qr-method-btn${scanningMethod === 'camera' ? ' active' : ''}`} 
                onClick={() => toggleScanningMethod('camera')} 
                disabled={!hasCamera}
              >
                📷 Usar cámara
              </button>
              <button 
                className={`qr-method-btn${scanningMethod === 'upload' ? ' active' : ''}`} 
                onClick={() => toggleScanningMethod('upload')}
              >
                🖼️ Subir imagen
              </button>
            </div>
          )}
          {scanningMethod === 'camera' && hasCamera && (
            <div className="qr-camera-view">
              <video ref={videoRef} className="qr-video" autoPlay muted playsInline />
            </div>
          )}
          {scanningMethod === 'upload' && (
            <div className="qr-upload-view">
              <button className="qr-upload-btn" onClick={triggerFileInput}>🖼️ Seleccionar imagen</button>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
          )}
          {error && <div className="qr-error">⚠️ {error}</div>}
        </div>
      </div>
    </div>
  );
};

export default QrScannerComponent; 