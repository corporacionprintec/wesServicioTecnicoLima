import React from "react";
import '../../cssGeneral/osDetail/diagnosisForm/diagnosisForm.css';
import VoiceDictation from "./VoiceDictation";
import imageCompression from 'browser-image-compression';

const MAX_LENGTH = 900;

const DiagnosisForm = ({
  showModelInput,
  newOrderType,
  setNewOrderType,
  setNewOrderImage,
  handleUpdateDevice,
  isUpdatingDiagnostico,
  showToast,
  costoTotal,
  setCostoTotal,
  fechaDiagnostico,
  setFechaDiagnostico,
  fechaIngreso,
}) => {
  // if (!showModelInput) {
  //   return null;
  // }

  const charCount = newOrderType.length;
  const nearLimit = charCount > MAX_LENGTH - 100;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Opciones de compresión
    const options = {
      maxSizeMB: 8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      if (compressedFile.size > 8 * 1024 * 1024) {
        showToast('La imagen sigue siendo mayor a 8MB incluso después de comprimir. Por favor, selecciona una imagen más pequeña.', 'warning');
        setNewOrderImage(null);
      } else {
        setNewOrderImage(compressedFile);
      }
    } catch (error) {
      showToast('Error al comprimir la imagen: ' + error.message, 'danger');
      setNewOrderImage(null);
    }
  };

  return (
    <div className="card" style={{ background: '#e0f0ff', borderRadius: 18, boxShadow: '0 2px 8px rgba(91,134,229,0.06)', padding: '1.2em 1.2em 1em 1.2em', marginBottom: 18, border: '1.5px solid #e3e8ee', fontFamily: 'Segoe UI, Arial, sans-serif', position: 'relative' }}>
      <h5 className="df-title">Diagnóstico</h5>
      <div>
        <VoiceDictation 
          value={newOrderType}
          onChange={setNewOrderType}
          maxLength={MAX_LENGTH}
          showToast={showToast}
        />
        <div style={{ fontSize: 13, fontWeight: 500, color: nearLimit ? '#d35400' : '#888', textAlign: 'right', marginTop: 2 }}>
          {charCount} / {MAX_LENGTH}
        </div>
      </div>
      <div className="df-group">
        <label className="df-label">Imagen de diagnóstico</label>
        <input
          className="df-input"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>
      {/* Campo de costo total desocultado */}
      <div className="df-group">
        <label className="df-label">Costo total (S/)</label>
        <input
          className="df-input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Costo total"
          value={costoTotal === null || typeof costoTotal === 'undefined' ? '' : costoTotal}
          onChange={e => {
            // Permitir vacío o número válido
            const val = e.target.value;
            if (val === '' || /^\d*([\.,]?\d*)?$/.test(val)) {
              setCostoTotal(val.replace(',', '.'));
            }
          }}
          onKeyDown={e => {
            // Bloquear e, +, -
            if (["e", "E", "+", "-"].includes(e.key)) {
              e.preventDefault();
            }
          }}
          inputMode="decimal"
          autoComplete="off"
        />
      </div>
      {/* <div className="df-group">
        <label className="df-label">Fecha y hora del diagnóstico</label>
        <input
          className="df-input"
          type="datetime-local"
          value={fechaDiagnostico}
          min={fechaIngreso}
          max={(() => {
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
          })()}
          onChange={e => setFechaDiagnostico(e.target.value)}
          required
        />
      </div> */}
      <button 
        className="df-btn"
        onClick={handleUpdateDevice} 
        disabled={isUpdatingDiagnostico || !newOrderType}
      >
        {isUpdatingDiagnostico ? (
          <>
            <span className="df-spinner"></span>
            Procesando...
          </>
        ) : (
          "Guardar Diagnóstico"
        )}
      </button>
    </div>
  );
};

export default React.memo(DiagnosisForm);