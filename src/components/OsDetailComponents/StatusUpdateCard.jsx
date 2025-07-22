import React from "react";

const statusLabels = {
  pendiente: 'Pendiente',
  en_proceso: 'Diagnosticado',
  venta_rapida: 'Venta Rápida',
  entregado: 'Entregado',
  cancelado: 'En Abandono',
};

// Aplicar colores específicos a los estados y separar la sección de desliza para entregar
const StatusUpdateCard = ({ 
  currentStatus,
  handleStatusChange,
  onClose
}) => {
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains('modal-background')) {
      onClose();
    }
  };

  return (
    <div className="modal is-active" onClick={handleOutsideClick}>
      <div className="modal-background"></div>
      <div className="box has-background-light" style={{ zIndex: 10 }}>
        {onClose && (
          <button
            type="button"
            className="delete is-pulled-right"
            onClick={onClose}
            title="Cerrar"
          ></button>
        )}
        <div className="has-text-weight-bold mb-3">Actualizar Estado</div>
        <div className="buttons are-small">
          <button
            type="button"
            className={`button${currentStatus === "pendiente" ? " is-warning" : " is-light"}`}
            onClick={() => handleStatusChange("pendiente")}
          >
            Pendiente
          </button>
          <button
            type="button"
            className={`button${currentStatus === "en_proceso" ? " is-info" : " is-light"}`}
            onClick={() => handleStatusChange("en_proceso")}
          >
            Diagnosticado
          </button>
          <button
            type="button"
            className={`button${currentStatus === "venta_rapida" ? " is-primary" : " is-light"}`}
            onClick={() => handleStatusChange("venta_rapida")}
          >
            {statusLabels["venta_rapida"]}
          </button>
          <button
            type="button"
            className={`button${currentStatus === "entregado" ? " is-success" : " is-light"}`}
            onClick={() => handleStatusChange("entregado")}
          >
            Entregado
          </button>
          <button
            type="button"
            className={`button${currentStatus === "cancelado" ? " is-danger" : " is-light"}`}
            onClick={() => handleStatusChange("cancelado")}
          >
            En Abandono
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeliverySlider = ({ handleStatusChange, disabled }) => (
  <div className="box has-background-info-light mt-5">
    <div className="has-text-info has-text-weight-bold">
      ➡️ Desliza para entregar
    </div>
    {disabled && (
      <div style={{ color: '#d35400', fontWeight: 600, marginTop: 8 }}>
        Debes registrar al menos un pago antes de entregar
      </div>
    )}
    <div className="is-flex is-align-items-center is-justify-content-space-between mt-3">
      <span className="tag is-info">Diagnosticado</span>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue="0"
        className="slider is-info"
        disabled={disabled}
        onChange={(e) => {
          if (!disabled && parseInt(e.target.value) === 100) {
            handleStatusChange("entregado");
          }
        }}
      />
      <span className="tag is-success">Entregado</span>
    </div>
  </div>
);

export default React.memo(StatusUpdateCard);