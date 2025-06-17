import React from "react";
import '../../cssGeneral/osDetail/clientInfoCard/clientInfoCard.css';

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const parsedDate = new Date(dateString);
  if (isNaN(parsedDate.getTime())) {
    return dateString;
  }
  return parsedDate.toLocaleString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ClientInfoCard = ({ clientData, fechaIngreso }) => {
  return (
    <div className="cic-card">
      <div className="cic-card-header">
        <h5 className="cic-card-title">Información del Cliente</h5>
      </div>
      <div className="cic-card-body">
        <p>
          <strong>Nombre:</strong>{" "}
          {clientData?.nombre}{" "}
          {clientData?.apellido}
        </p>
        <p>
          <strong>Teléfono:</strong>{" "}
          {clientData?.telefono}
        </p>
        <p>
          <strong>Fecha de Solicitud:</strong>{" "}
          {formatDateTime(fechaIngreso)}
        </p>
      </div>
    </div>
  );
};

export default React.memo(ClientInfoCard); 