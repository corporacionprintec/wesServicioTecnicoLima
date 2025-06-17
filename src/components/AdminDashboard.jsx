import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import es from 'date-fns/locale/es';
import ErrorBoundary from './common/ErrorBoundary';
import '../cssGeneral/adminDashboard.css';

import TechnicianStats from './AdminDashboard/TechnicianStats';
import TechnicianStatsPDFExport from './AdminDashboard/TechnicianStatsPDFExport';
import CierreCajaSection from './AdminDashboard/CierreCajaSection';

registerLocale('es', es);

const BASE_URL = 'https://servidorserviciotecnicolima-production.up.railway.app/tecnicosAdmin';
const API_URL = "https://servidorserviciotecnicolima-production.up.railway.app/ordenes";

// Utilidad robusta para parsear costo_total
function parseCostoTotal(valor) {
  if (typeof valor === 'number') return valor > 0 ? valor : 0;
  if (typeof valor === 'string') {
    // Elimina S/, comas, espacios
    const limpio = valor.replace(/[^\d.\-]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) || num <= 0 ? 0 : num;
  }
  return 0;
}

// Utilidad robusta para obtener el ID de técnico de una orden
function getTecnicoIdFromOrden(orden) {
  // Prioridad: dispositivo.tecnico.id > dispositivo.tecnico_id > tecnico_id raíz
  if (orden.dispositivo && orden.dispositivo.tecnico && orden.dispositivo.tecnico.id) {
    return String(orden.dispositivo.tecnico.id);
  }
  if (orden.dispositivo && orden.dispositivo.tecnico_id) {
    return String(orden.dispositivo.tecnico_id);
  }
  if (orden.tecnico_id) {
    return String(orden.tecnico_id);
  }
  return '';
}

const AdminDashboard = () => {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
};

