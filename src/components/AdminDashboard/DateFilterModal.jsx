import React from 'react';

const DateFilterModal = ({ isOpen, onClose, onApplyFilter }) => {
  const periods = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'thisWeek', label: 'Esta semana' },
    { id: 'lastWeek', label: 'Semana pasada' },
    { id: 'thisMonth', label: 'Este mes' },
    { id: 'lastMonth', label: 'Mes pasado' },
    { id: 'thisYear', label: 'Este año' },
    { id: 'lastYear', label: 'El año pasado' },
  ];

  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedPeriod, setSelectedPeriod] = React.useState('');

  const handlePeriodSelect = (periodId) => {
    setSelectedPeriod(periodId);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (periodId) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastWeek':
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - now.getDay() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastYear':
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleApplyFilter = () => {
    onApplyFilter({ startDate, endDate });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#232946',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(14, 165, 233, 0.3)',
        border: '2px solid #38bdf8'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#e0e7ff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Filtro de fecha</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e7ff',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#e0e7ff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
            Informe el período
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                backgroundColor: '#181a2a',
                color: '#e0e7ff',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #38bdf8',
                fontSize: '1rem'
              }}
              placeholder="Fecha de inicio"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                backgroundColor: '#181a2a',
                color: '#e0e7ff',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #38bdf8',
                fontSize: '1rem'
              }}
              placeholder="Fecha final"
            />
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => handlePeriodSelect(period.id)}
              style={{
                backgroundColor: selectedPeriod === period.id ? '#38bdf8' : '#181a2a',
                color: selectedPeriod === period.id ? '#232946' : '#e0e7ff',
                border: '1.5px solid #38bdf8',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {period.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleApplyFilter}
          style={{
            backgroundColor: '#38bdf8',
            color: '#232946',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            width: '100%',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Aplicar Filtro
        </button>
      </div>
    </div>
  );
};

export default DateFilterModal;
