import React from 'react';
import GastosTable from './GastosTable';

export default function GastosAdminPanel() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #e6f7ee 0%, #f6fff9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'clamp(12px, 5vw, 38px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 900,
        minWidth: 0,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <h2
          className="title is-4 mb-4"
          style={{
            color: '#43c97f',
            fontWeight: 900,
            letterSpacing: 1,
            textShadow: '0 2px 8px #43c97f33',
            marginTop: 18,
            marginBottom: 32,
            textAlign: 'center',
            fontSize: 32,
            borderRadius: 16,
            background: 'linear-gradient(90deg, #e6f7ee 0%, #43c97f22 100%)',
            padding: '18px 0',
            boxShadow: '0 2px 12px #43c97f22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <span role="img" aria-label="gastos" style={{ fontSize: 32, marginRight: 4 }}>💸</span>
          Gastos generales
        </h2>
        <GastosTable />
      </div>
    </div>
  );
}
