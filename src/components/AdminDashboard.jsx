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
  const [success, setSuccess] = useState('');  
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      tecnicos.filter(t => t.rol === 'tecnico' || t.rol === 'administrador' || t.rol === 'superAdmin').forEach(tecnico => {
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

  const handleCreateTecnico = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Técnico creado exitosamente');
        setFormData({ nombre: '', apellido: '', telefono: '', rol: '', contrasena: '' });
        fetchTecnicos();
      } else {
        setError(data.message || 'Error al crear técnico');
      }
    } catch (err) {
      setError('Error al crear técnico');
    }
  };

  const handleUpdateTecnico = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Técnico actualizado exitosamente');
        setFormData({ nombre: '', apellido: '', telefono: '', rol: '', contrasena: '' });
        setEditingId(null);
        fetchTecnicos();
      } else {
        setError(data.message || 'Error al actualizar técnico');
      }
    } catch (err) {
      setError('Error al actualizar técnico');
    }
  };

  const handleDeleteTecnico = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este técnico?')) return;
    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSuccess('Técnico eliminado exitosamente');
        fetchTecnicos();
      } else {
        setError('Error al eliminar técnico');
      }
    } catch (err) {
      setError('Error al eliminar técnico');
    }
  };

  const handleEditTecnico = (tecnico) => {
    setFormData({
      nombre: tecnico.nombre,
      apellido: tecnico.apellido,
      telefono: tecnico.telefono,
      rol: tecnico.rol,
      contrasena: ''
    });
    setEditingId(tecnico.id);
  };

  // Handler para el formulario de técnicos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler para crear o actualizar técnico
  const handleSubmit = editingId ? handleUpdateTecnico : handleCreateTecnico;

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

  const [activeModule, setActiveModule] = useState('caja'); // 'caja', 'tecnicos', 'exportar', 'estadisticas'

  // Cierra sidebar al cambiar módulo en móvil
  useEffect(() => {
    if (sidebarOpen && isMobile) setSidebarOpen(false);
    // eslint-disable-next-line
  }, [activeModule]);

  // Cargar técnicos al montar el componente
  useEffect(() => {
    fetchTecnicos();
  }, []);

  return (
    <div className="admin-dashboard">
      {/* Botón hamburguesa solo en móvil */}
      <button
        className="sidebar-toggle"
        style={{ display: isMobile ? 'block' : 'none' }}
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú lateral"
      >
        <i className="fas fa-bars"></i>
      </button>
      {/* Backdrop para cerrar sidebar */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}
      <div className="content">
        <aside className={`sidebar${isMobile && sidebarOpen ? ' open' : ''}`}> 
          {/* Botón cerrar en sidebar móvil */}
          {isMobile && (
            <button
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', color: '#fff', border: 'none', fontSize: '2rem', zIndex: 2101 }}
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú lateral"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
          <button
            className={activeModule === 'tecnicos' ? 'active' : ''}
            onClick={() => setActiveModule('tecnicos')}
            aria-label="Gestionar Técnicos"
          >
            Gestionar Técnicos
          </button>
          <button
            className={activeModule === 'caja' ? 'active' : ''}
            onClick={() => setActiveModule('caja')}
            aria-label="Caja"
          >
            Caja
          </button>
          <button
            className={activeModule === 'exportar' ? 'active' : ''}
            onClick={() => setActiveModule('exportar')}
            aria-label="Exportar Contactos"
          >
            Exportar Contactos
          </button>
          <button
            className={activeModule === 'estadisticas' ? 'active' : ''}
            onClick={() => setActiveModule('estadisticas')}
            aria-label="Estadísticas"
          >
            Estadísticas
          </button>
          <button
            className={activeModule === 'panel' ? 'active' : ''}
            onClick={() => navigate('/employee-dashboard')}
            aria-label="Panel de Técnicos"
          >
            Panel de Técnicos
          </button>
          <button
            className={activeModule === 'listar' ? 'active' : ''}
            onClick={() => setActiveModule('listar')}
            aria-label="Listar Técnicos"
          >
            Listar Técnicos
          </button>
          {(currentUser.rol === 'superAdmin' || (currentUser.rol === 'administrador' && (String(currentUser.id) === '14' || String(currentUser.id) === '22'))) && (
            <button
              onClick={() => window.open('https://servidorserviciotecnicolima-production.up.railway.app/employee-dashboard', '_blank')}
              aria-label="Sucursal Ica"
              style={{ background: '#f59e42', color: '#fff', border: '2px solid #f59e42', borderRadius: 12, fontWeight: 700, marginTop: 8, marginBottom: 8 }}
            >
              Sucursal Ica
            </button>
          )}
        </aside>
    <main className="main">
      {/* Formulario de técnicos mejorado */}
      {activeModule === 'tecnicos' && (
        <section className="form-tecnico" style={{ background: 'linear-gradient(135deg, #b2f0ff 0%, #e0c3fc 100%)', borderRadius: '22px', boxShadow: '0 4px 32px #a770ef22', padding: '2.5rem 2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 900, fontSize: '2rem', color: '#23263a', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '1px' }}>
            <i className="fas fa-user-plus" style={{ color: '#43e97b', marginRight: '0.5em' }}></i> Crear Nuevo Técnico
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', justifyContent: 'center' }}>
            <input className="input" style={{ flex: '1 1 40%', minWidth: '220px' }} type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
            <input className="input" style={{ flex: '1 1 40%', minWidth: '220px' }} type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
            <input className="input" style={{ flex: '1 1 40%', minWidth: '220px' }} type="text" name="telefono" placeholder="DNI" value={formData.telefono} onChange={handleChange} required />
            <select className="input" style={{ flex: '1 1 40%', minWidth: '220px' }} name="rol" value={formData.rol} onChange={handleChange} required>
              <option value="">Seleccionar Rol</option>
              <option value="tecnico">Técnico</option>
              <option value="administrador">Administrador</option>
            </select>
            <input className="input" style={{ flex: '1 1 100%', minWidth: '220px' }} type="password" name="contrasena" placeholder="Contraseña" value={formData.contrasena} onChange={handleChange} required />
            <button type="submit" className="btn-crear-tecnico">
              <i className="fas fa-plus-circle"></i> {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </form>
          <h3 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#23263a', textAlign: 'center', marginTop: '2.5rem', letterSpacing: '1px' }}>
            <i className="fas fa-users" style={{ color: '#36d1c4', marginRight: '0.5em' }}></i> Lista de Técnicos
          </h3>
          <div style={{ marginTop: '1.5rem' }}>
            {tecnicos.map((tecnico, idx) => (
              <div className="card-tecnico" key={tecnico.id || idx}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2em' }}>
                  <i className="fas fa-user-tie fa-2x" style={{ color: '#fff', background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '50%', padding: '0.5em' }}></i>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1em', letterSpacing: '0.5px' }}>{tecnico.nombre} {tecnico.apellido}</div>
                    <div className="tag">{tecnico.rol}</div>
                    <div style={{ fontSize: '0.95em', color: '#fff9', marginTop: '0.2em' }}>DNI: {tecnico.telefono}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.7em' }}>
                    <button className="ed-btn ed-btn-blue" title="Editar" onClick={() => handleEditTecnico(tecnico)}>
                      <span role="img" aria-label="Editar">✏️</span>
                    </button>
                    <button className="ed-btn ed-btn-red" title="Eliminar" onClick={() => handleDeleteTecnico(tecnico.id)}>
                      <span role="img" aria-label="Eliminar">🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {activeModule === 'caja' && (
              <CierreCajaSection />
            )}
            {activeModule === 'exportar' && (
              <div className="box has-text-centered" style={{maxWidth: 500, margin: '2rem auto'}}>
                <h2 className="title is-5 mb-4">Exportar Contactos</h2>
                <button className={`button is-info is-large ${exporting ? 'is-loading' : ''}`} onClick={handleExportContacts} disabled={exporting}>
                  <span className="icon"><i className="fas fa-address-book"></i></span>
                  <span>{exporting ? 'Exportando...' : 'Exportar Contactos'}</span>
                </button>
              </div>
            )}
            {activeModule === 'estadisticas' && (
              <div className="box has-text-centered" style={{maxWidth: 700, margin: '2rem auto'}}>
                <h2 className="title is-5 mb-4">Estadísticas Técnicos</h2>
                <button className="button is-link is-large" onClick={() => navigate('/admin-dashboard/tecnico-stats')}>
                  <span className="icon"><i className="fas fa-chart-bar"></i></span>
                  <span>Ver Estadísticas</span>
                </button>
              </div>
            )}
            {activeModule === 'listar' && (
      <section className="form-tecnico" style={{ background: 'linear-gradient(135deg, #23263a 0%, #6366f1 100%)', borderRadius: '22px', boxShadow: '0 4px 32px #23263a22', padding: '2.5rem 2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 900, fontSize: '2rem', color: '#fff', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '1px' }}>
          <i className="fas fa-list" style={{ color: '#43e97b', marginRight: '0.5em' }}></i> Lista de Técnicos y Administradores
        </h2>
        <div style={{ marginTop: '1.5rem' }}>
          {tecnicos.length === 0 && <div style={{color:'#fff',textAlign:'center'}}>No hay técnicos ni administradores registrados.</div>}
          {tecnicos.filter(t => t.rol === 'tecnico' || t.rol === 'admin' || t.rol === 'administrador' || t.rol === 'superAdmin').map((tecnico, idx) => (
            <div className="card-tecnico" key={tecnico.id || idx}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2em' }}>
                <i className="fas fa-user-tie fa-2x" style={{ color: '#fff', background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '50%', padding: '0.5em' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1em', letterSpacing: '0.5px' }}>{tecnico.nombre} {tecnico.apellido}</div>
                  <div className="tag">{tecnico.rol}</div>
                  <div style={{ fontSize: '0.95em', color: '#fff9', marginTop: '0.2em' }}>DNI: {tecnico.telefono}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.7em' }}>
                  <button className="ed-btn ed-btn-blue" title="Editar" onClick={() => handleEditTecnico(tecnico)}><i className="fas fa-edit"></i></button>
                  <button className="ed-btn ed-btn-red" title="Eliminar" onClick={() => handleDeleteTecnico(tecnico.id)}><i className="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}
    </main>
  </div>
</div>
  );
};

export default AdminDashboard;
