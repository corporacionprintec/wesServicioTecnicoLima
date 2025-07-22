import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import logoPath from '../../imagenes/printec.jpg';
import qrPaginas from '../../imagenes/qrPaginas.jpeg';
import '../../cssGeneral/osDetail/receiptGenerator/receiptGenerator.css';

// Componente para generar recibos PDF con mejor diseño
const ReceiptGenerator = ({ orderData, onSuccess, onError, onAfterSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ show: false, text: '', type: '' });
  const [showBigSuccess, setShowBigSuccess] = useState(false);

  useEffect(() => {
    generateReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateReceipt = async () => {
    try {
      setLoading(true);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = 30;
      const printecBlue = [0, 48, 255];
      const darkBlue = [13, 71, 161];
      const titleFontSize = 14;
      const contentFontSize = 10;
      const lineHeight = 7;
      // CABECERA: Logo y QR
      let estadoStr = orderData?.data?.estado ? orderData.data.estado.replace(/_/g, ' ').toUpperCase() : 'N/A';
      // Mensaje destacado arriba si corresponde
      // Solo mostrar si es EN PROCESO o ENTREGADO, nada si es PENDIENTE u otro
      if (estadoStr === 'EN PROCESO') {
        pdf.setFillColor(255, 230, 0); // Amarillo
        pdf.roundedRect(pageWidth / 2 - 36, 4, 72, 7, 2.5, 2.5, 'F');
        pdf.setDrawColor(255, 180, 0);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(pageWidth / 2 - 36, 4, 72, 7, 2.5, 2.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(220, 100, 0);
        pdf.text('LISTO PARA RECOGER', pageWidth / 2, 9.5, { align: 'center' });
      } else if (estadoStr === 'ENTREGADO') {
        pdf.setFillColor(0, 200, 100); // Verde
        pdf.roundedRect(pageWidth / 2 - 36, 4, 72, 7, 2.5, 2.5, 'F');
        pdf.setDrawColor(0, 150, 60);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(pageWidth / 2 - 36, 4, 72, 7, 2.5, 2.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text('MÁQUINA ENTREGADA', pageWidth / 2, 9.5, { align: 'center' });
      }
      try {
        // Logo a la izquierda, tamaño igual al QR
        pdf.addImage(logoPath, 'JPEG', margin, 5, 30, 30);
      } catch (err) {
        console.error('Error cargando el logo:', err);
      }
      try {
        pdf.addImage(qrPaginas, 'JPEG', pageWidth - margin - 30, 5, 30, 30);
        pdf.setFontSize(9);
        pdf.setTextColor(0, 48, 255);
        pdf.setFont('helvetica', 'bold');
        // Texto a la derecha del QR, alineado verticalmente al centro del QR
        pdf.text('Escanea el QR para', pageWidth - margin - 32, 18, { align: 'right' });
        pdf.text('visitar nuestras redes', pageWidth - margin - 32, 24, { align: 'right' });
      } catch (err) {
        console.error('Error cargando el QR:', err);
      }
      // --- Resto del PDF ---
      // Añadir un fondo de color azul claro en la cabecera
      pdf.setFillColor(230, 240, 255);
      pdf.rect(0, 35, pageWidth, 15, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...darkBlue);
      pdf.text(`RECIBO #${orderData?.data?.ticket || 'N/A'}`, margin, 45);
      const fechaActual = new Date().toLocaleString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Fecha: ${fechaActual}`, pageWidth - margin, 45, { align: 'right' });
      y = 60;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text('JOSE DIAZ CANSECO 106A SAN MARTÍN DE PORRES', margin, y);
      y += lineHeight - 2;
      pdf.text('RUC: 20610753567 • +51966177851', margin, y);
      y += lineHeight - 2;
      pdf.text('IMPORTACIONES PRINTEC - SOLO LAS MEJORES MARCAS', margin, y);
      y += lineHeight;
      pdf.setDrawColor(...printecBlue);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.5;
      pdf.setFillColor(230, 240, 255);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(titleFontSize);
      pdf.setTextColor(...darkBlue);
      pdf.text('CLIENTE', margin + 2, y);
      y += lineHeight * 1.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(contentFontSize);
      pdf.setTextColor(0, 0, 0);
      const clienteNombre = `${orderData?.data?.dispositivo?.cliente?.nombre || ''} ${orderData?.data?.dispositivo?.cliente?.apellido || ''}`.trim();
      pdf.text(`Nombre: ${clienteNombre || 'N/A'}`, margin, y);
      pdf.text(`Teléfono: ${orderData?.data?.dispositivo?.cliente?.telefono || 'N/A'}`, pageWidth / 2, y);
      y += lineHeight;
      const fechaRecepcion = orderData?.data?.fecha_ingreso ?
        new Date(orderData.data.fecha_ingreso).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }) : 'N/A';
      pdf.text(`Fecha de Recepción: ${fechaRecepcion}`, margin, y);
      // Quitar la sección de estado si es PENDIENTE o cualquier otro distinto a EN PROCESO/ENTREGADO
      if (estadoStr === 'EN PROCESO' || estadoStr === 'ENTREGADO') {
        // No mostrar nada aquí, ya que el mensaje solo va arriba
      } else if (estadoStr !== 'PENDIENTE') {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(contentFontSize);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Estado: ${estadoStr}`, pageWidth / 2, y);
      }
      y += lineHeight * 2;
      // Sección de técnicos
      pdf.setFillColor(230, 240, 255);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 12, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(titleFontSize);
      pdf.setTextColor(...darkBlue);
      pdf.text('TÉCNICOS ASIGNADOS', margin + 2, y);
      y += lineHeight * 1.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(contentFontSize);
      pdf.setTextColor(0, 0, 0);
      // Técnico que recibió
      const tecnicoRecibio = orderData?.data?.dispositivo?.tecnicoRecibio;
      if (tecnicoRecibio) {
        const nombreSolo = (tecnicoRecibio.nombre || '').split(' ')[0];
        pdf.text(`Técnico que recibió: ${nombreSolo}`.trim(), margin, y);
        y += lineHeight;
      }
      // Técnico que diagnosticó/reparó
      const tecnicoDiagnostico = orderData?.data?.dispositivo?.tecnico;
      if (tecnicoDiagnostico) {
        const nombreSolo = (tecnicoDiagnostico.nombre || '').split(' ')[0];
        // Mostrar fecha de diagnóstico si existe
        let fechaDiagnostico = '';
        if (orderData?.data?.fecha_diagnostico) {
          fechaDiagnostico = new Date(orderData.data.fecha_diagnostico).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric'
          });
        }
        let texto = `Técnico que reparó: ${nombreSolo}`.trim();
        if (fechaDiagnostico) texto += `  (${fechaDiagnostico})`;
        pdf.text(texto, margin, y);
        y += lineHeight;
      }
      // Técnico que entregó
      const tecnicoEntrego = orderData?.data?.dispositivo?.tecnicoEntrego;
      if (tecnicoEntrego) {
        const nombreSolo = (tecnicoEntrego.nombre || '').split(' ')[0];
        // Mostrar fecha de entrega si existe
        let fechaEntrega = '';
        if (orderData?.data?.fecha_entrega) {
          fechaEntrega = new Date(orderData.data.fecha_entrega).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric'
          });
        }
        let texto = `Técnico que entregó: ${nombreSolo}`.trim();
        if (fechaEntrega) texto += `  (${fechaEntrega})`;
        pdf.text(texto, margin, y);
        y += lineHeight;
      }
      y += 2;
      pdf.setFillColor(230, 240, 255);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(titleFontSize);
      pdf.setTextColor(...darkBlue);
      pdf.text('PROBLEMA REPORTADO', margin + 2, y);
      y += lineHeight * 1.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(contentFontSize);
      pdf.setTextColor(0, 0, 0);
      const problema = orderData?.data?.problema_descrito || 'Sin descripción';
      const splitProblema = pdf.splitTextToSize(problema, pageWidth - (margin * 2));
      pdf.text(splitProblema, margin, y);
      y += (splitProblema.length * lineHeight) + lineHeight;
      // --- Sección DETALLE DEL SERVICIO ---
      const diagnostico = orderData?.data?.dispositivo?.diagnostico || 'Sin diagnóstico registrado';
      const costoTotal = orderData?.data?.dispositivo?.costo_total || '0.00';
      // Ajuste de anchos y posiciones para coincidir con el ejemplo visual
      const colDiagnosticoX = margin + 2;
      const colDiagnosticoWidth = pageWidth - margin * 2 - 70; // Diagnóstico ocupa casi todo
      const colCantX = pageWidth - margin - 55;
      const colPrecioX = pageWidth - margin - 15;
      // Encabezado azul
      pdf.setFillColor(...printecBlue);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.text('DETALLE DEL SERVICIO', margin + 2, y + 2);
      y += lineHeight * 1.3;
      // Títulos de columna gris claro
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DIAGNÓSTICO', colDiagnosticoX, y);
      pdf.text('CANT.', colCantX, y, { align: 'right' });
      pdf.text('PRECIO (S/)', colPrecioX, y, { align: 'right' });
      y += lineHeight - 1;
      // Línea divisoria superior
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3.5;
      // Diagnóstico multilinea, cantidad y precio solo en la primera línea
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 0, 0);
      const splitDiagnosticoServicio = pdf.splitTextToSize(diagnostico, pageWidth - margin * 2 - 70);
      splitDiagnosticoServicio.forEach((line, idx) => {
        pdf.text(line, colDiagnosticoX, y + idx * (lineHeight - 2));
      });
      // Cantidad y precio solo en la primera línea, alineados a la derecha
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('1', colCantX, y, { align: 'right' });
      pdf.text(`${parseFloat(costoTotal).toFixed(2)}`, colPrecioX, y, { align: 'right' });
      y += Math.max(lineHeight, (splitDiagnosticoServicio.length * (lineHeight - 2))) + 2;
      // Línea divisoria inferior
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.2;
      // TOTAL en recuadro azul alineado a la derecha
      const totalBoxWidth = 120;
      pdf.setFillColor(...printecBlue);
      pdf.rect(pageWidth - margin - totalBoxWidth, y - 7, totalBoxWidth, 14, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TOTAL:', pageWidth - margin - totalBoxWidth + 12, y + 2, { align: 'left' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(`S/ ${parseFloat(costoTotal).toFixed(2)}`, pageWidth - margin - 12, y + 2, { align: 'right' });
      // Información de cuentas para pagos (diseño más profesional y bien separado)
      y += 18; // Espacio extra después del total
      const cuentasBoxHeight = 28;
      pdf.setFillColor(255, 249, 196); // Fondo amarillo pastel
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), cuentasBoxHeight, 5, 5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 87, 34); // Naranja fuerte
      pdf.text('CUENTAS PARA TUS PAGOS: EYTER  ROJAS ', pageWidth / 2, y + 8, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(33, 33, 33);
      pdf.text('BCP Soles: 38004502346086', pageWidth / 2, y + 15, { align: 'center' });
      pdf.text('Interbancaria: 00238010450234608642', pageWidth / 2, y + 21, { align: 'center' });
      pdf.text('Yape: 51 929 620 433', pageWidth / 2, y + 27, { align: 'center' });
      y += cuentasBoxHeight + 8;
      // Pie de página: solo el mensaje de gracias, más abajo
      y = pageHeight - 24;
      pdf.setFillColor(240, 248, 255);
      pdf.roundedRect(margin, y - 12, pageWidth - (margin * 2), 18, 3, 3, 'F');
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 150);
      pdf.text('¡Gracias por confiar en Importaciones Printec!', pageWidth / 2, y, { align: 'center' });
      const fileName = `recibo_${orderData?.data?.ticket || 'orden'}.pdf`;
      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      const dispositivoId = orderData?.data?.dispositivo?.id;
      if (dispositivoId) {
        try {
          setMessage({ show: true, text: 'Subiendo recibo al servidor...', type: 'info' });
          const response = await fetch(
            `https://servidorserviciotecnicolima-production.up.railway.app/api/dispositivos/${dispositivoId}/recibo`,
            {
              method: 'PUT',
              body: formData
            }
          );
          if (!response.ok) {
            throw new Error('Error en la actualización');
          }
          pdf.save(fileName);
          setMessage({ show: true, text: 'Recibo subido correctamente y descargado', type: 'success' });
          setShowBigSuccess(true);
          if (onSuccess) onSuccess();
          if (onAfterSuccess) onAfterSuccess();
        } catch (uploadError) {
          let errorMessage = 'Error al subir el recibo a Google Drive';
          if (uploadError.response) {
            errorMessage = `Error ${uploadError.response.status}: ${uploadError.response.data.message || 'Error en la respuesta del servidor'}`;
          } else if (uploadError.request) {
            errorMessage = 'No se recibió respuesta del servidor. Verifique que el servidor esté funcionando.';
          } else {
            errorMessage = `Error: ${uploadError.message}`;
          }
          setMessage({ show: true, text: errorMessage, type: 'danger' });
          if (onError) onError(uploadError);
        }
      } else {
        setMessage({ show: true, text: 'No se pudo obtener el ID del dispositivo', type: 'danger' });
        if (onError) onError(new Error('No se pudo obtener el ID del dispositivo'));
      }
    } catch (error) {
      setMessage({ show: true, text: 'Error al generar el recibo PDF', type: 'danger' });
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Renderizado de spinner y alert personalizados
  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.6)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <span className="rg-spinner" style={{ width: '2.5em', height: '2.5em', marginBottom: '1em' }}></span>
            <div style={{ fontWeight: 600, color: '#265d97', fontSize: '1.2em' }}>Generando PDF...</div>
          </div>
        </div>
      )}
      {showBigSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            padding: '2.5em 2em',
            boxShadow: '0 4px 32px rgba(26,77,124,0.18)',
            textAlign: 'center',
            fontSize: '2em',
            color: '#155c3d',
            fontWeight: 700,
            maxWidth: 400,
            margin: '0 auto',
          }}>
            ✅ ¡Recibo exportado y subido con éxito!
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', margin: '2em 0' }}>
        {message.show && (
          <div className={`rg-alert${message.type === 'danger' ? ' rg-alert-danger' : message.type === 'success' ? ' rg-alert-success' : ''}`}>
            {message.text}
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(ReceiptGenerator);
