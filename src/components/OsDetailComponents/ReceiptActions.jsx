import React from "react";
import '../../cssGeneral/osDetail/receiptActions/receiptActions.css';

const ReceiptActions = ({
  handleExportReceipt,
  isGeneratingPDF,
  hasValidDiagnosis,
  onClose,
  onDelete
}) => {
  return (
    <div className="ra-actions">
      <button 
        className="ra-btn ra-btn-success"
        onClick={handleExportReceipt} 
        disabled={isGeneratingPDF || !hasValidDiagnosis}
      >
        {isGeneratingPDF ? (
          <>
            <span className="ra-spinner"></span>
            Generando PDF...
          </>
        ) : (
          <>
            📄 Exportar Recibo
          </>
        )}
      </button>
      <button className="ra-btn ra-btn-secondary" onClick={onClose}>
        Cerrar
      </button>
      <button className="ra-btn ra-btn-danger" onClick={onDelete}>
        Eliminar Orden
      </button>
    </div>
  );
};

export default React.memo(ReceiptActions); 