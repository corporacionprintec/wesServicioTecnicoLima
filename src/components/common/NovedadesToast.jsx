import React from 'react';

/**
 * Componente para mostrar el mensaje de novedades como toast usando Bulma
 * @param {Object} props
 * @param {boolean} props.show - Si se muestra el toast
 * @param {function} props.onClose - Función para cerrar el toast
 */
const NovedadesToast = ({ show, onClose }) => {
  if (!show) return null;
  return (
    <div className="notification is-warning" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 99999, minWidth: 280, maxWidth: 340 }}>
      <button
        onClick={onClose}
        className="delete"
        title="Cerrar"
        style={{ position: 'absolute', top: 8, right: 10 }}
      />
      <strong>¡Novedades!</strong>
      <span style={{ display: 'block', marginTop: 6 }}>
        • Filtrado de fechas más preciso y combinado con otros filtros<br />
        • Animaciones de cargando más suaves y modernas<br />
        • Al exportar un recibo, el modal se refresca automáticamente para enviar más rápido<br />
        • El formulario tiene un color más tenue y profesional<br />
        ¡Gracias por usar el sistema!
      </span>
    </div>
  );
};

export default NovedadesToast; 