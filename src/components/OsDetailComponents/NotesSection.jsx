import React, { useEffect } from "react";
import '../../cssGeneral/osDetail/notesSection/notesSection.css';

const DiagnosticoAvanzadoButton = () => {
  useEffect(() => {
    // Eliminar márgenes y scroll del body
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    // Restaurar estilos al desmontar el componente
    return () => {
      document.body.style.margin = "";
      document.body.style.overflow = "";
    };
  }, []);

  const handleClick = () => {
    window.open(
      "https://corporacionprintec.github.io/Printec.github.io/inspeccion.html",
      "_blank"
    );
  };
  

  return (
    <div className="ns-section">
      <button
        className="ns-btn"
        onClick={handleClick}
      >
        Realizar diagnóstico avanzado
      </button>
    </div>
  );
};

export default DiagnosticoAvanzadoButton;
