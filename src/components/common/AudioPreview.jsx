import React from 'react';
import '../../cssGeneral/repairRequestForm/audioPreview/audioPreview.css';

/**
 * Componente para mostrar y reproducir un audio grabado
 * @param {Object} props
 * @param {string} props.audioURL - URL del audio a reproducir
 * @param {function} props.onRemoveAudio - Función para eliminar el audio
 */
const AudioPreview = ({ audioURL, onRemoveAudio }) => {
  if (!audioURL) return null;
  
  return (
    <div className="audio-preview-container">
      <p className="audio-preview-title">
        <span role="img" aria-label="microphone">🎤</span> Audio adjunto
      </p>
      <audio 
        controls 
        src={audioURL} 
        className="audio-preview-audio"
      />
      <button 
        className="audio-preview-btn"
        onClick={onRemoveAudio}
        type="button"
      >
        <span role="img" aria-label="delete">❌</span> Eliminar audio
      </button>
    </div>
  );
};

export default AudioPreview; 