const AdminDashboardContent = () => {
  const [tecnicos, setTecnicos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', apellido: '', telefono: '', rol: '', contrasena: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  const [showCRUD, setShowCRUD] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showCards, setShowCards] = useState(true);
  const [showCaja, setShowCaja] = useState(false);

  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // Filtros de ingresos
  const [filtroIngresos, setFiltroIngresos] = useState('hoy');
  const [fechaFiltro, setFechaFiltro] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  });
  const [anioFiltro, setAnioFiltro] = useState(() => {
    const d = new Date();
    return d.getFullYear().toString();
  });
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('todos');

  // NUEVO: Estado para el filtro de fecha único
  const [fechaCompletaFiltro, setFechaCompletaFiltro] = useState(new Date());
  // NUEVO: Estado para el modo de filtro ('dia', 'mes', 'anio')
  const [modoFecha, setModoFecha] = useState('dia');

  // Estado para el índice del carrusel de técnicos
  const [tecnicoCarouselIndex, setTecnicoCarouselIndex] = useState(0);

  // Función para obtener la fecha de una orden (puedes ajustar el campo según tu modelo)
  const getFechaOrden = (orden) => {
    // Intenta usar orden.fecha_entrega, si no existe usa orden.fecha_creacion
    return orden.fecha_entrega || orden.fecha_creacion || orden.createdAt || null;
  };

  // Función para filtrar órdenes según el filtro seleccionado y la fecha elegida
  const filtrarOrdenesPorFecha = (ordenes, filtro) => {
    return ordenes.filter(orden => {
      const fechaStr = getFechaOrden(orden);
      if (!fechaStr) return false;
      const fecha = new Date(fechaStr);
      if (filtro === 'hoy') {
        return fecha.toISOString().slice(0, 10) === fechaFiltro;
      }
      if (filtro === 'mes') {
        return fecha.toISOString().slice(0, 7) === mesFiltro;
      }
      if (filtro === 'anio') {
        return fecha.getFullYear().toString() === anioFiltro;
      }
      return true;
    });
  };

  // Filtro estricto para órdenes válidas (usado para ingresos y reparaciones)
  const isValidOrder = (orden, { periodo = 'todos', fecha = null, tecnicoId = null } = {}) => {
    const idTec = getTecnicoIdFromOrden(orden);
    if (!idTec || idTec === '0' || idTec === 'null' || idTec === 'undefined') return false;
    // Solo órdenes no eliminadas
    const noEliminado = orden.costo_acordado === null || orden.costo_acordado === undefined;
    if (!noEliminado) return false;
    // Solo estados válidos
    if (!(orden.estado === 'entregado' || orden.estado === 'completado' || orden.estado === 'en_proceso')) return false;
    // Solo órdenes con dispositivo.costo_total válido y positivo
    if (!orden.dispositivo || !orden.dispositivo.costo_total) return false;
    if (parseCostoTotal(orden.dispositivo.costo_total) <= 0) return false;
    // Solo para técnico específico si se pide
    if (tecnicoId && idTec !== String(tecnicoId)) return false;
    // Solo para el periodo correcto si se pide
    if (periodo !== 'todos' && fecha) {
      const fechaOrden = getFechaOrden(orden);
      if (!fechaOrden) return false;
      const fechaObj = new Date(fechaOrden);
      if (periodo === 'dia') {
        if (new Date(fechaObj).toISOString().slice(0, 10) !== new Date(fecha).toISOString().slice(0, 10)) return false;
      } else if (periodo === 'mes') {
        const anio = typeof fecha === 'string' ? parseInt(fecha.slice(0, 4), 10) : fecha.getFullYear();
        const mes = typeof fecha === 'string' ? parseInt(fecha.slice(5, 7), 10) : fecha.getMonth() + 1;
        if (fechaObj.getFullYear() !== anio || (fechaObj.getMonth() + 1) !== mes) return false;
      } else if (periodo === 'anio') {
        const anio = typeof fecha === 'string' ? parseInt(fecha.slice(0, 4), 10) : fecha.getFullYear();
        if (fechaObj.getFullYear() !== anio) return false;
      }
    }
    return true;
  };

  // --- INICIO FUNCIONES DE INGRESOS POR PAGOS ---
  const ingresosPorDiaPagos = (fecha, tecnicoId = 'todos') => {
    const fechaStr = new Date(fecha).toISOString().slice(0, 10);
    return pagos.filter(pago => {
      if (!pago.fecha_pago) return false;
      const pagoFecha = new Date(pago.fecha_pago).toISOString().slice(0, 10);
      if (pagoFecha !== fechaStr) return false;
      if (tecnicoId !== 'todos') {
        if (!pago.orden || !pago.orden.dispositivo) return false;
        const idTec = getTecnicoIdFromOrden(pago.orden);
        if (idTec !== String(tecnicoId)) return false;
      }
      return true;
    }).reduce((acc, pago) => acc + parseFloat(pago.monto || 0), 0);
  };
  const ingresosPorMesPagos = (fecha, tecnicoId = 'todos') => {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    return pagos.filter(pago => {
      if (!pago.fecha_pago) return false;
      const pagoFecha = new Date(pago.fecha_pago);
      if (pagoFecha.getFullYear() !== anio || (pagoFecha.getMonth() + 1) !== mes) return false;
      if (tecnicoId !== 'todos') {
        if (!pago.orden || !pago.orden.dispositivo) return false;
        const idTec = getTecnicoIdFromOrden(pago.orden);
        if (idTec !== String(tecnicoId)) return false;
      }
      return true;
    }).reduce((acc, pago) => acc + parseFloat(pago.monto || 0), 0);
  };
  const ingresosPorAnioPagos = (fecha, tecnicoId = 'todos') => {
    const anio = fecha.getFullYear();
    return pagos.filter(pago => {
      if (!pago.fecha_pago) return false;
      const pagoFecha = new Date(pago.fecha_pago);
      if (pagoFecha.getFullYear() !== anio) return false;
      if (tecnicoId !== 'todos') {
        if (!pago.orden || !pago.orden.dispositivo) return false;
        const idTec = getTecnicoIdFromOrden(pago.orden);
        if (idTec !== String(tecnicoId)) return false;
      }
      return true;
    }).reduce((acc, pago) => acc + parseFloat(pago.monto || 0), 0);
  };
  const ingresosTotalesPagos = (tecnicoId = 'todos') => {
    return pagos.filter(pago => {
      if (tecnicoId !== 'todos') {
        if (!pago.orden || !pago.orden.dispositivo) return false;
        const idTec = getTecnicoIdFromOrden(pago.orden);
        if (idTec !== String(tecnicoId)) return false;
      }
      return true;
    }).reduce((acc, pago) => acc + parseFloat(pago.monto || 0), 0);
  };
  // --- FIN FUNCIONES DE INGRESOS POR PAGOS ---

  // Reparaciones por técnico (solo excluye eliminadas, cuenta por id de técnico)
  const reparacionesPorTecnico = (periodo, fecha, tecnicoId) => {
    // Filtra solo por técnico y no eliminadas, ignora estado y costo_total
    const ordenesValidas = ordenes.filter(orden => {
      const idTec = getTecnicoIdFromOrden(orden);
      const noEliminado = orden.costo_acordado === null || orden.costo_acordado === undefined;
      // Filtrar por técnico
      if (tecnicoId && idTec !== String(tecnicoId)) return false;
      // Filtrar por fecha si corresponde
      if (periodo !== 'todos' && fecha) {
        const fechaOrden = getFechaOrden(orden);
        if (!fechaOrden) return false;
        const fechaObj = new Date(fechaOrden);
        if (periodo === 'dia') {
          if (new Date(fechaObj).toISOString().slice(0, 10) !== new Date(fecha).toISOString().slice(0, 10)) return false;
        } else if (periodo === 'mes') {
          const anio = typeof fecha === 'string' ? parseInt(fecha.slice(0, 4), 10) : fecha.getFullYear();
          const mes = typeof fecha === 'string' ? parseInt(fecha.slice(5, 7), 10) : fecha.getMonth() + 1;
          if (fechaObj.getFullYear() !== anio || (fechaObj.getMonth() + 1) !== mes) return false;
        } else if (periodo === 'anio') {
          const anio = typeof fecha === 'string' ? parseInt(fecha.slice(0, 4), 10) : fecha.getFullYear();
          if (fechaObj.getFullYear() !== anio) return false;
        }
      }
      return idTec && noEliminado;
    });
    if (tecnicoId === 'todos') {
      // Devuelve un objeto {tecnicoId: cantidad}
      const resultado = {};
      tecnicos.filter(t => t.rol === 'tecnico' || t.rol === 'administrador').forEach(tecnico => {
        resultado[tecnico.id] = ordenesValidas.filter(orden => getTecnicoIdFromOrden(orden) === String(tecnico.id)).length;
      });
      return resultado;
    } else {
      return ordenesValidas.length;
    }
  };

  const handleExportContacts = async () => {
    try {
      setExporting(true); 
     // Obtener TODAS las órdenes sin paginación
    const response = await fetch(`${API_URL}?page=1&limit=10000`);
    const data = await response.json();
    const todasLasOrdenes = data.data.ordenes;
    const contacts = [];
    todasLasOrdenes.forEach(orden => {
      const cliente = orden.dispositivo?.cliente;
      if (cliente) {
        contacts.push({
          nombre: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
          telefono: cliente.telefono || 'Sin teléfono'
        });
      }
    });

    let vcfContent = '';
    contacts.forEach(contact => {
      vcfContent += 'BEGIN:VCARD\n';
      vcfContent += 'VERSION:3.0\n';
      vcfContent += `FN:${contact.nombre}\n`;
      vcfContent += `TEL;TYPE=CELL:${contact.telefono}\n`;
      vcfContent += 'END:VCARD\n';
    });

      const blob = new Blob([vcfContent], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `printec-contacts-${new Date().toISOString().split('T')[0]}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exportando contactos:', error);
      alert('Error al exportar contactos');
    } finally {
      setExporting(false);
    }
  };

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
          navigate('/login');
        });
    } else {
      setIsLoadingAuth(false);
    }
  }, [currentUser, login, navigate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTecnicos = async () => {
    try {
      // Agregamos un timeout para evitar que la petición se quede colgada
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
      
      const response = await fetch(BASE_URL, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Limpiamos el timeout si la petición fue exitosa
      
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.warn('La respuesta de técnicos no es un array:', data);
        setTecnicos([]);
      } else {
        setTecnicos(data);
        setError('');
      }
    } catch (err) {
      console.error('Error al obtener técnicos:', err);
      setTecnicos([]); // Aseguramos que siempre haya un array aunque sea vacío
      setError('Error al obtener técnicos. Por favor, intenta recargar la página.');
    }
  };

  const fetchOrdenes = async () => {
    try {
      // Usar solo GET para obtener las órdenes
      const getResponse = await fetch(`${API_URL}?page=1&limit=10000`);
      if (getResponse.ok) {
        const getData = await getResponse.json();
        if (getData && getData.data && getData.data.ordenes) {
          setOrdenes(getData.data.ordenes);
          return;
        }
      }
      throw new Error('No se pudieron obtener las órdenes');
    } catch (err) {
      console.error('Error al obtener órdenes:', err);
      setOrdenes([]);
      setError('Error al cargar órdenes. Por favor, intenta recargar la página.');
    }
  };

  // Obtener pagos desde el backend
  const fetchPagos = async () => {
    try {
      const response = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/api/pagos?page=1&limit=10000');
      if (response.ok) {
        const data = await response.json();
        if (data && data.pagos) {
          setPagos(data.pagos);
          return;
        }
      }
      throw new Error('No se pudieron obtener los pagos');
    } catch (err) {
      console.error('Error al obtener pagos:', err);
      setPagos([]);
    }
  };

  return (
    <div className={`admin-dashboard ${isMobile ? 'mobile' : ''}`}>
      <div className="header">
        <h1>Bienvenido al Panel de Administración</h1>
        <div className="user-info">
          {currentUser ? (
            <span>Usuario: {currentUser.dni} - Rol: {currentUser.rol}</span>
          ) : (
            <span>Iniciando sesión...</span>
          )}
        </div>
      </div>
      <div className="content">
        <div className="sidebar">
          {/* Eliminado botón de Órdenes, solo quedan Caja y Exportar Contactos */}
          <button onClick={() => setShowCaja(true)} className={showCaja ? 'active' : ''}>Caja</button>
          <button onClick={handleExportContacts} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Exportar Contactos'}
          </button>
          <button
            className="button is-link"
            style={{ borderRadius: 12, fontWeight: 700, background: '#23263A', color: '#A5B4FC', border: '2px solid #6366f1', marginTop: 8 }}
            onClick={() => navigate('/employee-dashboard', { replace: true })}
          >
            <span className={window.innerWidth < 768 ? '' : 'mr-2'}>⬅️</span>
            {window.innerWidth >= 768 && 'Volver al Panel de Técnicos'}
          </button>
          <button
            className="button is-info"
            style={{ borderRadius: 12, fontWeight: 700, background: '#2563eb', color: '#fff', border: '2px solid #2563eb', marginTop: 8, marginBottom: 8 }}
            onClick={() => navigate('/admin-dashboard/tecnico-stats')}
          >
            <span className={window.innerWidth < 768 ? '' : 'mr-2'}>📊</span>
            Ver detalles técnicos
          </button>
        </div>
        <div className="main">
          {/* Solo se muestra la sección de Caja */}
          <CierreCajaSection />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
