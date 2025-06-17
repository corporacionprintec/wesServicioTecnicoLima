import React from 'react';
import jsPDF from 'jspdf';

/**
 * TechnicianStatsPDFExport
 * Props:
 * - technician: { nombre, nombreSolo, rol, reparacionesExitosas, totalIngresos }
 * - filterLabel: string (e.g., 'Mes: Mayo 2025')
 * - chartData: { reparaciones: number, ingresos: number }
 * - onExported: optional callback after export
 */
const TechnicianStatsPDFExport = ({ technician, filterLabel, chartData = {}, onExported }) => {
  const handleExportPDF = () => {
    if (!technician) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 0;
    // Encabezado azul con logo y título
    doc.setFillColor(37, 99, 235); // azul
    doc.rect(0, 0, pageWidth, 60, 'F');
    doc.setFontSize(28);
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica', 'bold');
    doc.text('Printec', 40, 40);
    doc.setFontSize(18);
    doc.text('Reporte de Técnico', pageWidth/2, 40, { align: 'center' });
    y = 80;
    // Filtro
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text(`Filtro aplicado: ${filterLabel}`, 40, y);
    y += 30;
    // Datos del empleado
    doc.setFontSize(16);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Empleado', 40, y);
    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(`Nombre: ${technician.nombre}`, 60, y);
    y += 18;
    doc.text(`Rol: ${technician.rol || 'Técnico'}`, 60, y);
    y += 18;
    doc.text(`Reparaciones realizadas: ${technician.reparacionesExitosas}`, 60, y);
    y += 18;
    doc.text(`Ingresos totales: S/ ${technician.totalIngresos?.toFixed(2) ?? '0.00'}`, 60, y);
    y += 30;
    // Gráfico de barras horizontal (ajustado para vertical)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(37, 99, 235);
    doc.text('Estadísticas', 40, y);
    y += 20;
    // Gráfico
    const barLeft = 100, barTop = y, barHeight = 32, barGap = 40, barMaxWidth = 300;
    const maxVal = Math.max(chartData.reparaciones || 0, chartData.ingresos || 0, 1);
    const repBarLen = (chartData.reparaciones || 0) / maxVal * barMaxWidth;
    const ingBarLen = (chartData.ingresos || 0) / maxVal * barMaxWidth;
    // Reparaciones (azul)
    doc.setFillColor(37, 99, 235);
    doc.rect(barLeft, barTop, repBarLen, barHeight, 'F');
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(`Reparaciones: ${chartData.reparaciones || 0}`, barLeft + repBarLen + 16, barTop + barHeight - 8);
    // Ingresos (verde)
    doc.setFillColor(16, 185, 129);
    doc.rect(barLeft, barTop + barHeight + barGap, ingBarLen, barHeight, 'F');
    doc.setTextColor(0,0,0);
    doc.text(`Ingresos: S/ ${(chartData.ingresos || 0).toFixed(2)}`, barLeft + ingBarLen + 16, barTop + barHeight + barGap + barHeight - 8);
    y = barTop + 2 * (barHeight + barGap) + 10;
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(120,120,120);
    doc.text(`Generado el ${new Date().toLocaleString()}`, 40, 800);
    doc.save(`Reporte_${technician.nombreSolo}_${filterLabel.replace(/\s+/g, '_')}.pdf`);
    if (onExported) onExported();
  };

  return (
    <button className="button is-info is-small mt-2" onClick={handleExportPDF}>
      <span className="icon"><i className="fas fa-file-pdf"></i></span>
      <span>Exportar PDF</span>
    </button>
  );
};

export default TechnicianStatsPDFExport;
