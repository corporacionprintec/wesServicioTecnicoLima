import React, { useState } from "react";
import '../../cssGeneral/osDetail/problemDescriptionCard/problemDescriptionCard.css';

// Función auxiliar para extraer el ID de un enlace de Google Drive
const extractFileIdFromUrl = (url) => {
  const regex = /\/file\/d\/([^/]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const ProblemDescriptionCard = ({ 
  problema, 
  audio, 
  audio_id, 
  imagenes 
}) => {
  const [showAllImages, setShowAllImages] = useState(false);
  
  const imagenesArray = imagenes ? (() => {
    try {
      return JSON.parse(imagenes);
    } catch (error) {
      console.error("Error al parsear imagenes:", error);
      return [];
    }
  })() : [];
  
  return (
    <div className="pdc-card">
      <div className="pdc-card-header">
        <h5 className="pdc-card-title">Descripción del Problema</h5>
      </div>
      <div className="pdc-card-body">
        <p>{problema || "Sin descripción"}</p>
        
        {audio && (
          <div style={{ marginTop: '1.2em' }}>
            <h6 className="pdc-img-title">Audio Descriptivo:</h6>
            <iframe 
              src={`https://drive.google.com/file/d/${audio_id}/preview`} 
              width="100%" 
              height="80" 
              allow="autoplay"
              style={{ borderRadius: '8px', border: 'none' }}
              title="Audio descriptivo"
            ></iframe>
          </div>
        )}
        
        {imagenesArray.length > 0 && (
          <div style={{ marginTop: '1.2em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7em' }}>
              <h6 className="pdc-img-title">Imágenes:</h6>
              {imagenesArray.length > 1 && (
                <button 
                  className="pdc-btn" 
                  onClick={() => setShowAllImages(!showAllImages)}
                >
                  {showAllImages ? "Mostrar menos" : `Ver todas (${imagenesArray.length})`}
                </button>
              )}
            </div>
            
            {imagenesArray.slice(0, showAllImages ? imagenesArray.length : 1).map((url, index) => {
              const fileId = url.match(/\/file\/d\/([^\/]+)\//)?.[1];
              const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
              
              return (
                <div key={index} style={{ marginBottom: '1.2em' }}>
                  <button 
                    className="pdc-btn-link"
                    onClick={() => window.open(fileId ? `https://drive.google.com/file/d/${fileId}/view` : url, "_blank")}
                  >
                    <small>Imagen {index + 1} (click para abrir en nueva pestaña)</small>
                  </button>
                  <iframe
                    src={previewUrl}
                    width="100%"
                    height="300px"
                    style={{ border: "none", borderRadius: "8px" }}
                    allow="autoplay"
                    title={`Imagen ${index + 1}`}
                    loading="lazy"
                  ></iframe>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProblemDescriptionCard); 