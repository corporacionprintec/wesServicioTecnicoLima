import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import eytelImage from '../imagenes/eytel.jpg';
import logoPath from '../imagenes/printec.jpg';
import '../cssGeneral/repairRequestForm/repairRequestForm.css';
import jsPDF from 'jspdf';
import FormPDFGenerator from './OsDetailComponents/FormPDFGenerator';

// Importación de componentes comunes
import NotificationBanner from './common/NotificationBanner';
import CameraCapture from './common/CameraCapture';
import ImagePreview from './common/ImagePreview';
import AudioPreview from './common/AudioPreview';
import SubmitButton from './common/SubmitButton';
import QrVinculador from './common/QrVinculador';
import ErrorBoundary from './common/ErrorBoundary';


const RepairRequestForm = ({ prefillData = {} }) => {

  // Estado para notificaciones fijas en la parte superior
  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);
  
  const showNotification = (message, type = 'danger') => {
    // Asegurarnos de que la notificación anterior se limpie
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    
    // Mostrar la nueva notificación
    setNotification({ message, type });
    
    // Para notificaciones importantes (QR), dar más tiempo
    const timeout = message.includes('CLIENTE') ? 8000 : 5000;
    
    // Guardar referencia al nuevo temporizador
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, timeout);
  };
  const [formData, setFormData] = useState({
    nombreApellido: '',
    telefono: '',
    descripcionProblema: '',
    audioFile: null,
    fotos: [],
    qr_scan: '',
    tipoServicio: '',
    direccion: '',
    fechaHoraServicio: '',
    tecnico_recibio: null,
    lugarAtencion: 'taller' // Valor por defecto: 'taller' o 'tienda'
  });

  // Eliminado: fechaHoraModo y setFechaHoraModo (no se utilizan)

  const [hasCamera, setHasCamera] = useState(true);
  const [hasMicrophone, setHasMicrophone] = useState(true);

  useEffect(() => {
    if (prefillData && Object.keys(prefillData).length > 0) {
      setFormData(prevData => ({
        ...prevData,
        nombreApellido: prefillData.nombreApellido || '',
        telefono: prefillData.telefono || '',
        qr_scan: prefillData.qr_scan || ''
      }));
    }
  }, [prefillData]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const foundCamera = devices.some(device => device.kind === 'videoinput');
          const foundMicrophone = devices.some(device => device.kind === 'audioinput');
          setHasCamera(foundCamera);
          setHasMicrophone(foundMicrophone);
        })
        .catch(error => {
          console.error('Error al enumerar dispositivos:', error);
          setHasCamera(false);
          setHasMicrophone(false);
        });
    } else {
      setHasCamera(false);
      setHasMicrophone(false);
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const telefonoInputRef = useRef(null); // Nuevo ref para el input de teléfono

  const [audioURL, setAudioURL] = useState(null);
  const [photoURLs, setPhotoURLs] = useState([]);
  
  useEffect(() => {
    // Define la función dentro del efecto para evitar dependencias externas
    const createObjectURLs = (files) => {
      return files.map(file => URL.createObjectURL(file));
    };
    const newUrls = createObjectURLs(formData.fotos);
    setPhotoURLs(newUrls);
    // Limpieza al desmontar o cuando cambia la lista de fotos
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [formData.fotos]);

  useEffect(() => {
    if (formData.audioFile) {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      const url = URL.createObjectURL(formData.audioFile);
      setAudioURL(url);
    } else {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
        setAudioURL(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.audioFile]);

  // Limpieza completa al desmontar
  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      // Limpiar temporizador de notificación
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      // Revocar URLs de objetos
      if (photoURLs && photoURLs.length > 0) {
        photoURLs.forEach(url => URL.revokeObjectURL(url));
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      // Asegurar que la cámara esté detenida
      if (videoEl && videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioURL, photoURLs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleTelefonoChange = (e) => {
    const { name, value } = e.target;
    // Guardar en localStorage y actualizar el estado del formulario
    localStorage.setItem('telefonoTemporal', value);
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // 1. Limitar tamaño máximo de imagen y duración de audio
  const MAX_IMAGE_SIZE_MB = 5; // Ahora 5MB por imagen para máxima compatibilidad (igual que el backend)
  const MAX_AUDIO_DURATION_SEC = 15; // 15 segundos de audio

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (formData.fotos.length + files.length > 3) {
      showNotification('Solo puedes subir un máximo de 3 fotos.', 'warning');
      return;
    }

    // Validar tamaño de archivos
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        showNotification(`La imagen "${file.name}" supera el tamaño máximo de ${MAX_IMAGE_SIZE_MB}MB (5MB).`, 'danger');
        return;
      }
    }

    // Optimizar imágenes antes de guardarlas
    const optimizedImages = [];
    let processingCount = files.length;
    
    files.forEach(file => {
      // Solo procesar archivos de imagen
      if (!file.type.startsWith('image/')) {
        processingCount--;
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Configurar dimensiones máximas
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es necesario
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
          
          // Crear canvas para redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a Blob con calidad reducida (70%)
          canvas.toBlob((blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: new Date().getTime()
              });
              
              optimizedImages.push(optimizedFile);
            }
            
            processingCount--;
            // Cuando se han procesado todas las imágenes, actualizar el estado
            if (processingCount === 0) {
              setFormData(prevData => ({
                ...prevData,
                fotos: [...prevData.fotos, ...optimizedImages]
              }));
            }
          }, 'image/jpeg', 0.7); // Calidad del 70% para asegurar <5MB
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAudioRecorded = (audioFile) => {
    const audio = document.createElement('audio');
    audio.src = URL.createObjectURL(audioFile);

    const checkDuration = () => {
      if (audio.duration > MAX_AUDIO_DURATION_SEC) {
        showNotification(`El audio supera la duración máxima de ${MAX_AUDIO_DURATION_SEC} segundos.`, 'danger');
        URL.revokeObjectURL(audio.src);
      } else {
        setFormData(prevData => ({ ...prevData, audioFile }));
        setTimeout(() => URL.revokeObjectURL(audio.src), 1000);
      }
    };

    const validateDuration = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        audio.currentTime = 1e101;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          audio.currentTime = 0;
          checkDuration();
        };
      } else {
        checkDuration();
      }
    };

    audio.onloadedmetadata = validateDuration;
  };

  const handleTakePhoto = async () => {
    if (!hasCamera) return;
    setShowCamera(true);
    try {
      // Detener cualquier stream anterior si existe
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      const constraints = { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      showNotification('No se pudo acceder a la cámara. Por favor, revise los permisos de cámara en su navegador y reintente.', 'warning');
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Establecer un tamaño máximo razonable
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 720;
    
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    // Calcular nuevas dimensiones manteniendo la relación de aspecto
    if (width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / width;
      width = MAX_WIDTH;
      height = height * ratio;
    }
    
    if (height > MAX_HEIGHT) {
      const ratio = MAX_HEIGHT / height;
      height = MAX_HEIGHT;
      width = width * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    // Reducir calidad de la imagen (40%)
    canvas.toBlob((blob) => {
      const file = new File([blob], `foto_${Date.now()}.jpg`, { 
        type: 'image/jpeg', 
        lastModified: Date.now() 
      });
      
      if (formData.fotos.length >= 3) {
        showNotification('Solo puedes subir un máximo de 3 fotos.', 'warning');
        return;
      }
      
      setFormData(prevData => ({ 
        ...prevData, 
        fotos: [...prevData.fotos, file] 
      }));
    }, 'image/jpeg', 0.4); // Reducir calidad al 40% para asegurar <500KB

    handleCloseCamera();
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleRemovePhoto = (index) => {
    // Crear una copia del array de fotos sin la foto eliminada
    const updatedFotos = formData.fotos.filter((_, i) => i !== index);
    // Limpiar la URL correspondiente
    if (photoURLs[index]) {
      URL.revokeObjectURL(photoURLs[index]);
    }
    setFormData(prevData => ({
      ...prevData,
      fotos: updatedFotos
    }));
  };

  const handleRemoveAudio = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setFormData(prevData => ({ ...prevData, audioFile: null }));
  };

  const handleButtonHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 15px 30px rgba(29, 120, 78, 0.3)';
  };

  const handleButtonLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 10px 25px rgba(29, 120, 78, 0.25)';
  };

  // Función para resetear el formulario
  const resetForm = () => {
    // Limpiar URLs antes de resetear
    if (photoURLs && photoURLs.length > 0) {
      photoURLs.forEach(url => URL.revokeObjectURL(url));
    }
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setFormData({
      nombreApellido: '',
      telefono: '',
      descripcionProblema: '',
      audioFile: null,
      fotos: [],
      qr_scan: '',
      tipoServicio: '',
      direccion: '',
      fechaHoraServicio: '',
      tecnico_recibio: formData.tecnico_recibio // Mantener el ID del técnico
    });
    // Limpiar URLs
    setPhotoURLs([]);
    setAudioURL(null);
    // NO limpiar el PDF generado ni el nombre ni la instancia
    // setPdfGenerated(false);
    // setPdfFileName('');
    // setPdfInstance(null);
  };

  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfInstance, setPdfInstance] = useState(null); // Nuevo estado para guardar el PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false); // Nuevo estado para loader de PDF

  // Función para abrir WhatsApp con mensaje y número
  const openWhatsApp = (telefonoLimpio) => {
    // Recibe el número limpio (solo 9 dígitos)
    const mensaje = encodeURIComponent('Estimado cliente, su solicitud ha sido registrada. Adjuntamos el comprobante en PDF. ¡Gracias por confiar en Printec!');
    const url = `https://wa.me/51${telefonoLimpio}?text=${mensaje}`;
    window.open(url, '_blank');
  };

  const handleGeneratePDF = async (formData) => {
    return new Promise((resolve, reject) => {
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 15;
        let y = 30;

        // Logo
        pdf.addImage(logoPath, 'JPEG', margin, 5, 30, 30);

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 255); // Azul
        pdf.text('Formulario de Solicitud', margin, y);
        y += 20;

        // Datos del formulario
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        const fieldsToInclude = ['nombreApellido', 'telefono', 'descripcionProblema'];
        fieldsToInclude.forEach((key) => {
          pdf.text(`${key}: ${formData[key]}`, margin, y);
          y += 10;
        });

        // Mensaje importante
        y += 10;
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(11);
        pdf.setTextColor(220, 53, 69);
        pdf.text(
          '🔔 Importante:\nToda máquina que no sea reclamada dentro de los 10 días calendario posteriores a la notificación de reparación final será considerada en estado de abandono. En tal caso, Printec se reserva el derecho de trasladarla al almacén del área de reciclaje, sin asumir responsabilidad alguna por daños, pérdida de accesorios o piezas.',
          margin,
          y
        );
        y += 30;
        pdf.text(
          '📦 Recomendamos dar seguimiento oportuno a su equipo para evitar inconvenientes.',
          margin,
          y
        );

        // NO descargar automáticamente
        setPdfGenerated(true);
        setPdfFileName('formulario_solicitud.pdf');
        setPdfInstance(pdf); // Guardar la instancia del PDF
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Obtener SIEMPRE el ID del técnico autenticado desde localStorage
    let tecnicoId = formData.tecnico_recibio ? Number(formData.tecnico_recibio) : null;
    if (!tecnicoId) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          tecnicoId = Number(parsedUser.id);
        } catch (e) {
          tecnicoId = null;
        }
      }
    }

    // Crear un objeto con los datos para el PDF, incluyendo etiquetas más descriptivas
    const pdfData = {
      nombreApellido: formData.nombreApellido,
      telefono: formData.telefono,
      descripcionProblema: formData.descripcionProblema,
      fechaIngreso: new Date().toLocaleDateString('es-PE')
    };
    // PDF generation with error handling
    try {
      await new Promise((resolve, reject) => {
        try {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 20;
          let y = 40;

          // Colores definidos
          const primaryBlue = [0, 48, 135];
          const lightBlue = [230, 240, 255];
          const darkGray = [64, 64, 64];
          const redAlert = [220, 53, 69];

          // Header con fondo azul
          pdf.setFillColor(...lightBlue);
          pdf.rect(0, 0, pageWidth, 50, 'F');

          // Logo
          try {
            pdf.addImage(logoPath, 'JPEG', margin, 8, 35, 35);
          } catch (error) {
            console.warn('No se pudo cargar el logo:', error);
          }

          // Título principal
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(20);
          pdf.setTextColor(...primaryBlue);
          pdf.text('FORMULARIO DE SOLICITUD', margin + 45, 25);

          // Subtítulo
          pdf.setFontSize(12);
          pdf.setTextColor(...darkGray);
          pdf.text('Datos del Cliente y Equipo', margin + 45, 35);

          // Línea separadora
          pdf.setDrawColor(...primaryBlue);
          pdf.setLineWidth(1);
          pdf.line(margin, 55, pageWidth - margin, 55);

          y = 75;

          // Título de sección
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(...primaryBlue);
          pdf.text('INFORMACIÓN DEL CLIENTE', margin, y);
          y += 15;

          // Datos del formulario con formato mejorado
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          
          Object.entries(pdfData).forEach(([key, value], index) => {
            // Verificar si necesitamos nueva página
            if (y > pageHeight - 80) {
              pdf.addPage();
              y = 30;
            }

            // Fondo alternado para cada campo
            if (index % 2 === 0) {
              pdf.setFillColor(248, 249, 250);
              pdf.rect(margin - 5, y - 8, pageWidth - 2 * margin + 10, 14, 'F');
            }

            // Formatear la etiqueta del campo
            const formatLabel = (label) => {
              const labelMap = {
                'nombreApellido': 'Nombre y Apellido',
                'telefono': 'Teléfono',
                'email': 'Email',
                'direccion': 'Dirección',
                'tipoEquipo': 'Tipo de Equipo',
                'marca': 'Marca',
                'modelo': 'Modelo',
                'serie': 'Número de Serie',
                'descripcionProblema': 'Descripción del Problema',
                'fechaIngreso': 'Fecha de Ingreso',
                'tecnicoAsignado': 'Técnico Asignado'
              };
              return labelMap[label] || label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
            };

            // Etiqueta del campo en azul
            pdf.setTextColor(...primaryBlue);
            pdf.setFont('helvetica', 'bold');
            const labelText = formatLabel(key);
            pdf.text(`${labelText}:`, margin, y);

            // Valor del campo
            pdf.setTextColor(...darkGray);
            pdf.setFont('helvetica', 'normal');
            const valueText = String(value || 'No especificado');
            
            // Calcular ancho disponible para el valor
            const labelWidth = pdf.getTextWidth(`${labelText}: `);
            const maxWidth = pageWidth - margin - labelWidth - 10;
            
            const lines = pdf.splitTextToSize(valueText, maxWidth);
            
            if (lines.length > 1) {
              pdf.text(lines[0], margin + labelWidth + 5, y);
              for (let i = 1; i < lines.length; i++) {
                y += 6;
                pdf.text(lines[i], margin + labelWidth + 5, y);
              }
            } else {
              pdf.text(valueText, margin + labelWidth + 5, y);
            }
            
            y += 16;
          });

          // Espaciado antes del mensaje importante
          y += 20;

          // Verificar espacio para el mensaje importante
          if (y > pageHeight - 120) {
            pdf.addPage();
            y = 30;
          }

          // Caja de mensaje importante
          const boxHeight = 90;
          pdf.setFillColor(255, 248, 248);
          pdf.setDrawColor(...redAlert);
          pdf.setLineWidth(2);
          pdf.rect(margin - 5, y - 10, pageWidth - 2 * margin + 10, boxHeight, 'FD');

          // Título del mensaje importante
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(...redAlert);
          pdf.text('AVISO IMPORTANTE', margin, y);
          y += 15;

          // Contenido del mensaje
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          
          const importantText = 'Toda máquina que no sea reclamada dentro de los 10 días calendario posteriores a la notificación de reparación final será considerada en estado de abandono. En tal caso, Printec se reserva el derecho de trasladarla al almacén del área de reciclaje, sin asumir responsabilidad alguna por daños, pérdida de accesorios o piezas.';
          
          const textLines = pdf.splitTextToSize(importantText, pageWidth - 2 * margin - 10);
          pdf.text(textLines, margin, y);
          y += textLines.length * 5 + 10;

          // Recomendación
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(...primaryBlue);
          pdf.text('RECOMENDACIÓN:', margin, y);
          y += 8;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          const recomendacionText = 'Recomendamos dar seguimiento oportuno a su equipo para evitar inconvenientes.';
          const recomendacionLines = pdf.splitTextToSize(recomendacionText, pageWidth - 2 * margin - 10);
          pdf.text(recomendacionLines, margin, y);

          // Footer
          const footerY = pageHeight - 25;
          pdf.setFillColor(...lightBlue);
          pdf.rect(0, footerY - 5, pageWidth, 30, 'F');
          
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.setTextColor(...primaryBlue);
          pdf.text('Printec - Servicio Técnico Especializado', margin, footerY + 5);
          
          const dateText = `Generado el: ${new Date().toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;
          const dateWidth = pdf.getTextWidth(dateText);
          pdf.text(dateText, pageWidth - margin - dateWidth, footerY + 5);

          // NO descargar automáticamente
          setPdfGenerated(true);
          setPdfFileName(`formulario_solicitud_${new Date().toISOString().split('T')[0]}.pdf`);
          setPdfInstance(pdf); // Guardar la instancia del PDF
          
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      showNotification('Error al generar el PDF', 'danger');
      setLoading(false);
      return;
    }
    // Continue with form submission
    try {
      // Separamos el nombre y apellido
      const nameParts = formData.nombreApellido.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Extraemos solo los dígitos del teléfono
      let telefonoFormateado = formData.telefono.replace(/\D/g, '');
      if (telefonoFormateado.length > 9) {
        telefonoFormateado = telefonoFormateado.slice(-9);
      }

      let imagenesLinks = null;
      if (formData.fotos.length > 0) {
        const photosFormData = new FormData();
        formData.fotos.forEach((foto) => {
          // Cambiamos el nombre del campo a 'files' que es probablemente lo que espera el servidor
          photosFormData.append('files', foto);
        });

        const uploadResponse = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/upload/photos', {
          method: 'POST',
          body: photosFormData
        });

        if (!uploadResponse.ok) throw new Error('Error al subir las fotos');

        const uploadResult = await uploadResponse.json();
        imagenesLinks = JSON.stringify(uploadResult.uploadedFiles.map(file => file.webViewLink));
      }
      const mainFormData = new FormData();
      mainFormData.append('nombre', firstName);
      mainFormData.append('apellido', lastName);
      mainFormData.append('telefono', telefonoFormateado);
      mainFormData.append('descripcion_problema', formData.descripcionProblema);
      mainFormData.append('tipo_dispositivo', '');
      mainFormData.append('otro_dispositivo', '');
      mainFormData.append('marca', '');
      mainFormData.append('modelo', '');
      mainFormData.append('qr_scan', formData.qr_scan);
      // Agregar tecnico_recibio al crear la orden (permitir 0 como valor válido)
      // if (tecnicoId !== null && tecnicoId !== undefined) mainFormData.append('tecnico_recibio', tecnicoId);
      // NO agregar dispositivo aquí, solo en la vinculación QR
      if (formData.audioFile) mainFormData.append('audio', formData.audioFile);
      if (imagenesLinks) mainFormData.append('imagenes', imagenesLinks);
      mainFormData.append('tipoServicio', formData.tipoServicio);
      const response = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/ordenes', {
        method: 'POST',
        body: mainFormData
      });
      // Debug: Ver contenido del FormData
      console.log('[DEBUG] Contenido del FormData:');
      for (let [key, value] of mainFormData.entries()) {
        console.log(`${key}: ${value}`);
      }
      if (response.ok) {
        const responseData = await response.json();
        // LOG DETALLADO: mostrar toda la respuesta del backend
        console.log('[DEBUG] Respuesta completa del backend:', responseData);
        // Mostrar todos los posibles IDs
        console.log('[DEBUG] IDs posibles en la respuesta:', {
          dispositivo_id: responseData.data?.dispositivo?.id,
          id: responseData.data?.id,
          dispositivo_id_flat: responseData.data?.dispositivo_id,
          orden_dispositivo_id: responseData.data?.orden?.dispositivo_id,
          orden_id: responseData.data?.orden?.id,
          orden_id_flat: responseData.data?.orden_id,
          ordenId: responseData.data?.ordenId
        });
        const ticketNumber = responseData.data?.ticket || 'OS-PENDIENTE';
        showNotification(`✅ Solicitud enviada con éxito. Ticket: ${ticketNumber}`, 'success');
        // --- VINCULAR QR Y TÉCNICO AQUÍ ---
        // Buscar el ID del dispositivo en varias ubicaciones posibles
        let dispositivoIdCreado = responseData.data?.dispositivo?.id
          || responseData.data?.dispositivo_id
          || responseData.data?.dispositivo_id_flat
          || responseData.data?.orden?.dispositivo_id
          || null;
        if (!dispositivoIdCreado && responseData.data?.orden?.id) {
          // Si solo tenemos el ID de la orden, intentar obtener el dispositivo real
          try {
            const ordenId = responseData.data.orden.id;
            console.log('[DEBUG] Haciendo fetch adicional para obtener el dispositivo de la orden:', ordenId);
            const ordenResp = await fetch(`https://servidorserviciotecnicolima-production.up.railway.app/ordenes/${ordenId}`);
            const ordenData = await ordenResp.json();
            console.log('[DEBUG] Respuesta de la orden:', ordenData);
            dispositivoIdCreado = ordenData?.data?.dispositivo?.id || null;
            console.log('[DEBUG] ID de dispositivo obtenido por fetch adicional:', dispositivoIdCreado);
          } catch (err) {
            console.error('[ERROR] No se pudo obtener el dispositivo de la orden:', err);
          }
        }
        if (!dispositivoIdCreado) {
          console.error('[ERROR] No se encontró el ID del dispositivo en la respuesta ni en la orden:', responseData);
        }
        const qrScanReal = responseData.data?.dispositivo?.qr_scan || formData.qr_scan;
        // Obtener SIEMPRE el técnico autenticado para la vinculación QR
        let tecnicoRecibioIdFinal = formData.tecnico_recibio ? Number(formData.tecnico_recibio) : null;
        // Si no se vinculó QR, no se envía tecnico_recibio
        console.log('[DEBUG] handleSubmit - tecnicoRecibioIdFinal:', tecnicoRecibioIdFinal, 'dispositivoIdCreado:', dispositivoIdCreado, 'qrScanReal:', qrScanReal);
        // Si existe un técnico autenticado (por vinculación QR) y dispositivo, asociarlo como tecnico_recibio
        if (dispositivoIdCreado && tecnicoRecibioIdFinal) {
          try {
            const payload = {
              qr_scan: qrScanReal,
              tecnico_recibio: tecnicoRecibioIdFinal,
              tipo_servicio: formData.tipoServicio
            };
            console.log('[VINCULACIÓN QR FINAL] Enviando payload:', payload);
            const vincularResponse = await fetch(`https://servidorserviciotecnicolima-production.up.railway.app/dispositivoscanup/${dispositivoIdCreado}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const vincularResult = await vincularResponse.json().catch(() => ({}));
            console.log('[VINCULACIÓN QR FINAL] Respuesta backend:', vincularResponse.status, vincularResult);
            if (vincularResponse.ok) {
              showToast('QR y técnico vinculados correctamente al dispositivo', 'success');
            } else {
              showToast('Error al vincular el QR/técnico al dispositivo', 'danger');
            }
          } catch (err) {
            console.error('[VINCULACIÓN QR FINAL] Error:', err);
            showToast('Error durante la vinculación del QR/técnico', 'danger');
          }
        } else if (dispositivoIdCreado) {
          // Si solo hay dispositivo y NO hay técnico (no se vinculó QR), solo actualizar el QR si corresponde
          if (qrScanReal) {
            try {
              const payload = {
                qr_scan: qrScanReal,
                tipo_servicio: formData.tipoServicio
              };
              console.log('[VINCULACIÓN QR SOLO QR] Enviando payload:', payload);
              const vincularResponse = await fetch(`https://servidorserviciotecnicolima-production.up.railway.app/dispositivoscanup/${dispositivoIdCreado}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const vincularResult = await vincularResponse.json().catch(() => ({}));
              console.log('[VINCULACIÓN QR SOLO QR] Respuesta backend:', vincularResponse.status, vincularResult);
              if (vincularResponse.ok) {
                showToast('QR vinculado correctamente al dispositivo', 'success');
              } else {
                showToast('Error al vincular el QR al dispositivo', 'danger');
              }
            } catch (err) {
              console.error('[VINCULACIÓN QR SOLO QR] Error:', err);
              showToast('Error durante la vinculación del QR', 'danger');
            }
          } else {
            // No hay QR ni técnico, no hacer nada
            console.warn('[DEBUG] No se realizó la vinculación QR/técnico porque falta tecnicoRecibioIdFinal y qrScanReal');
          }
        } else {
          console.warn('[DEBUG] No se realizó la vinculación QR/técnico porque falta dispositivoIdCreado');
        }
        resetForm();
        setLoading(false);
      } else {
        showNotification('❌ Error al enviar la solicitud.', 'danger');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error en el envío:', error);
      // Mostrar el mensaje de error real en el alert
      let errorMsg = '❌ Error de conexión con el servidor.';
      if (error && error.message) {
        errorMsg += `\nDetalle: ${error.message}`;
      }
      if (error && error.stack) {
        // Log completo en consola para depuración
        console.error('Stack trace:', error.stack);
      }
      showNotification(errorMsg, 'danger');
      setLoading(false);
    }
  };

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [machineHistory, setMachineHistory] = useState(null);
  const [selectedTipoServicio, setSelectedTipoServicio] = useState('');
  const [canVincular, setCanVincular] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModelInput, setShowModelInput] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [dniTecnico, setDniTecnico] = useState('');
  const [dispositivoId, setDispositivoId] = useState(null);

  // Nuevo estado para guardar el técnico que vinculó el QR (solo nombre y apellido)
  const [tecnicoRecibioVinculacion, setTecnicoRecibioVinculacion] = useState('');
  // Nuevo estado para guardar el ID del técnico que vinculó el QR
  const [tecnicoRecibioVinculacionId, setTecnicoRecibioVinculacionId] = useState(null);
  // Nuevo estado para guardar info de cliente registrado tras vincular QR
  const [clienteRegistradoInfo, setClienteRegistradoInfo] = useState(null);

  const showToast = (msg, variant) => showNotification(msg, variant);
  // Cambia handleVincularQR para guardar la información del técnico y QR
  const handleVincularQR = async () => {
    // Obtener información del técnico del localStorage
    const storedUser = localStorage.getItem('currentUser');
    let tecnicoRecibioId = null;
    let tecnicoNombre = '';
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        tecnicoRecibioId = Number(parsedUser.id); // Convertir el ID a número
        tecnicoNombre = `${parsedUser.name || ''} ${parsedUser.lastname || ''}`.trim();
      } catch (e) {
        console.error('Error al obtener datos del técnico:', e);
      }
    }
    // Validar el QR con el servidor para saber si es cliente registrado
    let infoCliente = null;
    if (qrResult?.data) {
      const validacionServidor = await validarQRConServidor(qrResult.data);
      if (validacionServidor?.valid && validacionServidor?.data) {
        // Si el backend retorna info de cliente, úsala
        infoCliente = validacionServidor.data.cliente
          ? { registrado: true, nombre: validacionServidor.data.cliente.nombre }
          : { registrado: false };
      } else {
        infoCliente = { registrado: false };
      }
    }
    setClienteRegistradoInfo(infoCliente); // Guardar info para mostrar alerta
    // Actualizar el estado del formulario con el QR y tipo de servicio
    setFormData(prev => ({
      ...prev,
      qr_scan: qrResult?.data || '',
      tipoServicio: selectedTipoServicio || '',
      tecnico_recibio: tecnicoRecibioId // Guardar el ID del técnico
    }));
    // Guardar el ID del técnico que vinculó el QR
    setTecnicoRecibioVinculacionId(tecnicoRecibioId);
    // Guardar el nombre para mostrar en la UI
    setTecnicoRecibioVinculacion(tecnicoNombre);
    setShowQrModal(false);
  };

  // Función para validar QR con el servidor
  const validarQRConServidor = async (qrCode) => {
    try {
      console.log('[DEBUG] Validando QR con servidor:', qrCode);
      const response = await fetch(`https://servidorserviciotecnicolima-production.up.railway.app/api/dispositivos/validar-qr?qr=${encodeURIComponent(qrCode)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[DEBUG] Respuesta del servidor:', data);
      return data;
    } catch (error) {
      console.error('[ERROR] Error al validar QR:', error);
      showNotification('Error al validar el QR. Verifica tu conexión o inténtalo nuevamente.', 'error');
      return null;
    }
  };

  // Manejar la respuesta del QR y autocompletar datos
  useEffect(() => {
    const procesarQR = async () => {
      if (qrResult?.data) {
        const validacionServidor = await validarQRConServidor(qrResult.data);
        if (validacionServidor?.valid && validacionServidor?.data) {
          const dispositivos = Array.isArray(validacionServidor.data) 
            ? validacionServidor.data 
            : [validacionServidor.data];
          
          if (dispositivos.length > 0) {
            const dispositivo = dispositivos[0];
            
            if (dispositivo.nombre && dispositivo.apellido) {
              setFormData(prev => {
                const newData = {
                  ...prev,
                  nombreApellido: `${dispositivo.nombre} ${dispositivo.apellido}`.trim(),
                  telefono: dispositivo.telefono || '',
                  qr_scan: qrResult.data
                };
                return newData;
              });
              setClienteRegistradoInfo({ registrado: true, nombre: `${dispositivo.nombre} ${dispositivo.apellido}`.trim() });
              showNotification('📱 CLIENTE YA REGISTRADO\nLos datos se han autocompletado. Por favor seleccione el lugar de atención.', 'success');
            } else {
              setFormData(prev => ({
                ...prev,
                qr_scan: qrResult.data
              }));
              setClienteRegistradoInfo({ registrado: false });
              showNotification('🆕 CLIENTE NUEVO\nPor favor complete los datos del cliente y seleccione el lugar de atención.', 'info');
            }
          }
        }
      }
    };
    if (qrResult) {
      procesarQR();
    }
  }, [qrResult]);

  // Definir la función para cerrar el modal QR
  const handleCloseQrModal = () => setShowQrModal(false);

  // Wrap the main return in ErrorBoundary
  return (
    <ErrorBoundary>
      <div className="repair-form-bg">
        {/* Usar el componente NotificationBanner in lugar de crear el div directamente */}
        <NotificationBanner notification={notification} />
        <div>
          <div className="repair-form-card">
            {/* Hero Section */}
            <div>
              <div className="repair-form-card-img-top">
                <img 
                  src={eytelImage}
                  alt="Servicio Técnico Eytel"
                  className="repair-form-hero-img"
                />
              </div>
              <div className="repair-form-hero-overlay">
                <div className="repair-form-hero-title">
                  <h1>
                    <span className="repair-form-hero-icon">🏭</span> 
                    <Link to="/login" className="repair-form-hero-link">
                      PRINTEC
                    </Link> 
                   
                  </h1>
                  <p className="repair-form-hero-desc">
                    Formulario de Solicitud de Reparación
                  </p>
                </div>
              </div>
            </div>
            <div className="repair-form-card-body">
              <div className="repair-form-p-4">
                <form onSubmit={handleSubmit} className="needs-validation">
                  <div className="repair-form-row">
                    {/* Información Personal */}
                    <div className="repair-form-col-lg-6">
                      <div>
                        <h4 className="repair-form-section-title">
                          <span className="repair-form-section-icon">👤</span>
                          <span>Información Personal</span>
                        </h4>
                        <div>
                          <label className="repair-form-form-label">
                            <span role="img" aria-label="user">👤</span> 
                            Nombre y Apellido
                          </label>
                          <input
                            type="text"
                            className="repair-form-input"
                            name="nombreApellido"
                            value={formData.nombreApellido}
                            placeholder="Ej: Juan Pérez"
                            onChange={handleChange}
                            required
                            disabled={!!(qrResult && qrResult.deviceId)}
                          />
                        </div>
                        <div>
                          <label className="repair-form-form-label">
                            <span role="img" aria-label="phone">📞</span> 
                            Teléfono
                            <span className="repair-form-label-hint">(ej: +51 123456789)</span>
                          </label>
                          <input
                            type="tel"
                            className="repair-form-input"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleTelefonoChange}
                            placeholder="Ej: +51 123456789"
                            required
                            ref={telefonoInputRef}
                            disabled={!!(qrResult && qrResult.deviceId)}
                          />
                          {/* Botón para descargar el PDF si está generado */}
                          {(pdfGenerated && pdfInstance) && (
                            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 8 }}>
                              <button
                                type="button"
                                onClick={async e => {
                                  e.preventDefault();
                                  setDownloadingPdf(true);
                                  try {
                                    // Usar un contador localStorage para el nombre del PDF
                                    let contador = Number(localStorage.getItem('pdfContador') || '0') + 1;
                                    localStorage.setItem('pdfContador', contador);
                                    const fecha = new Date().toISOString().split('T')[0];
                                    const fileName = `formulario${contador}-${fecha}.pdf`;
                                    await pdfInstance.save(fileName);
                                    showNotification(`PDF descargado correctamente como ${fileName}.`, 'success');
                                  } catch (err) {
                                    showNotification('Error al descargar el PDF.', 'danger');
                                  } finally {
                                    setDownloadingPdf(false);
                                  }
                                }}
                                style={{
                                  fontWeight: 600,
                                  backgroundColor: '#0c71a6',
                                  color: 'white',
                                  border: 'none',
                                  padding: '12px 24px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  opacity: 1,
                                  width: 'auto',
                                  minWidth: 0
                                }}
                                disabled={downloadingPdf}
                              >
                                {downloadingPdf ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span className="loader" style={{ width: 18, height: 18, border: '3px solid #fff', borderTop: '3px solid #0c71a6', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                                    Descargando...
                                  </span>
                                ) : (
                                  'Descargar PDF'
                                )}
                              </button>
                              <style>{`
                                @keyframes spin {
                                  0% { transform: rotate(0deg); }
                                  100% { transform: rotate(360deg); }
                                }
                              `}</style>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'none' }}>
                          <input
                            type="text"
                            className="repair-form-input"
                            name="qr_scan"
                            value={formData.qr_scan}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Descripción, Audio y Fotos */}
                    <div className="repair-form-col-lg-6">
                      <div>
                        <h4 className="repair-form-section-title">
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'not-allowed', // Desactivado visualmente
                              fontSize: '1.2em',
                              marginRight: 8,
                              opacity: 0.4 // Visualmente deshabilitado
                            }}
                            title="Vincular QR de la máquina (desactivado temporalmente)"
                            onClick={() => {}}
                            disabled
                          >
                            🛠️
                          </button>
                          <span>Descripción del Problema</span>
                        </h4>
                        <div>
                          <textarea
                            className="repair-form-input"
                            name="descripcionProblema"
                            value={formData.descripcionProblema}
                            onChange={handleChange}
                            rows="4"
                            required
                            placeholder="Indique la marca de su equipo y describa el problema..."
                          ></textarea>
                        </div>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          <button
                            type="button"
                            className="repair-form-btn shadow-sm"
                            style={{
                              borderRadius: '10px',
                              padding: '10px 15px',
                              backgroundColor: '#f59e42',
                              color: 'white',
                              border: 'none',
                              transition: 'all 0.2s ease',
                              opacity: 1, // ACTIVADO
                              cursor: 'pointer' // ACTIVADO
                            }}
                            onClick={() => setShowQrModal(true)}
                          >
                            <span role="img" aria-label="qr">� QR</span> Escanear QR
                          </button>
                          <button
                            type="button"
                            className="repair-form-btn shadow-sm"
                            style={{ 
                              borderRadius: '10px',
                              padding: '10px 15px',
                              backgroundColor: '#1d784e',
                              color: 'white',
                              border: 'none',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={handleTakePhoto}
                            disabled={!hasCamera}
                          >
                            <span role="img" aria-label="camera">📷</span> Tomar foto
                          </button>
                          <button
                            type="button"
                            className="repair-form-btn shadow-sm"
                            style={{ 
                              borderRadius: '10px',
                              padding: '10px 15px',
                              backgroundColor: '#0c71a6',
                              color: 'white',
                              border: 'none',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          >
                            <span role="img" aria-label="upload">⬆️</span> Subir imagen
                          </button>
                        </div>
                        
                        {!hasMicrophone && (
                          <div className="repair-form-alert mt-2 py-2" style={{ 
                            borderRadius: '10px', 
                            fontSize: '0.9rem',
                            backgroundColor: 'rgba(41, 128, 185, 0.15)',
                            border: '1px solid #1c6c99',
                            color: '#15557a'
                          }}>
                            <span role="img" aria-label="microphone">🎤</span> No se detectó un micrófono. Por favor, conecte uno y reintente.
                          </div>
                        )}
                        
                        {!hasCamera && (
                          <div className="repair-form-alert mt-2 py-2" style={{ 
                            borderRadius: '10px', 
                            fontSize: '0.9rem',
                            backgroundColor: 'rgba(41, 128, 185, 0.15)',
                            border: '1px solid #1c6c99',
                            color: '#15557a'
                          }}>
                            <span role="img" aria-label="camera">📷</span> No se detectó una cámara. Por favor, conecte una y reintente.
                          </div>
                        )}
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                          accept="image/*"
                          multiple
                        />
                        
                        {/* Usar componente CameraCapture en lugar del div anterior */}
                        <CameraCapture
                          showCamera={showCamera}
                          onCapturePhoto={handleCapturePhoto}
                          onCloseCamera={handleCloseCamera}
                          videoRef={videoRef}
                          canvasRef={canvasRef}
                        />
                        
                        {/* Usar componente ImagePreview en lugar del div anterior */}
                        <ImagePreview
                          photos={photoURLs}
                          onRemovePhoto={handleRemovePhoto}
                        />
                        
                        {/* Usar componente AudioPreview en lugar del div anterior */}
                        <AudioPreview
                          audioURL={audioURL}
                          onRemoveAudio={handleRemoveAudio}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Move the button row immediately after the last form field, with no extra margin or padding */}
                  <div className="repair-form-row justify-content-center align-items-center" style={{marginTop: 0, paddingTop: 0, paddingBottom: 0}}>
                    <div
                      className="d-flex flex-row justify-content-center align-items-center repair-form-btn-row-responsive"
                      style={{gap: '16px', width: '100%'}}
                    >
                      <SubmitButton
                        text="Enviar Solicitud"
                        loading={loading}
                        onMouseOver={handleButtonHover}
                        onMouseOut={handleButtonLeave}
                      />
                      {/* Botón WhatsApp siempre habilitado, nunca bloqueado */}
                      <button
                        onClick={e => {
                          e.preventDefault();
                          // Obtener el teléfono más reciente
                          let telefonoInput = localStorage.getItem('telefonoTemporal') || telefonoInputRef.current?.value || '';
                          const telefonoLimpio = telefonoInput.replace(/\D/g, '').slice(-9);
                          if (!/^\d{9}$/.test(telefonoLimpio)) {
                            showNotification('Ingrese un número de teléfono peruano válido (9 dígitos).', 'warning');
                            return;
                          }
                          const mensaje = encodeURIComponent('Estimado cliente, su solicitud ha sido registrada. Adjuntamos el comprobante en PDF. ¡Gracias por confiar en Printec!');
                          const url = `https://wa.me/51${telefonoLimpio}?text=${mensaje}`;
                          window.open(url, '_blank');
                          showNotification('En WhatsApp, adjunte el archivo PDF manualmente junto con el mensaje.', 'info');
                        }}
                        className="whatsapp-button"
                        style={{
                          fontWeight: 600,
                          backgroundColor: '#25D366',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: 1,
                          width: 'auto',
                          minWidth: 0
                        }}
                        type="button"
                        title="Enviar mensaje por WhatsApp al cliente"
                      >
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M17.6 6.3C16.2 5 14.3 4.2 12.3 4.2C8.3 4.2 5.1 7.4 5.1 11.4C5.1 12.7 5.5 14 6.1 15.1L5 19L9 17.9C10.1 18.5 11.2 18.8 12.3 18.8H12.4C16.3 18.8 19.6 15.6 19.6 11.5C19.5 9.5 18.8 7.6 17.6 6.3ZM12.3 17.5L12.2 17.5C11.2 17.5 10.2 17.2 9.4 16.7L9.2 16.6L6.9 17.2L7.5 15L7.3 14.7C6.7 13.8 6.4 12.6 6.4 11.4C6.4 8 9 5.4 12.4 5.4C14 5.4 15.6 6 16.8 7.1C17.9 8.3 18.5 9.8 18.5 11.4C18.4 14.8 15.8 17.5 12.3 17.5ZM15.1 13.1C14.9 13 14.2 12.7 14 12.7C13.8 12.6 13.7 12.5 13.5 12.8C13.4 13 13.1 13.3 13 13.4C12.9 13.6 12.8 13.6 12.6 13.5C12.4 13.4 11.9 13.2 11.4 12.7C11 12.3 10.7 11.9 10.5 11.7C10.4 11.5 10.5 11.4 10.6 11.3C10.6 11.2 10.7 11.1 10.8 11C10.9 10.9 10.9 10.8 10.9 10.7C11 10.6 10.9 10.5 10.9 10.4C10.9 10.3 10.6 9.6 10.4 9.3C10.3 8.9 10.1 9 10 9C9.9 9 9.8 9 9.7 9C9.5 9 9.4 9 9.3 9.2C9.1 9.4 8.8 9.7 8.8 10.4C8.8 11.1 9.3 11.8 9.4 11.9C9.5 12 10.6 13.8 12.2 14.4C12.7 14.6 13.1 14.7 13.4 14.8C13.8 14.9 14.2 14.9 14.5 14.9C14.8 14.8 15.4 14.6 15.6 14.2C15.8 13.8 15.8 13.5 15.7 13.4C15.6 13.2 15.3 13.2 15.1 13.1Z" />
                        </svg>
                        Recibo a Cliente
                      </button>
                    </div>
                  </div>
                  {/* Mostrar el técnico que vinculó el QR si hay QR */}
                  {formData.qr_scan && tecnicoRecibioVinculacion && (
                    <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 700, color: '#222', background: '#fff36b', display: 'inline-block', padding: '4px 12px', borderRadius: '6px', fontSize: '1.1em' }}>
                      Recibió: {tecnicoRecibioVinculacion.toUpperCase()}
                    </div>
                  )}

                  {/* Responsive styles for button row */}
                  <style>{`
                    @media (max-width: 600px) {
                      .repair-form-btn-row-responsive {
                        flex-direction: column !important;
                        gap: 12px !important;
                        align-items: stretch !important;
                      }
                      .repair-form-btn-row-responsive > * {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 100% !important;
                      }
                    }
                  `}</style>
                </form>
              </div>
            </div>
          </div>
        </div>
        {showQrModal && (
          <div className="modal is-active" style={{ zIndex: 9999 }}>
            <div className="modal-background" onClick={handleCloseQrModal}></div>
            <div className="modal-card" style={{ maxWidth: 500, margin: 'auto' }}>
              <header className="modal-card-head">
                <p className="modal-card-title">Vincular QR de la máquina</p>
                <button className="delete" aria-label="close" onClick={handleCloseQrModal}></button>
              </header>
              <section className="modal-card-body">
                <QrVinculador
                  qrResult={qrResult}
                  setQrResult={setQrResult}
                  machineHistory={machineHistory}
                  setMachineHistory={setMachineHistory}
                  dniTecnico={dniTecnico}
                  showToast={showToast}
                  hasCamera={hasCamera}
                  allDataOfCurrentRequest={{}}
                  selectedTipoServicio={selectedTipoServicio}
                  setSelectedTipoServicio={setSelectedTipoServicio}
                  canVincular={canVincular}
                  setCanVincular={setCanVincular}
                  isUpdating={isUpdating}
                  handleVincularQR={handleVincularQR}
                  showHistory={showHistory}
                  setShowHistory={setShowHistory}
                  setShowModelInput={setShowModelInput}
                  setShowLocationModal={setShowLocationModal}
                  autoStartCamera={showQrModal}
                  clienteRegistradoInfo={clienteRegistradoInfo}
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default RepairRequestForm;
