import React from 'react';
import '../../cssGeneral/repairRequestForm/submitButton/submitButton.css';

/**
 * Componente para el botón de envío del formulario
 * @param {Object} props
 * @param {string} props.text - Texto a mostrar en el botón
 * @param {boolean} props.loading - Indica si se está procesando el envío
 * @param {function} props.onMouseOver - Función para el evento onMouseOver
 * @param {function} props.onMouseOut - Función para el evento onMouseOut
 */
const SubmitButton = ({ 
  text = "Enviar", 
  loading = false, 
  onMouseOver, 
  onMouseOut
}) => {
  return (
    <button 
      type="submit" 
      className="submit-btn"
      disabled={loading}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {loading ? (
        <>
          <span className="spinner" role="status" aria-hidden="true"></span>
          Procesando...
        </>
      ) : (
        <>
          <span role="img" aria-label="send">🛩️</span> 
          {text}
        </>
      )}
    </button>
  );
};

export default SubmitButton; 