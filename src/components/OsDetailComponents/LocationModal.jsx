import React from "react";
import '../../cssGeneral/osDetail/locationModal/locationModal.css';

const LocationModal = ({
  showLocationModal,
  setShowLocationModal,
  destinationLocation,
  setDestinationLocation,
  handleUpdateLocation,
  showToast
}) => {
  if (!showLocationModal) return null;
  return (
    <div className="lm-modal-bg">
      <div className="lm-modal">
        <div className="lm-modal-header">
          <span className="lm-modal-title">Traslado de Máquina</span>
          <button className="lm-modal-close" onClick={() => setShowLocationModal(false)}>❌</button>
        </div>
        <div className="lm-modal-body">
          <h6 style={{marginBottom: '1em'}}>¿A dónde trasladaron la máquina?</h6>
          <div className="lm-radio-group">
            <label className="lm-radio-option">
              <input
                type="radio"
                name="destinationLocation"
                value="Trasladado Taller"
                checked={destinationLocation === "Trasladado Taller"}
                onChange={(e) => setDestinationLocation(e.target.value)}
              />
              <span className="lm-radio-label">Trasladado Taller</span>
            </label>
            <label className="lm-radio-option">
              <input
                type="radio"
                name="destinationLocation"
                value="Trasladado Tienda"
                checked={destinationLocation === "Trasladado Tienda"}
                onChange={(e) => setDestinationLocation(e.target.value)}
              />
              <span className="lm-radio-label">Trasladado Tienda</span>
            </label>
          </div>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn-cancel" onClick={() => setShowLocationModal(false)}>
            Cancelar
          </button>
          <button 
            className="lm-btn lm-btn-primary"
            onClick={handleUpdateLocation}
            disabled={!destinationLocation}
          >
            Guardar Ubicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LocationModal); 