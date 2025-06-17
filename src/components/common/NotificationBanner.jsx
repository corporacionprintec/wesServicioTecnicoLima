import React from 'react';
import '../../cssGeneral/repairRequestForm/notificationBanner/notificationBanner.css';

/**
 * Componente para mostrar notificaciones en formato banner
 * @param {Object} props
 * @param {Object} props.notification - Objeto con la notificación
 * @param {string} props.notification.message - Mensaje de la notificación
 * @param {string} props.notification.type - Tipo de notificación (success, warning, danger, info)
 */
const NotificationBanner = ({ notification }) => {
  if (!notification) return null;
  
  return (
    <div 
      className={`notification-banner ${notification.type}`}
      role="alert"
    >
      {notification.message}
    </div>
  );
};

export default NotificationBanner; 