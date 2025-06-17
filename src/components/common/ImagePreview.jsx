import React from 'react';
import '../../cssGeneral/repairRequestForm/imagePreview/imagePreview.css';

/**
 * Componente para mostrar las imágenes cargadas en el formulario
 * @param {Object} props
 * @param {Array} props.photos - Array de URLs de las fotos a mostrar
 * @param {function} props.onRemovePhoto - Función para eliminar una foto
 */
const ImagePreview = ({ photos, onRemovePhoto }) => {
  if (!photos || photos.length === 0) return null;
  
  return (
    <div className="image-preview-container">
      <p className="image-preview-title">
        <span role="img" aria-label="camera">📷</span> Imágenes adjuntas ({photos.length}/3)
      </p>
      <div className="image-preview-img-row">
        {photos.map((url, index) => (
          <div key={index} className="image-preview-img-wrapper">
            <img 
              src={url} 
              alt={`Foto ${index + 1}`} 
              className="image-preview-img"
            />
            <button 
              className="image-preview-btn"
              onClick={() => onRemovePhoto(index)}
              type="button"
            >
              <span role="img" aria-label="delete">❌</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagePreview; 