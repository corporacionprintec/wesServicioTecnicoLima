import React, { useEffect, useState } from 'react';
import TechnicianStats from '../components/AdminDashboard/TechnicianStats';

function AdminDashboardTechnicianStatsPage() {
  const [tecnicos, setTecnicos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const tecnicosRes = await fetch('https://servidorserviciotecnico-production.up.railway.app/tecnicosAdmin');
        const tecnicosData = await tecnicosRes.json();
        setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
        const ordenesRes = await fetch('https://servidorserviciotecnico-production.up.railway.app/ordenes?page=1&limit=10000');
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

  return <TechnicianStats tecnicos={tecnicos} ordenes={ordenes} />;
}

export default AdminDashboardTechnicianStatsPage;
