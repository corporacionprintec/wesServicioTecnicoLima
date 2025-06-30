import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TECH_COLORS } from '../../utils/colors';

// Utilidad para saber si un color es "claro" (para poner el label en negro)
function isColorLight(hex) {
  // Quitar # si existe
  hex = hex.replace('#', '');
  // Convertir a RGB
  const r = parseInt(hex.substring(0,2), 16);
  const g = parseInt(hex.substring(2,4), 16);
  const b = parseInt(hex.substring(4,6), 16);
  // Luminancia percibida
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.7;
}

const renderCustomLabel = (props) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, index } = props;
  const RADIAN = Math.PI / 180;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  if (!isMobile) return null; // Solo mostrar porcentajes y líneas en móvil
  const baseRadius = outerRadius + 55;
  const radiusAdjustment = percent < 0.01 ? 25 : percent < 0.05 ? 18 : 0;
  const radius = baseRadius + radiusAdjustment;
  const theta = -midAngle * RADIAN;
  const x = cx + radius * Math.cos(theta);
  const y = cy + radius * Math.sin(theta);
  const quarter = Math.floor(((midAngle + 360) % 360) / 90);
  let labelAdjustment = 0;
  let yAdjustment = 0;
  switch(quarter) {
    case 0:
      labelAdjustment = percent < 0.05 ? 16 : 10;
      yAdjustment = percent < 0.05 ? -16 : -10;
      break;
    case 1:
      labelAdjustment = percent < 0.05 ? -16 : -10;
      yAdjustment = percent < 0.05 ? -16 : -10;
      break;
    case 2:
      labelAdjustment = percent < 0.05 ? -16 : -10;
      yAdjustment = percent < 0.05 ? 16 : 10;
      break;
    case 3:
      labelAdjustment = percent < 0.05 ? 16 : 10;
      yAdjustment = percent < 0.05 ? 16 : 10;
      break;
  }
  if (index > 0 && percent < 0.05) {
    yAdjustment += (index % 2 === 0) ? 10 : -10;
  }
  const segmentMidpoint = {
    x: cx + (outerRadius - 2) * Math.cos(theta),
    y: cy + (outerRadius - 2) * Math.sin(theta)
  };
  const controlPoint = {
    x: cx + (radius - 8) * Math.cos(theta),
    y: cy + (radius - 8) * Math.sin(theta)
  };
  const endPoint = {
    x: x + labelAdjustment,
    y: y + yAdjustment
  };
  const textAnchor = x > cx ? 'start' : 'end';
  const rectWidth = 48;
  const rectHeight = 20;
  const rectX = textAnchor === 'start' ? endPoint.x - 3 : endPoint.x - rectWidth + 3;
  const rectY = endPoint.y - rectHeight/2;
  return (
    <g>
      <path
        d={`
          M ${segmentMidpoint.x} ${segmentMidpoint.y}
          Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}
        `}
        stroke="#00E5FF"
        strokeWidth={1.5}
        fill="none"
      />
      <rect
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        fill="#232946"
        rx={4}
        opacity={0.95}
      />
      <text 
        x={endPoint.x}
        y={endPoint.y}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={13}
        fontWeight={900}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

const TechnicianStatsDoughnut = ({ data, onRowClick }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;
    const item = payload[0].payload;
    return (
      <div style={{ background: '#232946', padding: '8px 12px', border: '1.5px solid #313552', borderRadius: 8 }}>
        <p style={{ color: '#fff', margin: 0, fontWeight: 700 }}>{item.nombre}</p>
        <p style={{ color: '#fff', margin: '4px 0 0 0' }}>S/ {Number(item.valor).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
        height: 'auto',
        display: 'flex',
        alignItems: 'flex-start', // inicia arriba
        justifyContent: 'center',
        padding: window.innerWidth < 600 ? '24px 0 0 0' : '40px 0 0 0', // baja el gráfico dentro del box
        overflowY: 'visible', // asegura que no haya scroll vertical
      }}
    >
      <ResponsiveContainer
        width="100%"
        height={window.innerWidth < 600 ? 240 : 420} // altura más baja y sin scroll
        aspect={window.innerWidth < 600 ? 1 : undefined}
      >
        <PieChart
          margin={{
            top: window.innerWidth < 600 ? 10 : 20,
            right: window.innerWidth < 600 ? 10 : 20,
            bottom: window.innerWidth < 600 ? 10 : 20,
            left: window.innerWidth < 600 ? 10 : 20,
          }}
        >
          <Pie
            data={data}
            dataKey="valor"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            innerRadius={window.innerWidth < 600 ? 38 : 100}
            outerRadius={window.innerWidth < 600 ? 75 : 160}
            startAngle={90}
            endAngle={450}
            fill="#8884d8"
            label={renderCustomLabel}
            labelLine={false}
            paddingAngle={4}
          >
            {data.map((entry) => {
              // Buscar el colorIdx global del técnico según su posición en el array original de técnicos
              const colorIdx = entry.colorIdx !== undefined ? entry.colorIdx : 0;
              return (
                <Cell key={`cell-${entry.nombre}`} fill={TECH_COLORS[colorIdx % TECH_COLORS.length]} />
              );
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* La tabla que causaba la duplicación ha sido eliminada de aquí */}
    </div>
  );
};

export default TechnicianStatsDoughnut;
