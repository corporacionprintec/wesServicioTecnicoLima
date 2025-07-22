import { useState, useEffect, useCallback, useRef } from "react";
import NotesSection from "./OsDetailComponents/NotesSection";
import ReceiptGenerator from "./OsDetailComponents/ReceiptGenerator";

import 'bulma/css/bulma.min.css';

// Importar los componentes modulares directamente
import QrVinculador from "./common/QrVinculador";
import MachineHistoryTable from "./OsDetailComponents/MachineHistoryTable";
import DiagnosisForm from "./OsDetailComponents/DiagnosisForm";
import ClientInfoCard from "./OsDetailComponents/ClientInfoCard";
import DeviceInfoCard from "./OsDetailComponents/DeviceInfoCard";
import ProblemDescriptionCard from "./OsDetailComponents/ProblemDescriptionCard";
import StatusUpdateCard, { DeliverySlider } from "./OsDetailComponents/StatusUpdateCard";
import LocationModal from "./OsDetailComponents/LocationModal";
import ReceiptActions from "./OsDetailComponents/ReceiptActions";

// URL base para el servidor local
const BASE_URL = 'https://servidorserviciotecnicolima-production.up.railway.app';

// Función auxiliar para extraer el ID de un enlace de Google Drive
const extractFileIdFromUrl = (url) => {
  const regex = /\/file\/d\/([^/]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const OsDetail = ({ showDetailsModal, setShowDetailsModal, currentRequest, onDeleteOrden }) => {
  // Estados generales (move all useState to top)
  const [allDataOfCurrentRequest, setAllDataOfCurrentRequest] = useState(null);
  const [audioData, setAudioData] = useState({ audioUrl: null });
  const [comment, setComment] = useState("");
  const [qrResult, setQrResult] = useState(null);
  const [machineHistory, setMachineHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasCamera, setHasCamera] = useState(null);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');

  //estado para manejar la seleccion y habilitacion del orden 
  const [selectedTipoServicio,setSelectedTipoServicio] = useState('');
  const [canVincular,setCanVincular] = useState(false);

  // Estados para actualizar el dispositivo (diagnóstico e imagen)

  const [newOrderType, setNewOrderType] = useState(""); // Se ingresa el diagnóstico
  const [newOrderImage, setNewOrderImage] = useState(null); // Archivo de imagen
  const [showModelInput, setShowModelInput] = useState(false);
  const [dniTecnico, setDniTecnico] = useState("");

  // Estado para las notas
  const [notes, setNotes] = useState([]);

  // Estado para Toast
  const [toastMessage, setToastMessage] = useState({ show: false, text: "", variant: "" });

  // Estado para la generación de PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // URL del recibo en Google Drive
  const [reciboURL, setReciboURL] = useState(null);

  // Variables derivadas
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingDiagnostico, setIsUpdatingDiagnostico] = useState(false);

  // Estado para tabs
  const [activeTab, setActiveTab] = useState('details');

  // Estado para mostrar los botones de estado
  const [showStatusButtons, setShowStatusButtons] = useState(false);

  // Estado para pagos
  const [pagos, setPagos] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({ monto: '', metodo_pago: '', fecha_pago: '' });
  const [isSavingPago, setIsSavingPago] = useState(false);

  // Estado para el costo total (usado en diagnóstico y pagos)
  const [costoTotal, setCostoTotal] = useState("");

  // Estado para edición de cliente
  const [isEditingCliente, setIsEditingCliente] = useState(false);
  const [editedNombre, setEditedNombre] = useState("");
  const [editedApellido, setEditedApellido] = useState("");
  const [editedNombreApellido, setEditedNombreApellido] = useState("");
  const [isSavingCliente, setIsSavingCliente] = useState(false);

  const [editedTelefono, setEditedTelefono] = useState("");

  // Bandera para saber si hay que enviar WhatsApp tras actualizar recibo
  const [pendingWhatsApp, setPendingWhatsApp] = useState(false);
  // Ref local para evitar múltiples aperturas de WhatsApp
  const whatsappOpenedRef = useRef(false);
  // Función para mostrar el técnico que recibió
  const renderTecnicoRecibio = useCallback(() => {
    if (!allDataOfCurrentRequest || !allDataOfCurrentRequest.data || !allDataOfCurrentRequest.data.dispositivo) return null;
    const disp = allDataOfCurrentRequest.data.dispositivo;
    const tecnicoRecibioObj = disp?.tecnicoRecibio || disp?.tecnico_recibio;
    if (tecnicoRecibioObj && typeof tecnicoRecibioObj === 'object' && (tecnicoRecibioObj.nombre || tecnicoRecibioObj.apellido)) {
      return (
        <span style={{ marginRight: window.innerWidth < 769 ? 4 : 8, background: '#f5e960', color: '#23263A', borderRadius: 5, padding: window.innerWidth < 769 ? '1.5px 5px' : '2px 8px', fontWeight: 700, display: 'inline-block', fontSize: window.innerWidth < 769 ? '0.78em' : '1em', minWidth: 0 }}>
          <b>Recibió:</b> {`${tecnicoRecibioObj.nombre || ''} ${tecnicoRecibioObj.apellido || ''}`.trim()}
        </span>
      );
    } else if (typeof tecnicoRecibioObj === 'number' || typeof tecnicoRecibioObj === 'string') {
      return (
        <span style={{ marginRight: window.innerWidth < 769 ? 4 : 8, background: '#f5e960', color: '#23263A', borderRadius: 5, padding: window.innerWidth < 769 ? '1.5px 5px' : '2px 8px', fontWeight: 700, display: 'inline-block', fontSize: window.innerWidth < 769 ? '0.78em' : '1em', minWidth: 0 }}>
          <b>Recibió:</b> ID: {tecnicoRecibioObj}
        </span>
      );
    }
    return null;
  }, [allDataOfCurrentRequest]);

  // useEffect para abrir WhatsApp solo cuando pendingWhatsApp está activo y reciboURL cambió DESPUÉS de actualizar el detalle
  useEffect(() => {
    if (
      pendingWhatsApp &&
      reciboURL &&
      allDataOfCurrentRequest?.data?.dispositivo?.cliente?.telefono &&
      !whatsappOpenedRef.current
    ) {
      setPendingWhatsApp(false); // Desactivar bandera ANTES de abrir WhatsApp para evitar múltiples ventanas
      whatsappOpenedRef.current = true;
      setTimeout(() => {
        whatsappOpenedRef.current = false;
      }, 1000);
      const telefono = allDataOfCurrentRequest.data.dispositivo.cliente.telefono;
      let telefonoFormateado = telefono.replace(/\D/g, '');
      if (!telefonoFormateado.startsWith('51') && telefonoFormateado.length === 9) {
        telefonoFormateado = '51' + telefonoFormateado;
      }
      const mensaje = `Hola, aquí está el recibo de servicio técnico de Importaciones Printec: ${reciboURL}`;
      const whatsappURL = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappURL, '_blank');
    }
  }, [pendingWhatsApp, reciboURL, allDataOfCurrentRequest]);

  // Función para enviar el recibo por WhatsApp
  const handleSendWhatsApp = useCallback(() => {
    const telefono = allDataOfCurrentRequest?.data?.dispositivo?.cliente?.telefono;
    if (!telefono) {
      showToast("No se encontró el número de teléfono del cliente.", "warning");
      return;
    }
    let telefonoFormateado = telefono.replace(/\D/g, '');
    if (!telefonoFormateado.startsWith('51') && telefonoFormateado.length === 9) {
      telefonoFormateado = '51' + telefonoFormateado;
    }
    const mensaje = `Hola, aquí está el recibo de servicio técnico de Importaciones Printec: ${reciboURL}`;
    const whatsappURL = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappURL, '_blank');
  }, [allDataOfCurrentRequest, reciboURL]);

  // Función para manejar la exportación del recibo
  const handleExportReceipt = useCallback(() => {
    // Verificar que exista un diagnóstico antes de generar el recibo
    if (!allDataOfCurrentRequest?.data?.dispositivo?.diagnostico) {
      showToast("Por favor, realiza tu diagnóstico primero", "warning");
      return;
    }
    
    setIsGeneratingPDF(true);
  }, [allDataOfCurrentRequest]);
  
  // Función de callback para cuando el PDF se genera correctamente
  const handlePDFSuccess = useCallback(async () => {
    setIsGeneratingPDF(false);
    showToast("Recibo exportado correctamente", "success");
    // Después de generar el PDF, actualizar el detalle y SOLO después activar el envío a WhatsApp
    if (allDataOfCurrentRequest?.data?.id) {
      await getCurrentRequest(allDataOfCurrentRequest.data.id);
      setPendingWhatsApp(true); // Esto abrirá WhatsApp solo después de que el detalle y el reciboURL estén actualizados
    }
  }, [allDataOfCurrentRequest, getCurrentRequest]);

  // Función de callback para cuando hay un error al generar el PDF
  const handlePDFError = useCallback((error) => {
    setIsGeneratingPDF(false);
    showToast("Error al generar el recibo: " + error.message, "danger");
  }, []);

  const showToast = useCallback((text, variant = "info") => {
    setToastMessage({ show: true, text, variant });
    setTimeout(() => {
      setToastMessage({ show: false, text: "", variant: "" });
    }, 3000);
  }, []);

  const renderStatusBadge = useCallback((status) => {
    switch (status) {
      case "pendiente":
        return <span className="badge badge-warning">Pendiente</span>;
      case "en_proceso":
        return <span className="badge badge-info">Diagnosticado</span>;
      case "entregado":
        return <span className="badge badge-dark">Entregado</span>;
      case "cancelado":
        return <span className="badge badge-danger">En Abandono</span>;
      default:
        return <span className="badge badge-secondary">Desconocido</span>;
    }
  }, []);

  // Actualiza la URL del audio grabado
  const handleAudioRecorded = useCallback((audioUrl) => {
    setAudioData({ audioUrl });
  }, []);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!currentRequest) return;
    try {
      // Si el nuevo estado es "entregado", actualizar tecnico_entrego
      if (newStatus === "entregado" && allDataOfCurrentRequest?.data?.dispositivo?.id) {
        // Obtener el ID del técnico autenticado
        let tecnicoEntregoId = null;
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          tecnicoEntregoId = parsedUser.id;
        }
        if (tecnicoEntregoId) {
          // Llamar al endpoint para actualizar tecnico_entrego
          const dispositivoId = allDataOfCurrentRequest.data.dispositivo.id;
          const responseTecnico = await fetch(
            `${BASE_URL}/api/dispositivos/${dispositivoId}/tecnico-entrego`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tecnico_entrego: tecnicoEntregoId })
            }
          );
          const dataTecnico = await responseTecnico.json();
          if (!responseTecnico.ok) {
            showToast(dataTecnico.message || "Error al actualizar técnico que entrega.", "warning");
          } else {
            console.log("tecnico_entrego actualizado:", dataTecnico);
          }
        }
      }
      // Actualizar el estado de la orden
      const response = await fetch(
        `${BASE_URL}/ordenes/${currentRequest.id}?estado=${newStatus}`,
        { method: "PATCH" }
      );
      const data = await response.json();
      if (data.status === "success") {
        // Refrescar los datos de la orden para reflejar el nuevo estado
        if (currentRequest?.id) {
          const detalleResp = await fetch(`${BASE_URL}/ordenes/${currentRequest.id}`);
          const detalleData = await detalleResp.json();
          if (detalleData.status === "success") {
            setAllDataOfCurrentRequest(detalleData);
          } else {
            setAllDataOfCurrentRequest(data); // fallback
          }
        } else {
          setAllDataOfCurrentRequest(data);
        }
        console.log("allDataOfCurrentRequest:", data);
      } else {
        showToast(data.message, "warning");
      }
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      showToast("Hubo un error al actualizar el estado.", "danger");
    }
  }, [currentRequest, showToast, allDataOfCurrentRequest]);

  const handleVincularQR = useCallback(async () => {
    setIsUpdating(true);
    if (!qrResult || !qrResult.data) {
      showToast("No hay QR para vincular.", "warning");
      setIsUpdating(false);
      return;
    }

    const ordenId= allDataOfCurrentRequest?.data?.id;
    const dispositivoId= allDataOfCurrentRequest?.data?.dispositivo?.id;

    if (!dispositivoId) {
      showToast("No se encontró el dispositivo para vincular.", "warning");
      setIsUpdating(false);
      return;
    }

    try {
      // Actualizar primero el tipo de servicio
      const tipoServicioResponse = await fetch(
        `${BASE_URL}/ordenes/${ordenId}/tipo-servicio`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipoServicio: selectedTipoServicio
          })
        }
      );

      if (!tipoServicioResponse.ok) {
        showToast("Error al actualizar el tipo de servicio.", "warning");
        setIsUpdating(false);
        return;
      }

      // Obtener el ID del técnico autenticado desde localStorage
      let tecnicoRecibioId = null;
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        tecnicoRecibioId = parsedUser.id;
      }

      const response = await fetch(
        `${BASE_URL}/dispositivoscanup/${dispositivoId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            qr_scan: qrResult.data,
            tecnico_recibio: tecnicoRecibioId
          }),
        }
      );
      const data = await response.json();
      // LOG: mostrar respuesta del backend
      console.log("Respuesta backend (vincular QR):", data);
      if (response.ok) {
        showToast("QR vinculado correctamente.", "success");
        setAllDataOfCurrentRequest((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            dispositivo: {
              ...prev.data.dispositivo,
              qr_scan: data.dispositivo?.qr_scan || qrResult.data
            },
          },
        }));
      } else {
        showToast(data.message || "Error al vincular el QR.", "warning");
      }
    } catch (error) {
      // LOG: mostrar error
      console.error("Error al vincular el QR:", error);
      showToast("Error al vincular el QR: " + error.message, "danger");
    } finally {
      setIsUpdating(false);
    }
  }, [qrResult, allDataOfCurrentRequest, selectedTipoServicio, showToast]);

  const handleUpdateLocation = useCallback(async () => {
    if (destinationLocation) {
      const ordenId = allDataOfCurrentRequest?.data?.id;
      try {
        const response = await fetch(
          `${BASE_URL}/ordenes/${ordenId}/tipo-servicio`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipoServicio: destinationLocation
            })
          }
        );
        
        if (response.ok) {
          showToast("Ubicación actualizada correctamente", "success");
          setCurrentLocation(destinationLocation);
          setShowLocationModal(false);
        } else {
          showToast("Error al actualizar la ubicación", "danger");
        }
      } catch (error) {
        showToast("Error al actualizar la ubicación", "danger");
      }
    } else {
      showToast("Por favor seleccione una ubicación", "warning");
    }
  }, [allDataOfCurrentRequest, destinationLocation, showToast]);

  const handleUpdateDevice = useCallback(async () => {
    // Validaciones iniciales
    if (!newOrderType.trim()) {
      showToast("Por favor, ingrese un diagnóstico.", "warning");
      return;
    }

    const dispositivoId = allDataOfCurrentRequest?.data?.dispositivo?.id;
    if (!dispositivoId) {
      showToast("Error: No se encontró el ID del dispositivo", "danger");
      return;
    }

    setIsUpdatingDiagnostico(true);

    try {
      // Obtener ID del técnico del localStorage
      let tecnicoId = null;
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        tecnicoId = parsedUser.id;
      }

      if (!tecnicoId) {
        showToast("Error: No se pudo identificar al técnico. Por favor, inicie sesión nuevamente.", "danger");
        return;
      }

      // Preparar datos para enviar
      const formData = new FormData();
      formData.append("diagnostico", newOrderType.trim());
      formData.append("dni_tecnico", dniTecnico);
      formData.append("costo_total", costoTotal || "0"); // Usar el valor ingresado por el técnico
      formData.append("tecnico_id", tecnicoId);

      if (newOrderImage) {
        formData.append("file", newOrderImage);
      }

      // 1. Actualizar diagnóstico y subir imagen
      const response = await fetch(
        `${BASE_URL}/api/dispositivos/${dispositivoId}/imagen-diagnostico`,
        {
          method: "PUT",
          body: formData,
        }
      );

      let responseData = {};
      try {
        responseData = await response.json();
        console.log("[Diagnóstico] Respuesta del servidor:", responseData);
      } catch (e) {
        console.error("[Diagnóstico] Error al procesar respuesta:", e);
        throw new Error("Error al procesar la respuesta del servidor");
      }

      if (!response.ok) {
        throw new Error(responseData.message || "Error al actualizar el diagnóstico");
      }

      // 2. Actualizar QR y técnico si es necesario
      const qrScan = allDataOfCurrentRequest?.data?.dispositivo?.qr_scan;
      if (qrScan) {
        console.log("[Diagnóstico] Actualizando QR y técnico...");
        const detallesResponse = await fetch(
          `${BASE_URL}/dispositivoscanup/${dispositivoId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              qr_scan: qrScan,
              tecnico_id: tecnicoId
            }),
          }
        );

        const detallesData = await detallesResponse.json();
        if (!detallesResponse.ok) {
          console.warn("[Diagnóstico] Error al actualizar QR y técnico:", detallesData);
          showToast("Diagnóstico guardado, pero hubo un error al actualizar detalles adicionales", "warning");
        }
      }

      // 3. Actualizar estado y UI
      await handleStatusChange("en_proceso");
      setAllDataOfCurrentRequest((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          dispositivo: {
            ...prev.data.dispositivo,
            ...responseData.dispositivo,
            diagnostico: newOrderType.trim(),
            costo_total: 0,
            tecnico_id: tecnicoId
          },
        },
      }));
      showToast("✅ Diagnóstico guardado correctamente", "success");
      setShowModelInput(false);
      // Recargar datos de la orden para actualizar costoTotal y otros campos
      await getCurrentRequest(allDataOfCurrentRequest?.data?.id);
      // Ahora SÓLO generar el PDF, el WhatsApp se activa después de actualizar el detalle tras el PDF
      setIsGeneratingPDF(true);
    } catch (error) {
      console.error("[Diagnóstico] Error:", error);
      showToast("❌ " + (error.message || "Error al guardar el diagnóstico"), "danger");
    } finally {
      setIsUpdatingDiagnostico(false);
    }
  }, [allDataOfCurrentRequest, costoTotal, dniTecnico, handleStatusChange, newOrderImage, newOrderType, showToast]);

  const handleAddNote = useCallback(() => {
    if (!comment.trim()) {
      showToast("Por favor, ingresa un comentario.", "warning");
      return;
    }
    const newNote = {
      id: notes.length + 1,
      text: comment,
      date: new Date().toLocaleString(),
    };
    setNotes([...notes, newNote]);
    setComment("");
  }, [comment, notes, showToast]);

  // Función para registrar un pago
  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!nuevoPago.monto || !nuevoPago.metodo_pago) {
      showToast("Completa todos los campos del pago", "warning");
      return;
    }
    setIsSavingPago(true);
    try {
      const ordenId = allDataOfCurrentRequest?.data?.id;
      // Convertir el valor del input (local) a 'YYYY-MM-DD HH:mm:ss' en hora local
      let fechaPago = nuevoPago.fecha_pago;
      if (fechaPago) {
        // fechaPago es 'YYYY-MM-DDTHH:mm'
        const [date, time] = fechaPago.split('T');
        fechaPago = `${date} ${time}:00`;
      }
      const response = await fetch(`${BASE_URL}/api/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orden_id: ordenId,
          monto: nuevoPago.monto,
          metodo_pago: nuevoPago.metodo_pago,
          fecha_pago: fechaPago,
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPagos((prev) => [...prev, data]);
        setNuevoPago({ monto: '', metodo_pago: '', fecha_pago: '' });
        showToast("Pago registrado correctamente", "success");
        await getCurrentRequest(ordenId);
        // Cambiar automáticamente a entregado
        await handleStatusChange("entregado");
      } else {
        showToast(data.error || data.message || "Error al registrar el pago", "danger");
      }
    } catch (error) {
      showToast("Error al registrar el pago: " + error.message, "danger");
      console.error("[Pago] Error al registrar el pago:", error);
    } finally {
      setIsSavingPago(false);
    }
  };

  useEffect(() => {
    async function checkCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((device) => device.kind === "videoinput");
          setHasCamera(videoDevices.length > 0);
        } else {
          setHasCamera(false);
        }
      } catch (error) {
        console.error("Error al verificar la cámara:", error);
        setHasCamera(false);
      }
    }
    checkCamera();
  }, []);

  // Mueve getCurrentRequest fuera del useEffect para poder llamarla desde otros lugares
  async function getCurrentRequest(id) {
    try {
      // Obtener detalles de la orden
      const response = await fetch(
        `${BASE_URL}/ordenes/${id}`
      );
      const data = await response.json();
      setAllDataOfCurrentRequest(data);
      
      // Obtener los pagos de la orden
      try {
        const pagosResponse = await fetch(
          `${BASE_URL}/api/pagos/orden/${id}`
        );
        const pagosData = await pagosResponse.json();
        if (pagosResponse.ok) {
          // Log de depuración de pagos
          console.log("[Pagos] Pagos cargados:", pagosData);
          setPagos(Array.isArray(pagosData) ? pagosData : []);
        } else {
          console.error("[Pagos] Error al cargar pagos:", pagosData);
          setPagos([]);
        }
      } catch (error) {
        console.error("[Pagos] Error al cargar pagos:", error);
        setPagos([]);
      }

      if (data?.data?.dispositivo?.recibo) {
        setReciboURL(data.data.dispositivo.recibo);
      }
      if (data?.data?.dispositivo?.costo_total) {
        setCostoTotal(data.data.dispositivo.costo_total.toString());
      } else {
        setCostoTotal("");
      }
    } catch (error) {
      console.error("Error al obtener la solicitud:", error);
      showToast("Error al cargar los datos de la solicitud", "danger");
    }
  }

  // En el useEffect, reemplaza la función interna por la global
  useEffect(() => {
    if (showDetailsModal && currentRequest?.id) {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setDniTecnico(`${parsedUser.name} ${parsedUser.lastname}`);
      }
      getCurrentRequest(currentRequest?.id);
      // Inicializar edición de cliente
      setIsEditingCliente(false);
      setIsSavingCliente(false);
      setEditedNombre("");
      setEditedApellido("");
      setEditedTelefono("");
    } else {
      // Resetear estados cuando se cierra el modal
      setAllDataOfCurrentRequest(null);
      setQrResult(null);
      setMachineHistory(null);
      setNewOrderType("");
      setNewOrderImage(null);
      setCostoTotal("");
      setShowModelInput(false);
      setNotes([]);
      setComment("");
      setShowHistory(false);
    }
  }, [showDetailsModal, currentRequest]);

  // useEffect para obtener el historial automáticamente cuando el QR está vinculado
  useEffect(() => {
    if (allDataOfCurrentRequest?.data?.dispositivo?.qr_scan) {
      fetch(
        `${BASE_URL}/dispositivos/validar-qr?qr=${encodeURIComponent(
          allDataOfCurrentRequest.data.dispositivo.qr_scan
        )}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.valid && Array.isArray(data.data) && data.data.length > 0) {
            const newEntries = data.data.map((item, index) => ({
              id: index + 1,
              fecha: item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('es-PE')
                : '',
              descripcion:
                item.problemas_descritos && item.problemas_descritos.length > 0
                  ? item.problemas_descritos[0]
                  : "Sin descripción",
              cliente: {
                nombre: item.nombre || "",
                apellido: item.apellido || "",
                telefono: item.telefono || "",
              },
              dispositivo: {
                tipo_dispositivo: item.tipo_dispositivo || "",
                marca: item.marca || "",
                modelo: item.modelo || "",
                diagnostico: item.diagnostico && item.diagnostico !== "" ? item.diagnostico : "Sin diagnóstico",
                imagenen_diagnostico:
                  item.imagenen_diagnostico && item.imagenen_diagnostico !== ""
                    ? item.imagenen_diagnostico
                    : "",
                dni_tecnico: dniTecnico,
              },
            }));
            setMachineHistory(newEntries);
          } else {
            setMachineHistory([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching machine history:", error);
          showToast("Error al obtener historial de la máquina.", "danger");
        });
    } else {
      setMachineHistory(null);
    }
  }, [allDataOfCurrentRequest, dniTecnico, showToast]);

  // Si el componente aún no tiene datos, no renderizar nada
  if (!showDetailsModal) {
    return null;
  }

  return (
    <div
      className="modal is-active"
      style={{
        zIndex: 9999,
        overflowY: 'auto', // Ensure vertical scrolling is enabled
        height: '100vh', // Set the height to full viewport height
        display: 'flex',
        flexDirection: 'column',
        ...(window.innerWidth < 769
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
            }
          : {}),
      }}
    >
      <div className="modal-background" style={{ background: 'rgba(30, 50, 80, 0.18)' }}></div>
      <div
        className="modal-card"
        style={{
          width: '100vw',
          minHeight: '100vh',
          maxWidth: '100vw',
          margin: 0,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          boxShadow: 'none',
          ...(window.innerWidth >= 769
            ? {
                width: '95vw',
                maxWidth: 820,
                minHeight: 'auto',
                maxHeight: '90vh',
                margin: '3vh auto',
                borderRadius: 16,
                boxShadow: 'none',
              }
            : {}),
        }}
      >
        {allDataOfCurrentRequest && (
          <>
            <header
              className="modal-card-head has-background-link"
              style={{
                borderRadius: 0,
                padding: window.innerWidth >= 769 ? '1rem 1.2rem' : '1.5rem 1.2rem 1.2rem 1.2rem',
                minHeight: window.innerWidth >= 769 ? 48 : 70,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                position: 'relative',
              }}
            >
              <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <p className="modal-card-title has-text-white is-size-5-mobile is-size-4-tablet" style={{ wordBreak: 'break-word', marginBottom: 0 }}>
                  Solicitud {allDataOfCurrentRequest.data.ticket}
                  <span style={{ marginLeft: '0.7em' }}>
                    <span className={`tag is-info is-light is-size-7-mobile`}>{allDataOfCurrentRequest.data.estado === 'en_proceso' ? 'diagnosticado' : allDataOfCurrentRequest.data.estado}</span>
                  </span>
                </p>
                <button className="delete is-large" aria-label="close" onClick={() => setShowDetailsModal(false)} style={{ marginLeft: 10, marginTop: 0, fontSize: '1.5em', backgroundColor: '#ff3860', color: '#fff', border: 'none', padding: '0.5em 1em', borderRadius: '8px', position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}></button>
              </div>
              {/* Mostrar ambos técnicos si existen */}
              <div className="has-text-white is-size-7-mobile" style={{ fontWeight: 500, marginTop: 4, marginLeft: 2, display: 'flex', gap: window.innerWidth < 769 ? 6 : 12 }}>
                {renderTecnicoRecibio()}
                {/* Diagnóstico y Entregó, igual que antes */}
                {allDataOfCurrentRequest.data.dispositivo?.tecnico && (
                  <span style={{ marginRight: window.innerWidth < 769 ? 4 : 8, background: '#60b0f5', color: '#fff', borderRadius: 5, padding: window.innerWidth < 769 ? '1.5px 5px' : '2px 8px', fontWeight: 700, display: 'inline-block', fontSize: window.innerWidth < 769 ? '0.78em' : '1em', minWidth: 0 }}>
                    <b>Diagnóstico:</b> {`${allDataOfCurrentRequest.data.dispositivo.tecnico.nombre} ${allDataOfCurrentRequest.data.dispositivo.tecnico.apellido}`}
                  </span>
                )}
                {allDataOfCurrentRequest.data.dispositivo?.tecnicoEntrego && (
                  <span style={{ background: '#5be17a', color: '#1a3a1a', borderRadius: 5, padding: window.innerWidth < 769 ? '1.5px 5px' : '2px 8px', fontWeight: 700, display: 'inline-block', fontSize: window.innerWidth < 769 ? '0.78em' : '1em', minWidth: 0 }}>
                    <b>Entregó:</b> {`${allDataOfCurrentRequest.data.dispositivo.tecnicoEntrego.nombre} ${allDataOfCurrentRequest.data.dispositivo.tecnicoEntrego.apellido}`}
                  </span>
                )}
              </div>
              {/* Teléfono y WhatsApp del cliente */}
              {allDataOfCurrentRequest?.data?.dispositivo?.cliente?.telefono && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em', marginTop: 10, background: 'rgba(255,255,255,0.13)', borderRadius: 8, padding: '6px 14px', boxShadow: '0 2px 8px rgba(91,134,229,0.09)' }}>
                  <a
                    href={`tel:${allDataOfCurrentRequest.data.dispositivo.cliente.telefono}`}
                    className="button is-small"
                    style={{ background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color: '#1a3a1a', border: 'none', borderRadius: 6, boxShadow: '0 1px 4px #43e97b33', fontSize: '1.25em', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, padding: 0 }}
                    title="Llamar al cliente"
                    onClick={e => e.stopPropagation()}
                  >
                    📞
                  </a>
                  <a
                    href={`https://wa.me/+51${allDataOfCurrentRequest.data.dispositivo.cliente.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button is-small"
                    style={{ background: 'linear-gradient(90deg, #25d366 0%, #128c7e 100%)', color: '#fff', border: 'none', borderRadius: 6, boxShadow: '0 1px 4px #25d36633', fontSize: '1.25em', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, padding: 0 }}
                    title="Enviar WhatsApp"
                    onClick={e => e.stopPropagation()}
                  >
                    💬
                  </a>
                </div>
              )}
            </header>

            {toastMessage.show && (
              <div className="notification is-info is-light is-size-7-mobile" style={{ margin: '0.5em 0.5em 0 0.5em' }}>
                {toastMessage.text}
              </div>
            )}

            <section
              className="modal-card-body p-3"
              style={{
                background: '#f5faff',
                borderRadius: 0,
                flex: 1,
                overflowY: 'auto',
                padding: '1em 0.5em',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="tabs is-toggle is-fullwidth is-small mb-2">
                <ul>
                  <li className={activeTab === 'details' ? 'is-active' : ''}>
                    <a onClick={() => setActiveTab('details')}>Detalles</a>
                  </li>
                  <li className={activeTab === 'notes' ? 'is-active' : ''}>
                    <a onClick={() => setActiveTab('notes')}>📝 Diagnóstico avanzado</a>
                  </li>
                </ul>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'details' && (
                  <>
                    {/* Sección editable del cliente */}
                    <div className="box" style={{ marginBottom: 10, background: '#fffbe6', border: '1.5px solid #ffe066', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isEditingCliente ? (
                          <>
                            <div style={{ position: 'relative', width: 250 }}>
                              <input
                                className="input is-small"
                                type="text"
                                value={editedNombreApellido}
                                onChange={e => setEditedNombreApellido(e.target.value)}
                                placeholder="Nombre y Apellido"
                                style={{ width: '100%' }}
                                disabled={isSavingCliente}
                              />
                              {editedNombreApellido && (
                                <span style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 'calc(100% + 4px)',
                                  background: '#f5e960',
                                  color: '#23263A',
                                  borderRadius: 5,
                                  padding: '2px 8px',
                                  fontWeight: 500,
                                  fontSize: 13,
                                  boxShadow: '0 1px 4px #f5e96033',
                                  marginLeft: 0,
                                  zIndex: 2,
                                  minWidth: '120px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {editedNombreApellido.trim()}
                                </span>
                              )}
                            </div>
                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <input
                                className="input is-small"
                                type="text"
                                value={editedTelefono}
                                onChange={e => setEditedTelefono(e.target.value)}
                                placeholder="Teléfono"
                                style={{ maxWidth: 120 }}
                                disabled={isSavingCliente}
                              />
                              {editedTelefono && (
                                <span style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 'calc(100% + 4px)',
                                  background: '#f5e960',
                                  color: '#23263A',
                                  borderRadius: 5,
                                  padding: '2px 8px',
                                  fontWeight: 500,
                                  fontSize: 13,
                                  boxShadow: '0 1px 4px #f5e96033',
                                  marginLeft: 0,
                                  zIndex: 2,
                                  minWidth: '120px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {editedTelefono}
                                </span>
                              )}
                            </div>
                            <button
                              className="button is-success is-small"
                              style={{ fontWeight: 600 }}
                              disabled={isSavingCliente || !editedNombreApellido.trim() || !editedTelefono.trim()}
                              onClick={async () => {
                                setIsSavingCliente(true);
                                try {
                                  const clienteId = allDataOfCurrentRequest.data.dispositivo.cliente.id;
                                  // Separar nombre y apellido como en RepairRequestForm
                                  const nameParts = (editedNombreApellido || '').trim().split(' ');
                                  const nombre = nameParts[0] || '';
                                  const apellido = nameParts.slice(1).join(' ') || '';
                                  const response = await fetch(`${BASE_URL}/api/clientes/${clienteId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), telefono: editedTelefono.trim() })
                                  });
                                  const data = await response.json();
                                  if (response.ok) {
                                    showToast('Datos actualizados correctamente', 'success');
                                    setIsEditingCliente(false);
                                    setIsSavingCliente(false);
                                    setEditedNombreApellido("");
                                    setEditedTelefono("");
                                    // Refrescar datos
                                    await getCurrentRequest(allDataOfCurrentRequest.data.id);
                                  } else {
                                    showToast(data.message || 'Error al actualizar el cliente', 'danger');
                                    setIsSavingCliente(false);
                                  }
                                } catch (error) {
                                  showToast('Error al actualizar el cliente', 'danger');
                                  setIsSavingCliente(false);
                                }
                              }}
                            >Guardar</button>
                            <button
                              className="button is-light is-small"
                              style={{ fontWeight: 600 }}
                              disabled={isSavingCliente}
                              onClick={() => {
                                setIsEditingCliente(false);
                                setEditedNombreApellido("");
                                setEditedTelefono("");
                              }}
                            >Cancelar</button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, fontSize: 15, color: '#222', letterSpacing: 0.1 }}>
                              {allDataOfCurrentRequest.data.dispositivo.cliente.nombre} {allDataOfCurrentRequest.data.dispositivo.cliente.apellido}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#444', marginLeft: 12 }}>
                              {allDataOfCurrentRequest.data.dispositivo.cliente.telefono}
                            </span>
                            <button
                              className="button is-warning is-small"
                              style={{ fontWeight: 600, marginLeft: 10 }}
                              onClick={() => {
                                setIsEditingCliente(true);
                                setEditedNombreApellido(
                                  ((allDataOfCurrentRequest.data.dispositivo.cliente.nombre || "") +
                                    (allDataOfCurrentRequest.data.dispositivo.cliente.apellido ? " " + allDataOfCurrentRequest.data.dispositivo.cliente.apellido : "")).trim()
                                );
                                setEditedTelefono(allDataOfCurrentRequest.data.dispositivo.cliente.telefono || "");
                              }}
                            >Editar</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="columns is-mobile is-multiline mb-2" style={{ marginLeft: 0, marginRight: 0 }}>
                      <div className="column is-full p-1">
                        <ClientInfoCard 
                          clientData={allDataOfCurrentRequest.data.dispositivo.cliente}
                          fechaIngreso={allDataOfCurrentRequest.data.fecha_ingreso}
                        />
                      </div>
                      <div className="column is-full p-1">
                        <DeviceInfoCard 
                          deviceData={allDataOfCurrentRequest.data.dispositivo}
                          handleSendWhatsApp={handleSendWhatsApp}
                          reciboURL={reciboURL}
                          estado={allDataOfCurrentRequest.data.estado}
                          pagos={pagos}
                        />
                      </div>
                    </div>
                    {allDataOfCurrentRequest.data.estado === 'en_proceso' && (
                      <div className="box" style={{ marginBottom: 16, marginTop: 16, background: 'linear-gradient(120deg, #e0f0ff 60%, #f5faff 100%)', borderRadius: 8, boxShadow: '0 2px 8px rgba(91,134,229,0.09)', color: '#1a3557', border: '1.5px solid #b6d0f7' }}>
                        <h4 className="title is-6" style={{ marginBottom: 8, color: '#265d97', fontWeight: 700 }}>Pagos registrados</h4>
                        <div style={{ fontWeight: 600, color: '#d35400', marginBottom: 8 }}>Por favor registra el pago</div>
                        {typeof pagos !== 'undefined' && pagos.length === 0 ? (
                          <div className="has-text-grey-dark">No hay pagos registrados para esta orden.</div>
                        ) : (
                          <table className="table is-fullwidth is-bordered is-narrow is-size-7-mobile" style={{ marginBottom: 12 }}>
                            <thead>
                              <tr>
                                <th>Monto (S/)</th>
                                <th>Método</th>
                                <th>Fecha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagos && pagos.map((pago, idx) => (
                                <tr key={pago.id || idx}>
                                  <td>{parseFloat(pago.monto).toFixed(2)}</td>
                                  <td>{pago.metodo_pago}</td>
                                  <td>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString('es-PE') : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <form onSubmit={handleRegistrarPago} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <input
                            className="input is-small"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Monto (S/)"
                            value={nuevoPago.monto}
                            onChange={e => setNuevoPago({ ...nuevoPago, monto: e.target.value })}
                            style={{ maxWidth: 100 }}
                            required
                          />
                          <select
                            className="input is-small"
                            value={nuevoPago.metodo_pago}
                            onChange={e => setNuevoPago({ ...nuevoPago, metodo_pago: e.target.value })}
                            style={{ maxWidth: 120 }}
                            required
                          >
                            <option value="">Método</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Yape">Yape</option>
                            <option value="Plin">Plin</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Tarjeta">Tarjeta</option>
                          </select>
                          <div style={{ position: 'relative', maxWidth: 180, marginRight: 8 }}>
                            <input
                              className="input is-small"
                              type="datetime-local"
                              value={nuevoPago.fecha_pago || (() => {
                                const now = new Date();
                                const pad = n => n.toString().padStart(2, '0');
                                const localISO = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                                return localISO;
                              })()}
                              min={(() => {
                                const now = new Date();
                                const pad = n => n.toString().padStart(2, '0');
                                return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T00:00`;
                              })()}
                              max={(() => {
                                const now = new Date();
                                const pad = n => n.toString().padStart(2, '0');
                                return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T23:59`;
                              })()}
                              onChange={e => setNuevoPago({ ...nuevoPago, fecha_pago: e.target.value })}
                              style={{ backgroundColor: '#f5faff', color: '#1a4d7c', fontWeight: '500' }}
                              required
                            />
                          </div>
                          <button
                            className="button is-success is-small"
                            type="submit"
                            disabled={isSavingPago}
                            style={{ fontWeight: 600 }}
                          >
                            {isSavingPago ? 'Guardando...' : 'Registrar pago'}
                          </button>
                        </form>
                        {/* DeliverySlider eliminado por requerimiento, ya no aparece nunca */}
                      </div>
                    )}
                    <div className="columns is-mobile mb-2" style={{ marginLeft: 0, marginRight: 0 }}>
                      <div className="column is-full p-1">
                        <div className="box">
                          <QrVinculador 
                            qrResult={qrResult}
                            setQrResult={setQrResult}
                            machineHistory={machineHistory}
                            setMachineHistory={setMachineHistory}
                            dniTecnico={dniTecnico}
                            showToast={showToast}
                            hasCamera={hasCamera}
                            allDataOfCurrentRequest={allDataOfCurrentRequest}
                            selectedTipoServicio={selectedTipoServicio}
                            setSelectedTipoServicio={setSelectedTipoServicio}
                            canVincular={canVincular}
                            setCanVincular={setCanVincular}
                            isUpdating={isUpdating}
                            handleVincularQR={handleVincularQR}
                            showHistory={showHistory}
                            setShowHistory={setShowHistory}
                            setShowModelInput={setShowModelInput}
                            setShowLocationModal={setShowLocationModal}
                          />
                          <MachineHistoryTable 
                            machineHistory={machineHistory}
                            showHistory={showHistory}
                          />
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                            <button
                              className="button is-info is-small"
                              title="Exportar Recibo"
                              onClick={handleExportReceipt}
                              disabled={isGeneratingPDF}
                              style={{ fontSize: '0.9em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              📄 Recibo
                            </button>
                            <button
                              className="button is-danger is-small"
                              title="Eliminar"
                              onClick={() => onDeleteOrden(currentRequest?.id)}
                              style={{ fontSize: '0.9em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              🗑️ Eliminar
                            </button>
                            <button
                              className="button is-warning is-small"
                              title="Cambiar Estados"
                              onClick={() => setShowStatusButtons(!showStatusButtons)}
                              style={{ fontSize: '0.9em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              🔄 Estados
                            </button>
                          </div>
                        </div>
                        {showModelInput && (
                          <div className="modal is-active" style={{ zIndex: 99999, background: 'transparent', boxShadow: 'none' }}>
                            <div className="modal-card" style={{ minWidth: '90vw', maxWidth: '95vw', width: '100%', margin: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}>
                              <section className="modal-card-body" style={{ background: 'transparent', boxShadow: 'none', paddingTop: 0 }}>
                                <DiagnosisForm
                                  showModelInput={showModelInput}
                                  newOrderType={newOrderType}
                                  setNewOrderType={setNewOrderType}
                                  setNewOrderImage={setNewOrderImage}
                                  handleUpdateDevice={handleUpdateDevice}
                                  isUpdatingDiagnostico={isUpdatingDiagnostico}
                                  showToast={showToast}
                                  costoTotal={costoTotal}
                                  setCostoTotal={setCostoTotal}
                                  pagos={pagos}
                                  setPagos={setPagos}
                                  nuevoPago={nuevoPago}
                                  setNuevoPago={setNuevoPago}
                                  isSavingPago={isSavingPago}
                                  handleRegistrarPago={handleRegistrarPago}
                                />
                                <button className="delete is-large" aria-label="close" onClick={() => setShowModelInput(false)} style={{ position: 'absolute', top: 10, right: 18, background: '#ff3860', border: 'none', color: '#fff' }}></button>
                              </section>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <ProblemDescriptionCard 
                        problema={allDataOfCurrentRequest.data.problema_descrito}
                        audio={allDataOfCurrentRequest.data.audio}
                        audio_id={allDataOfCurrentRequest.data.audio_id}
                        imagenes={allDataOfCurrentRequest.data.imagenes}
                      />
                    </div>
                  </>
                )}
                {activeTab === 'notes' && (
                  <NotesSection
                    dispositivoId={allDataOfCurrentRequest.data.dispositivo.id}
                    onDiagnosisUpdated={(updatedDevice) => {}}
                  />
                )}
              </div>
            </section>
            <LocationModal 
              showLocationModal={showLocationModal}
              setShowLocationModal={setShowLocationModal}
              destinationLocation={destinationLocation}
              setDestinationLocation={setDestinationLocation}
              handleUpdateLocation={handleUpdateLocation}
              showToast={showToast}
            />
            {showStatusButtons && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  padding: '1em',
                  position: 'fixed',
                  bottom: 150,
                  right: 18,
                  zIndex: 10000,
                }}
              >
                {/* Ahora siempre se puede cambiar el estado, incluso si está entregado */}
                <StatusUpdateCard 
                  currentStatus={allDataOfCurrentRequest.data.estado}
                  handleStatusChange={handleStatusChange}
                  onClose={() => setShowStatusButtons(false)}
                  allowAllStatuses={true}
                />
              </div>
            )}
          </>
        )}
        {isGeneratingPDF && (
          <ReceiptGenerator 
            orderData={allDataOfCurrentRequest} 
            onSuccess={handlePDFSuccess}
            onError={handlePDFError}
            onAfterSuccess={() => getCurrentRequest(currentRequest?.id)}
          />
        )}
      </div>
    </div>
  );
};

export default OsDetail;


