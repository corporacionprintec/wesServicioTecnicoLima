import React, { useEffect, useState } from 'react';
import TechnicianStats from '../components/AdminDashboard/TechnicianStats';
import TechnicianOrdersList from '../components/AdminDashboard/TechnicianOrdersList';
import { useSearchParams } from 'react-router-dom';

function AdminDashboardTechnicianStatsPage() {
  const [tecnicos, setTecnicos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const tecnicoId = searchParams.get('tecnicoId');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const tecnicosRes = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/tecnicosAdmin');
        const tecnicosData = await tecnicosRes.json();
        setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
        const ordenesRes = await fetch('https://servidorserviciotecnicolima-production.up.railway.app/ordenes?page=1&limit=10000');
        const ordenesData = await ordenesRes.json();
        setOrdenes(ordenesData?.data?.ordenes || []);
      } catch (e) {
        setTecnicos([]);
        setOrdenes([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div style={{padding: 40, textAlign: 'center'}}>Cargando técnicos y órdenes...</div>;
  }

  return (
    <div>
      {/* Mostrar las tarjetas de técnicos solo si no hay tecnicoId en la URL */}
      {!tecnicoId && <TechnicianStats tecnicos={tecnicos} ordenes={ordenes} />}
      {/* Si hay tecnicoId, mostrar la lista de órdenes de ese técnico */}
      {tecnicoId && <TechnicianOrdersList ordenes={ordenes} tecnicoId={tecnicoId} />}
    </div>
  );
}

export default AdminDashboardTechnicianStatsPage;
