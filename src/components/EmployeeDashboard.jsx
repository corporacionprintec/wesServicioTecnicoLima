import React, { useState, useEffect, useRef } from 'react';
import '../cssGeneral/employeeDashboard/employeeDashboard.css';
import { useNavigate } from 'react-router-dom';
import OsDetail from './OsDetail';
import { useAuth } from '../contexts/AuthContext';
import QrScanner from 'qr-scanner';

import QrScannerComponent from './EmployeeDashboard/QrScannerComponent';

import NovedadesToast from './common/NovedadesToast';

import PrintecGPTChat from './PrintecGPTChat';
import GastoFloatingWidget from './EmployeeDashboard/GastoFloatingWidget';

const API_URL = "https://servidorserviciotecnicolima-production.up.railway.app/ordenes";
const NOVEDADES_VERSION = "2.0.0"; // Cambia esto cuando haya nuevas novedades

const useOrdenes = (refreshTrigger) => {
  const [ordenes, setOrdenes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchOrdenes = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?page=1&limit=10000`);
      const data = await response.json();
      const nuevasOrdenes = data.data.ordenes.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrdenes(nuevasOrdenes);
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchOrdenes(); }, [refreshTrigger]);
  return { ordenes, isLoading };
};

// Utilidad para comparar solo año, mes y día en UTC
function isSameDayUTC(dateA, dateB) {
  return (
    dateA.getUTCFullYear() === dateB.getUTCFullYear() &&
    dateA.getUTCMonth() === dateB.getUTCMonth() &&
    dateA.getUTCDate() === dateB.getUTCDate()
  );
}

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const limit = 15;
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQRCode, setSearchQRCode] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEliminados, setShowEliminados] = useState(false);
  const [filterTipoServicio, setFilterTipoServicio] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const { ordenes, isLoading } = useOrdenes(refreshTrigger);
  const { currentUser, login } = useAuth();
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [qrScanMode, setQrScanMode] = useState('camera');
  const fileInputRef = useRef(null);
  const [showUpdateMsg, setShowUpdateMsg] = useState(false);
  const [dateFilterType, setDateFilterType] = useState('');
  const [dateFilterValue, setDateFilterValue] = useState('');
  const [scannedQrValue, setScannedQrValue] = useState('');
  useEffect(() => { setPage(1); }, [searchQRCode, searchPhone, filterStatus, showEliminados, filterTipoServicio]);
  useEffect(() => {
    const storedDni = localStorage.getItem('dni');
    const storedRole = localStorage.getItem('role');
    const storedToken = localStorage.getItem('token');
    if (storedDni && storedRole && storedToken && !currentUser) {
      login(storedDni, storedRole, storedToken)
        .then(() => setIsLoadingAuth(false))
        .catch(() => {
          localStorage.removeItem('dni');
          localStorage.removeItem('role');
          localStorage.removeItem('token');
          window.location.href = '/login';
        });
    } else {
      setIsLoadingAuth(false);
    }
  }, [currentUser, login]);
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some(device => device.kind === 'videoinput');
        setHasCamera(hasCam);
      } catch (error) { setHasCamera(false); }
    };
    checkCameraAvailability();
  }, []);
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('novedadesVersion');
    if (lastSeenVersion !== NOVEDADES_VERSION) {
      setShowUpdateMsg(true);
    }
  }, []);
  const onDeleteOrden = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta solicitud?')) return;
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.status === 'success') {
        setRefreshTrigger(prev => prev + 1);
        setShowDetailsModal(false);
      } else { alert(data.message); }
    } catch (error) { alert("Error al eliminar la orden"); }
  };
  const handleScanQR = () => { setQrScanMode('camera-only'); setShowQrModal(true); };
  const handleUploadQR = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleQrImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await QrScanner.scanImage(file);
      if (result) handleQrResult(result);
    } catch (error) { alert("No se pudo detectar un código QR en la imagen seleccionada."); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  // Cuando se escanea QR, buscar la orden y mostrar modal
  const normalize = str => (str || '').toString().replace(/\s+/g, '').toLowerCase();
  const handleQrResult = (qrData) => {
    if (!qrData || typeof qrData !== 'string' || qrData.trim() === '') {
      // QR vacío o ilegible, no hacer nada
      return;
    }
    // Buscar todas las órdenes por QR (ignora espacios y mayúsculas)
    const qrNorm = normalize(qrData);
    const ordenesQR = ordenes.filter(o => {
      const qrOrden = normalize(o.dispositivo?.qr_scan);
      return qrOrden === qrNorm;
    });
    if (ordenesQR.length > 0) {
      // Si el QR escaneado no coincide exactamente, pero hay órdenes asociadas, usa el QR guardado en la orden más reciente
      const qrReal = ordenesQR[0]?.dispositivo?.qr_scan || qrData;
      setSearchQRCode(qrReal);
      setScannedQrValue('');
    } else {
      // Si no hay órdenes, no mostrar nada ni alert ni formulario
      setSearchQRCode(qrData);
      setScannedQrValue(qrData);
    }
  };


  useEffect(() => {
    if (!ordenes) return;
    let ordenesFiltered = [...ordenes];
    if (showEliminados === 'con') {
      ordenesFiltered = ordenesFiltered.filter(orden => 
        orden.dispositivo && 
        orden.dispositivo.recibo && 
        orden.dispositivo.recibo !== "" && 
        orden.dispositivo.recibo !== null && 
        orden.dispositivo.recibo !== "null" && 
        orden.dispositivo.recibo !== undefined
      );
    } else if (showEliminados === 'sin') {
      ordenesFiltered = ordenesFiltered.filter(orden => 
        !orden.dispositivo || 
        !orden.dispositivo.recibo || 
        orden.dispositivo.recibo === "" || 
        orden.dispositivo.recibo === null || 
        orden.dispositivo.recibo === "null" || 
        orden.dispositivo.recibo === undefined
      );
    }
    ordenesFiltered = ordenesFiltered.filter(orden => orden.estado !== 'acudiendo' && orden.estado !== 'atentido');
    if (filterStatus === 'cancelado') {
      if (!showEliminados) {
        ordenesFiltered = ordenesFiltered.filter(orden => !orden.costo_acordado);
      }
    } else if (showEliminados) {
      ordenesFiltered = ordenesFiltered.filter(orden => orden.costo_acordado);
    } else {
      ordenesFiltered = ordenesFiltered.filter(orden => !orden.costo_acordado);
    }
    if (searchQRCode) {
      const qrNorm = normalize(searchQRCode);
      ordenesFiltered = ordenesFiltered.filter(orden => {
        const qrOrden = normalize(orden.dispositivo?.qr_scan);
        return qrOrden === qrNorm;
      });
    }
    if (searchPhone) {
      const normalizedSearch = searchPhone.trim().toLowerCase();
      ordenesFiltered = ordenesFiltered.filter(orden => {
        const phone = orden.dispositivo.cliente.telefono || '';
        const fullName = `${orden.dispositivo.cliente.nombre} ${orden.dispositivo.cliente.apellido}`.toLowerCase();
        return phone.replace(/\s+/g, '').includes(normalizedSearch) || 
               fullName.includes(normalizedSearch);
      });
    }
    // --- FILTRO POR ESTADO Y FECHA DIAGNOSTICO (SOLO UNA VEZ) ---
    if (filterStatus === 'en_proceso') {
      ordenesFiltered = ordenesFiltered.filter(orden => {
        if (orden.estado !== 'en_proceso') return false;
        // Si NO hay filtro de fecha, mostrar todos los diagnosticados (aunque no tengan fecha_diagnostico)
        if (!dateFilterType || !dateFilterValue) {
          return true;
        }
        // Si hay filtro de fecha, solo mostrar los que tienen fecha_diagnostico válida y filtrar por fecha
        const tieneFecha = orden.fecha_diagnostico && orden.fecha_diagnostico !== '' && orden.fecha_diagnostico !== null && orden.fecha_diagnostico !== undefined;
        if (!tieneFecha) {
          console.log('[Filtro] Orden ignorada por fecha_diagnostico vacía:', orden);
          return false;
        }
        const diagDateUTC = new Date(orden.fecha_diagnostico);
        const diagDatePeru = new Date(diagDateUTC.getTime() - 5 * 60 * 60 * 1000);
        if (dateFilterType === 'day') {
          let selectedDate;
          if (dateFilterValue) {
            selectedDate = new Date(dateFilterValue + 'T00:00:00-05:00');
          } else {
            const now = new Date();
            selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          }
          const match = diagDatePeru.getFullYear() === selectedDate.getFullYear() && diagDatePeru.getMonth() === selectedDate.getMonth() && diagDatePeru.getDate() === selectedDate.getDate();
          console.log('[Filtro] fecha_diagnostico (cruda):', orden.fecha_diagnostico, '| fecha_diagnostico (Perú):', diagDatePeru, '| Fecha seleccionada:', selectedDate, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'month' && dateFilterValue) {
          const [year, month] = dateFilterValue.split('-');
          const match = diagDatePeru.getFullYear() === parseInt(year) && (diagDatePeru.getMonth() + 1) === parseInt(month);
          console.log('[Filtro] fecha_diagnostico (cruda):', orden.fecha_diagnostico, '| fecha_diagnostico (Perú):', diagDatePeru, '| Mes:', month, '| Año:', year, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'year' && dateFilterValue) {
          const match = diagDatePeru.getFullYear() === parseInt(dateFilterValue);
          console.log('[Filtro] fecha_diagnostico (cruda):', orden.fecha_diagnostico, '| fecha_diagnostico (Perú):', diagDatePeru, '| Año:', dateFilterValue, '| Match:', match, '| Orden:', orden);
          return match;
        }
        // Si no hay filtro de fecha válido, mostrar todos
        return true;
      });
    } else if (filterStatus === 'entregado') {
      ordenesFiltered = ordenesFiltered.filter(orden => {
        if (orden.estado !== 'entregado') return false;
        // Si NO hay filtro de fecha, mostrar todos los entregados (aunque no tengan fecha_entrega)
        if (!dateFilterType || !dateFilterValue) {
          return true;
        }
        // Si hay filtro de fecha, solo mostrar los que tienen fecha_entrega válida y filtrar por fecha
        const tieneFecha = orden.fecha_entrega && orden.fecha_entrega !== '' && orden.fecha_entrega !== null && orden.fecha_entrega !== undefined;
        if (!tieneFecha) {
          console.log('[Filtro] Orden ignorada por fecha_entrega vacía:', orden);
          return false;
        }
        const entregaDateUTC = new Date(orden.fecha_entrega);
        const entregaDatePeru = new Date(entregaDateUTC.getTime() - 5 * 60 * 60 * 1000);
        if (dateFilterType === 'day') {
          let selectedDate;
          if (dateFilterValue) {
            selectedDate = new Date(dateFilterValue + 'T00:00:00-05:00');
          } else {
            const now = new Date();
            selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          }
          const match = entregaDatePeru.getFullYear() === selectedDate.getFullYear() && entregaDatePeru.getMonth() === selectedDate.getMonth() && entregaDatePeru.getDate() === selectedDate.getDate();
          console.log('[Filtro] fecha_entrega (cruda):', orden.fecha_entrega, '| fecha_entrega (Perú):', entregaDatePeru, '| Fecha seleccionada:', selectedDate, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'month' && dateFilterValue) {
          const [year, month] = dateFilterValue.split('-');
          const match = entregaDatePeru.getFullYear() === parseInt(year) && (entregaDatePeru.getMonth() + 1) === parseInt(month);
          console.log('[Filtro] fecha_entrega (cruda):', orden.fecha_entrega, '| fecha_entrega (Perú):', entregaDatePeru, '| Mes:', month, '| Año:', year, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'year' && dateFilterValue) {
          const match = entregaDatePeru.getFullYear() === parseInt(dateFilterValue);
          console.log('[Filtro] fecha_entrega (cruda):', orden.fecha_entrega, '| fecha_entrega (Perú):', entregaDatePeru, '| Año:', dateFilterValue, '| Match:', match, '| Orden:', orden);
          return match;
        }
        // Si no hay filtro de fecha válido, mostrar todos
        return true;
      });
    } else if (filterStatus === 'cancelado') {
      ordenesFiltered = ordenesFiltered.filter(orden => {
        if (orden.estado !== 'cancelado') return false;
        // Si NO hay filtro de fecha, mostrar todos los abandonados (aunque no tengan fecha_abandono)
        if (!dateFilterType || !dateFilterValue) {
          return true;
        }
        // Si hay filtro de fecha, solo mostrar los que tienen fecha_abandono válida y filtrar por fecha
        const tieneFecha = orden.fecha_abandono && orden.fecha_abandono !== '' && orden.fecha_abandono !== null && orden.fecha_abandono !== undefined;
        if (!tieneFecha) {
          console.log('[Filtro] Orden ignorada por fecha_abandono vacía:', orden);
          return false;
        }
        const abandonoDateUTC = new Date(orden.fecha_abandono);
        const abandonoDatePeru = new Date(abandonoDateUTC.getTime() - 5 * 60 * 60 * 1000);
        if (dateFilterType === 'day') {
          let selectedDate;
          if (dateFilterValue) {
            selectedDate = new Date(dateFilterValue + 'T00:00:00-05:00');
          } else {
            const now = new Date();
            selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          }
          const match = abandonoDatePeru.getFullYear() === selectedDate.getFullYear() && abandonoDatePeru.getMonth() === selectedDate.getMonth() && abandonoDatePeru.getDate() === selectedDate.getDate();
          console.log('[Filtro] fecha_abandono (cruda):', orden.fecha_abandono, '| fecha_abandono (Perú):', abandonoDatePeru, '| Fecha seleccionada:', selectedDate, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'month' && dateFilterValue) {
          const [year, month] = dateFilterValue.split('-');
          const match = abandonoDatePeru.getFullYear() === parseInt(year) && (abandonoDatePeru.getMonth() + 1) === parseInt(month);
          console.log('[Filtro] fecha_abandono (cruda):', orden.fecha_abandono, '| fecha_abandono (Perú):', abandonoDatePeru, '| Mes:', month, '| Año:', year, '| Match:', match, '| Orden:', orden);
          return match;
        }
        if (dateFilterType === 'year' && dateFilterValue) {
          const match = abandonoDatePeru.getFullYear() === parseInt(dateFilterValue);
          console.log('[Filtro] fecha_abandono (cruda):', orden.fecha_abandono, '| fecha_abandono (Perú):', abandonoDatePeru, '| Año:', dateFilterValue, '| Match:', match, '| Orden:', orden);
          return match;
        }
        // Si no hay filtro de fecha válido, mostrar todos
        return true;
      });
    } else if (filterStatus) {
      ordenesFiltered = ordenesFiltered.filter(orden => orden.estado === filterStatus);
    }
    // FILTRO DE FECHA GLOBAL SI NO HAY ESTADO SELECCIONADO
    if (dateFilterType && dateFilterValue) {
      ordenesFiltered = ordenesFiltered.filter(orden => {
        // Siempre filtrar por la fecha de solicitud (createdAt)
        if (!orden.createdAt) return false;
        const fecha = new Date(orden.createdAt);
        if (dateFilterType === 'day') {
          const [year, month, day] = dateFilterValue.split('-');
          return (
            fecha.getFullYear() === parseInt(year) &&
            (fecha.getMonth() + 1) === parseInt(month) &&
            fecha.getDate() === parseInt(day)
          );
        }
        if (dateFilterType === 'month') {
          const [year, month] = dateFilterValue.split('-');
          return (
            fecha.getFullYear() === parseInt(year) &&
            (fecha.getMonth() + 1) === parseInt(month)
          );
        }
        if (dateFilterType === 'year') {
          return fecha.getFullYear() === parseInt(dateFilterValue);
        }
        return true;
      });
    }
    if (filterTipoServicio) {
      ordenesFiltered = ordenesFiltered.filter(orden => orden.tipoServicio === filterTipoServicio);
    }
    setFilteredRequests(ordenesFiltered);
  }, [searchQRCode, searchPhone, ordenes, filterStatus, showEliminados, filterTipoServicio, dateFilterType, dateFilterValue]);
  const totalFiltered = filteredRequests.length;
  const currentTotalPages = Math.ceil(totalFiltered / limit);
  const requestsToDisplay = filteredRequests.slice((page - 1) * limit, page * limit);
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pendiente':
        return <span className="badge badge-warning">⏳ Pendiente</span>;
      case 'en_proceso':
        return <span className="badge badge-info">🔧 Diagnosticado</span>;
      case 'entregado':
        return <span className="badge badge-dark">📦 Entregado</span>;
      case 'cancelado':
        return <span className="badge badge-danger">🚫 En Abandono</span>;
      case 'venta_rapida':
        return <span className="badge badge-success" style={{background:'#4ade80',color:'#065f46'}}>⚡ Venta Rápida</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };
  const handleRequestClick = (request) => {
    if (!showEliminados && request.costo_acordado) return;
    setCurrentRequest(request);
    setShowDetailsModal(true);
  };
  const handlePrevious = () => { if (page > 1) setPage(page - 1); };
  const handleNext = () => { if (page < currentTotalPages) setPage(page + 1); };
  const technicianInfo = currentUser ? {
    nombre: currentUser.name,
    apellido: currentUser.lastname,
    id: currentUser.id,
    especialidad: 'Técnico especializado'
  } : {
    nombre: 'Técnico no identificado',
    id: 'N/A',
    especialidad: 'N/A'
  };
  const handleLogout = () => {
    localStorage.removeItem('dni');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
  const handleGoBack = () => {
    navigate('/');
  };
  useEffect(() => {
    // Si hay una orden seleccionada desde otra vista, abrir el modal automáticamente
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    if (selectedOrderId && ordenes && ordenes.length > 0) {
      const orden = ordenes.find(o => String(o.id) === String(selectedOrderId));
      if (orden) {
        setCurrentRequest(orden);
        setShowDetailsModal(true);
        sessionStorage.removeItem('selectedOrderId');
      }
    }
  }, [ordenes]);
  if (isLoadingAuth) return <div>Cargando...</div>;
  if (!currentUser) { window.location.href = '/login'; return null; }
  const filterOptions = [
    { value: "pendiente", label: "Pendiente" },
    { value: "en_proceso", label: "Diagnosticado" },
    { value: "entregado", label: "Entregado" },
    { value: "cancelado", label: "En Abandono" },
    { value: "venta_rapida", label: "Venta Rápida" }
  ];
  const tipoServicioOptions = [
    { value: "En Tienda H.", label: "En Tienda H." },
    { value: "En Taller M.", label: "En Taller M." },
    { value: "Trasladado Taller", label: "Traslado a Taller" },
    { value: "Trasladado Tienda", label: "Traslado a Tienda" }
  ];

  // Obtener el usuario actual desde localStorage
  const currentUserLS = JSON.parse(localStorage.getItem('currentUser') || '{}');

  return (
    <div>
      {/* Navbar */}
      <div className="ed-navbar">
        <div className="ed-navbar-left">
          <span className="ed-navbar-logo">🛠️ PRINTEC Dashboard</span>
        </div>
        <div className="ed-navbar-center">
          <span className="ed-navbar-user">👨‍🔧 {technicianInfo.nombre.split(' ')[0]} {technicianInfo.apellido.split(' ')[0]}</span>
        </div>
        <div className="ed-navbar-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="ed-btn ed-btn-green" onClick={handleGoBack}>
            <span style={{ fontSize: 18 }}>⬅️</span> Nueva 
          </button>
          {['administrador', 'superAdmin'].includes(currentUserLS.rol) && (
            <button
              className="ed-btn ed-btn-stats"
              style={{
                background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(106,17,203,0.15)',
                border: 'none',
                padding: '8px 18px',
                transition: 'background 0.2s'
              }}
              onClick={() => navigate('/admin-dashboard')}
              onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)'}
              onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)'}
            >
              <span style={{ fontSize: 20, marginRight: 8 }}>📊</span>
              Estadísticas
            </button>
          )}
          <button className="ed-btn ed-btn-red" onClick={handleLogout}>
            <span style={{ fontSize: 18 }}>⏏️</span> Cerrar 
          </button>
        </div>
      </div>
      {/* Contenido principal */}
      <div className="ed-main-content">
        <div className="ed-table-card">
          <div className="ed-table-header">
            <span className="ed-table-title">📋 Solicitudes de Reparación</span>
            <div className="ed-table-controls">
              <input className="ed-input" placeholder="🔍 Buscar por nombre o teléfono..." value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
              <button className="ed-btn ed-btn-blue" onClick={handleScanQR}>📷 Buscar QR</button>
              <button className="ed-btn ed-btn-purple" onClick={handleUploadQR}>🖼️ Cargar imagen QR</button>
              <select className="ed-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Todos los estados</option>
                {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className="ed-select" value={filterTipoServicio} onChange={e => setFilterTipoServicio(e.target.value)}>
                <option value="">Ver ubicaciones</option>
                {tipoServicioOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <button className="ed-btn ed-btn-red" onClick={() => setShowEliminados(!showEliminados)}>
                {showEliminados ? 'Eliminados' : 'No eliminados'}
              </button>
              <button className="ed-btn ed-btn-orange" onClick={() => setShowDateFilter(!showDateFilter)}>
                📅 Filtrar por Fecha
              </button>
            </div>
            {showDateFilter && (
              <div className="ed-date-filter">
                <button
                  className="ed-btn ed-btn-blue"
                  onClick={() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    setDateFilterType('day');
                    setDateFilterValue(`${yyyy}-${mm}-${dd}`);
                  }}
                >
                  Hoy
                </button>
                <input
                  type="date"
                  className="ed-input"
                  onChange={e => {
                    setDateFilterType('day');
                    setDateFilterValue(e.target.value);
                  }}
                />
                <button
                  className="ed-btn ed-btn-blue"
                  onClick={() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    setDateFilterType('month');
                    setDateFilterValue(`${yyyy}-${mm}`);
                  }}
                >
                  Este Mes
                </button>
                <input
                  type="month"
                  className="ed-input"
                  onChange={e => {
                    setDateFilterType('month');
                    setDateFilterValue(e.target.value);
                  }}
                />
                <button
                  className="ed-btn ed-btn-blue"
                  onClick={() => {
                    const now = new Date();
                    setDateFilterType('year');
                    setDateFilterValue(`${now.getFullYear()}`);
                  }}
                >
                  Este Año
                </button>
                <input
                  type="number"
                  className="ed-input"
                  placeholder="Año"
                  onChange={e => {
                    setDateFilterType('year');
                    setDateFilterValue(e.target.value);
                  }}
                />
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleQrImageSelect} style={{ display: 'none' }} />
          </div>
          <div className="ed-table-responsive">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>📞 Teléfono</th>
                  <th>👤 Nombre</th>
                  <th>🔖 Estado</th>
                </tr>
              </thead>
              <tbody>
                {requestsToDisplay.length > 0 ? (
                  requestsToDisplay.map(orden => (
                    <tr
                      key={orden.id}
                      className={`order-row${orden.costo_acordado ? ' ed-row-eliminado' : ''}`}
                      onClick={() => handleRequestClick(orden)}
                    >
                      <td>
                        <div className="ed-table-phone">
                          <a href={`tel:${orden.dispositivo.cliente.telefono}`} className="ed-btn ed-btn-pink" onClick={e => e.stopPropagation()}>📞</a>
                          <a href={`https://wa.me/+51${orden.dispositivo.cliente.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="ed-btn ed-btn-green" onClick={e => e.stopPropagation()}>💬</a>
                          <span className="ed-table-phone-number">{orden.dispositivo.cliente.telefono || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 2 : 8}}>
                          <span style={{fontWeight: 600}}>
                            {`${orden.dispositivo.cliente.nombre.split(' ')[0].toUpperCase()} ${orden.dispositivo.cliente.apellido.split(' ')[0].toUpperCase()}`.length > 20
                              ? `${orden.dispositivo.cliente.nombre.split(' ')[0].toUpperCase()} ${orden.dispositivo.cliente.apellido.split(' ')[0].toUpperCase()}`.substring(0, 17) + '...'
                              : `${orden.dispositivo.cliente.nombre.split(' ')[0].toUpperCase()} ${orden.dispositivo.cliente.apellido.split(' ')[0].toUpperCase()}`}
                          </span>
                          {/* Fecha de la orden */}
                          <span style={{
                            fontSize: isMobile ? '12px' : '13px',
                            color: '#888',
                            marginLeft: isMobile ? 0 : 8,
                            marginTop: isMobile ? 2 : 0,
                            fontWeight: 400
                          }}>
                            {(() => {
                              // Mostrar SIEMPRE la fecha de solicitud (createdAt) en la tabla principal
                              if (!orden.createdAt) return null;
                              return new Date(orden.createdAt).toLocaleString('es-PE');
                            })()}
                          </span>
                        </div>
                      </td>
                      <td>{renderStatusBadge(orden.estado)}{orden.tipoServicio && <div className="ed-tipo-servicio">• {orden.tipoServicio}</div>}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">No se encontraron solicitudes que coincidan con la búsqueda</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalFiltered > limit && (
            <div className="ed-pagination">
              <button className="ed-btn" disabled={page === 1} onClick={handlePrevious}>⬅️</button>
              <span className="ed-pagination-info">Página {page} de {currentTotalPages}</span>
              <button className="ed-btn" disabled={page === currentTotalPages} onClick={handleNext}>➡️</button>
            </div>
          )}
        </div>
        <OsDetail 
          showDetailsModal={showDetailsModal} 
          setShowDetailsModal={setShowDetailsModal} 
          currentRequest={currentRequest} 
          onDeleteOrden={onDeleteOrden}
        />
        <QrScannerComponent
          show={showQrModal}
          onHide={() => setShowQrModal(false)}
          onScan={handleQrResult}
          title="Escanear código QR"
          initialMode={qrScanMode}
          hideOptions={qrScanMode === 'camera-only'}
        />

        {showUpdateMsg && (
          <NovedadesToast
            show={showUpdateMsg}
            onClose={() => {
              setShowUpdateMsg(false);
              localStorage.setItem('novedadesVersion', NOVEDADES_VERSION);
            }}
          />
        )}
      </div>
      <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999 }}>
        <GastoFloatingWidget />
      </div>
    </div>
  );
}

export default EmployeeDashboard;