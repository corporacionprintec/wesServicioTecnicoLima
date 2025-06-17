import React, { useState, useRef, useEffect } from 'react';
import '../../cssGeneral/osDetail/voiceDictation/voiceDictation.css';

// Detector de dispositivo móvil
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const VoiceDictation = ({ value, onChange, maxLength, placeholder, rows, showToast }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const resultsRef = useRef([]); // Para almacenar resultados previos y detectar duplicados
  const isMobile = useRef(isMobileDevice());
  const timeoutRef = useRef(null);

  // Función para comparar si el texto es casi idéntico (detectar repeticiones)
  const isTextSimilar = (text1, text2) => {
    if (!text1 || !text2) return false;
    
    // Remover espacios extras y convertir a minúsculas para comparación
    const normalizedText1 = text1.trim().toLowerCase();
    const normalizedText2 = text2.trim().toLowerCase();
    
    // Si son idénticos, son similares
    if (normalizedText1 === normalizedText2) return true;
    
    // Calcular similitud usando distancia de Levenshtein simple
    const maxLength = Math.max(normalizedText1.length, normalizedText2.length);
    if (maxLength === 0) return true;
    
    let diffCount = 0;
    for (let i = 0; i < Math.min(normalizedText1.length, normalizedText2.length); i++) {
      if (normalizedText1[i] !== normalizedText2[i]) {
        diffCount++;
      }
    }
    
    // Agregar diferencia por longitud
    diffCount += Math.abs(normalizedText1.length - normalizedText2.length);
    
    // Si la diferencia es menor al 20%, considerar similar
    return (diffCount / maxLength) < 0.2;
  };

  // Función para procesar el texto y evitar repeticiones
  const processTranscript = (newTranscript) => {
    // Si el array de resultados está vacío, simplemente agregar
    if (resultsRef.current.length === 0) {
      resultsRef.current.push(newTranscript);
      return newTranscript;
    }
    
    // Comprobar si el nuevo texto es similar al último procesado
    const lastResult = resultsRef.current[resultsRef.current.length - 1];
    if (isTextSimilar(newTranscript, lastResult)) {
      return null; // Ignorar texto similar
    }
    
    // Limitar el tamaño del array de referencia
    if (resultsRef.current.length > 5) {
      resultsRef.current.shift();
    }
    
    // Agregar el nuevo resultado a la referencia
    resultsRef.current.push(newTranscript);
    return newTranscript;
  };

  // Función para iniciar/detener el reconocimiento de voz
  const toggleListening = () => {
    if (isListening) {
      // Detener el reconocimiento
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }
    
    // Limpiar el array de resultados al iniciar una nueva grabación
    resultsRef.current = [];
    
    // Verificar si el navegador soporta reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      if (showToast) {
        showToast("Tu navegador no soporta reconocimiento de voz", "warning");
      }
      return;
    }
    
    // Crear instancia de reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Configurar el reconocimiento - ajustar para dispositivos móviles
    recognitionRef.current.continuous = isMobile.current ? false : true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'es-ES';
    recognitionRef.current.maxAlternatives = 1;
    
    // En móviles, usar tiempos más cortos para evitar problemas de memoria
    if (isMobile.current) {
      // Reiniciar cada 5 segundos en móviles para evitar problemas
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
          // Pequeña pausa antes de reiniciar
          setTimeout(() => {
            if (isListening) {
              recognitionRef.current.start();
            }
          }, 300);
        }
      }, 6000);
    }
    
    // Evento cuando se detecta un resultado
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Mostrar texto intermedio para feedback al usuario
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
      
      // Solo procesar texto final
      if (finalTranscript) {
        // Procesar el texto para evitar repeticiones
        const processedText = processTranscript(finalTranscript.trim());
        
        if (processedText) {
          setTranscript(processedText);
          
          // Actualizar el valor del campo de texto
          onChange(prev => {
            // Si ya hay texto, agregar un espacio
            if (prev.trim()) {
              return prev + ' ' + processedText;
            }
            return processedText;
          });
        }
      }
    };
    
    // Evento cuando finaliza el reconocimiento
    recognitionRef.current.onend = () => {
      // En dispositivos móviles, reiniciar automáticamente si aún está en modo escucha
      if (isMobile.current && isListening) {
        setTimeout(() => {
          if (isListening && recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 300);
      } else {
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };
    
    // Evento en caso de error
    recognitionRef.current.onerror = (event) => {
      console.error("Error en reconocimiento de voz:", event.error);
      
      // En dispositivos móviles, algunos errores son normales, no mostrar todos
      if (isMobile.current && (event.error === 'no-speech' || event.error === 'aborted')) {
        // Reintentar automáticamente sin notificar al usuario
        setTimeout(() => {
          if (isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Error al reiniciar reconocimiento:", e);
              setIsListening(false);
            }
          }
        }, 300);
        return;
      }
      
      if (showToast) {
        showToast("Error en reconocimiento de voz: " + event.error, "danger");
      }
      
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    
    // Iniciar reconocimiento
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    } catch (error) {
      console.error("Error al iniciar reconocimiento de voz:", error);
      if (showToast) {
        showToast("No se pudo iniciar el reconocimiento de voz", "danger");
      }
    }
  };

  // Limpiar el texto del campo
  const clearText = () => {
    onChange('');
  };
  
  // Limpiar reconocimiento cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="voice-dictation-group">
      <label className="voice-dictation-label">Diagnóstico</label>
      <div className="voice-dictation-controls">
        <button
          type="button"
          className={`voice-dictation-btn${isListening ? ' danger active' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? (
            <>
              <span role="img" aria-label="mic">🎤</span> Detener dictado
            </>
          ) : (
            <>
              <span role="img" aria-label="mic">🎤</span> Dictar por voz
            </>
          )}
        </button>
        <button
          type="button"
          className="voice-dictation-btn"
          onClick={clearText}
          title="Limpiar texto"
        >
          <span role="img" aria-label="trash">🗑️</span> Limpiar texto
        </button>
      </div>
      {isListening && (
        <div className="voice-dictation-feedback border-pulsating">
          <div className="mic-pulse"></div>
          <small>
            {isMobile.current ? (
              "Hablando... (mantener presionado)"
            ) : (
              "Escuchando... " + transcript
            )}
          </small>
        </div>
      )}
      <textarea
        className="voice-dictation-textarea"
        placeholder={placeholder || "Ingrese su diagnóstico o use dictado por voz"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows || 3}
        maxLength={maxLength || 900}
      />
      {maxLength && value.length > (maxLength * 0.75) && (
        <div className={`voice-dictation-remaining${value.length > (maxLength * 0.9) ? ' danger' : ' warning'}`}>
          {maxLength - value.length} caracteres restantes
        </div>
      )}
    </div>
  );
};

export default VoiceDictation; 