import React, { useState } from 'react';
import jsPDF from 'jspdf';
import logoPath from '../../imagenes/printec.jpg';
import qrPaginas from '../../imagenes/qrPaginas.jpeg';
import '../../cssGeneral/osDetail/receiptGenerator/receiptGenerator.css';

const FacturaPagosPDF = ({ orderData, pagos, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const generateFactura = async () => {
    setLoading(true);
    try {
      const totalPagos = pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);
      const orderDataPagos = JSON.parse(JSON.stringify(orderData));
      if (orderDataPagos?.data?.dispositivo) {
        orderDataPagos.data.dispositivo.costo_total = totalPagos;
      }

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
      pdf.addImage(logoPath, 'JPEG', margin, 5, 30, 30);
      pdf.addImage(qrPaginas, 'JPEG', pageWidth - margin - 30, 5, 30, 30, undefined, 'FAST');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(titleFontSize);
      pdf.setTextColor(...printecBlue);
    
      y += lineHeight * 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(contentFontSize);
      pdf.setTextColor(...darkBlue);
      const clienteNombre = `${orderDataPagos?.data?.cliente?.nombre || ''} ${orderDataPagos?.data?.cliente?.apellido || ''}`.trim();
      pdf.text(`Cliente: ${clienteNombre || 'N/A'}`, margin, y);
      y += lineHeight;
      const tecnicoEntrego = orderDataPagos?.data?.dispositivo?.tecnicoEntrego;
      const tecnicoNombre = tecnicoEntrego ? (tecnicoEntrego.nombre || 'N/A').split(' ')[0] : 'N/A';
      pdf.text(`Técnico: ${tecnicoNombre}`, margin, y);
      y += lineHeight;

      // DETALLE DEL SERVICIO
      const diagnostico = orderDataPagos?.data?.dispositivo?.diagnostico || 'Sin diagnóstico registrado';
      const costoTotal = totalPagos;
      const colDiagnosticoX = margin + 2;
      const colCantX = pageWidth - margin - 55;
      const colPrecioX = pageWidth - margin - 15;

      pdf.setFillColor(...printecBlue);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.text('DETALLE DEL SERVICIO', margin + 2, y + 2);
      y += lineHeight * 1.3;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DIAGNÓSTICO', colDiagnosticoX, y);
      pdf.text('CANT.', colCantX, y, { align: 'right' });
      pdf.text('PRECIO (S/)', colPrecioX, y, { align: 'right' });
      y += lineHeight - 1;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 0, 0);
      const splitDiagnosticoServicio = pdf.splitTextToSize(diagnostico, pageWidth - margin * 2 - 70);
      splitDiagnosticoServicio.forEach((line, idx) => {
        pdf.text(line, colDiagnosticoX, y + idx * (lineHeight - 2));
      });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('1', colCantX, y, { align: 'right' });
      pdf.text(`${parseFloat(costoTotal).toFixed(2)}`, colPrecioX, y, { align: 'right' });
      y += Math.max(lineHeight, (splitDiagnosticoServicio.length * (lineHeight - 2))) + 2;

      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.2;

      const totalBoxWidth = 120;
      pdf.setFillColor(...printecBlue);
      pdf.rect(pageWidth - margin - totalBoxWidth, y - 7, totalBoxWidth, 14, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TOTAL:', pageWidth - margin - totalBoxWidth + 12, y + 2, { align: 'left' });
      pdf.text(`S/ ${parseFloat(costoTotal).toFixed(2)}`, pageWidth - margin - 12, y + 2, { align: 'right' });

      // Marca de agua "PAGADO"
      pdf.setFontSize(50);
      pdf.setTextColor(0, 128, 0); // Green color
      pdf.text('PAGADO', pageWidth - margin - 50, pageHeight - margin - 120, { align: 'right' });

      pdf.save(`FacturaPagos_${orderData?.data?.ticket || 'recibo'}.pdf`);
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setLoading(false);
      if (onError) onError(err);
    }
  };

  return (
    <button
      className="button is-info is-small"
      onClick={generateFactura}
      disabled={loading}
      style={{ fontWeight: 600, marginBottom: 8 }}
    >
      {loading ? 'Generando...' : 'Facturar'}
    </button>
  );
};

export default FacturaPagosPDF;
