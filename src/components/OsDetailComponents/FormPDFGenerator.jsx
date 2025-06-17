import React, { useState } from 'react';
import jsPDF from 'jspdf';
import logoPath from '../../imagenes/printec.jpg';
import '../../cssGeneral/osDetail/receiptGenerator/receiptGenerator.css';

const FormPDFGenerator = ({ formData, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [telefonoActual, setTelefonoActual] = useState(formData.telefono || '');

  // Guardar el teléfono en localStorage cada vez que cambie el input en el DOM
  React.useEffect(() => {
    const handler = () => {
      const telefonoInput = document.querySelector('input[name="telefono"]');
      if (telefonoInput) {
        setTelefonoActual(telefonoInput.value);
        localStorage.setItem('telefonoTemporal', telefonoInput.value);
      }
    };
    // Escuchar cambios en todos los inputs de teléfono (por si hay más de uno)
    const inputs = Array.from(document.querySelectorAll('input[name="telefono"]'));
    inputs.forEach(input => {
      input.addEventListener('input', handler);
      // Inicializar con el valor actual
      setTelefonoActual(input.value);
      localStorage.setItem('telefonoTemporal', input.value);
    });
    return () => {
      inputs.forEach(input => input.removeEventListener('input', handler));
    };
  }, []);

  // Función para abrir WhatsApp con el número del cliente
  const openWhatsApp = () => {
    // Leer el teléfono desde localStorage y asegurarse de que no esté vacío
    let phoneNumber = localStorage.getItem('telefonoTemporal') || telefonoActual || '';
    phoneNumber = phoneNumber.replace(/\D/g, ''); // Eliminar todos los caracteres que no son dígitos
    // Solo tomar los últimos 9 dígitos (por si el usuario pone +51 o más)
    if (phoneNumber.length > 9) {
      phoneNumber = phoneNumber.slice(-9);
    }
    if (phoneNumber.length === 9) {
      phoneNumber = '51' + phoneNumber;
    }
    if (!/^51\d{9}$/.test(phoneNumber)) {
      alert('Ingrese un número de teléfono válido antes de enviar por WhatsApp.');
      return;
    }
    const message = encodeURIComponent(
      `🔔 *FORMULARIO DE SOLICITUD PRINTEC* 🔔\n\n` +
      `Hola ${formData.nombreApellido || 'estimado cliente'},\n\n` +
      `Adjunto encontrará el formulario de solicitud de servicio técnico. ` +
      `Por favor, recuerde que debe presentar el PDF al momento de recoger su equipo.\n\n` +
      `📎 *IMPORTANTE*: El archivo PDF ha sido descargado a su dispositivo. ` +
      `Búsquelo en sus descargas con el nombre: ${pdfFileName}\n\n` +
      `Gracias por confiar en Printec.`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const generatePDF = async () => {
    setLoading(true);
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
      
      Object.entries(formData).forEach(([key, value], index) => {
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
        
        // Dividir texto largo en líneas si es necesario
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

      // Descarga automática
      const fileName = `formulario_solicitud_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Guardar el nombre del archivo para referencia
      setPdfFileName(fileName);
      setPdfGenerated(true);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error generando PDF:', err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        onClick={generatePDF}
        disabled={loading}
        className="pdf-generator-button"
        style={{ 
          fontWeight: 600, 
          marginBottom: 8,
          backgroundColor: loading ? '#6c757d' : '#0030ff',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          fontSize: '14px'
        }}
      >
        {loading ? 'Generando PDF...' : 'Generar PDF'}
      </button>
      
      {pdfGenerated && (
        <button
          onClick={openWhatsApp}
          className="whatsapp-button"
          style={{ 
            fontWeight: 600, 
            backgroundColor: '#25D366', // Color de WhatsApp
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
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
          Enviar a Cliente
        </button>
      )}
    </div>
  );
};

export default FormPDFGenerator;