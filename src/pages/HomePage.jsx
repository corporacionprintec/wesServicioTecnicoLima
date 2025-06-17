import React from 'react';
import { useLocation } from 'react-router-dom';
import RepairRequestForm from '../components/RepairRequestForm';

const HomePage = () => {
  const location = useLocation();

  const prefillData = location.state?.prefillData || {};
  return (
    <div>
      <RepairRequestForm prefillData={prefillData} />
    </div>
  );
};

export default HomePage;
