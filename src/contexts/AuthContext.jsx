import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Se intenta cargar el usuario y rol persistidos en localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [loginRole, setLoginRole] = useState(() => {
    return localStorage.getItem('loginRole') || null;
  });

  // Nuevo login centralizado: acepta dni, role y password
  const login = async (dni, role, password) => {
    try {
      const response = await fetch('https://servidorserviciotecnico-production.up.railway.app/api/tecnicos/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: dni, contrasena: password, role })
      });
      const data = await response.json();
      console.log('Respuesta login API:', data);
      if (!response.ok || !data.user) {
        return { success: false, message: data.message || 'Credenciales incorrectas' };
      }
      // Construir objeto usuario
      const userObj = {
        id: data.user.id,
        name: data.user.nombre,
        lastname: data.user.apellido,
        rol: data.user.rol,
        telefono: data.user.telefono
      };
      setCurrentUser(userObj);
      setLoginRole(role);
      localStorage.setItem('currentUser', JSON.stringify(userObj));
      localStorage.setItem('loginRole', role);
      return { success: true, user: userObj };
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, message: 'Error de conexión con el servidor' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setLoginRole(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginRole');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loginRole }}>
      {children}
    </AuthContext.Provider>
  );
}
