import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../cssGeneral/login/login.css';

const BASE_URL = 'https://servidorserviciotecnicolima-production.up.railway.app/tecnicosAdmin';

function LoginPage() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tecnico'); // Valor por defecto
  const [error, setError] = useState('');
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [updateStep, setUpdateStep] = useState(1); // 1: pedir dni/pass, 2: nueva pass
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateTries, setUpdateTries] = useState(() => parseInt(localStorage.getItem('updateTries') || '0', 10));
  const [isBlocked, setIsBlocked] = useState(() => localStorage.getItem('updateBlocked') === '1');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const storedDni = localStorage.getItem('dni');
    const storedRole = localStorage.getItem('role');
    const storedPassword = localStorage.getItem('password');
    if (storedDni && storedRole && storedPassword) {
      setDni(storedDni);
      setRole(storedRole);
      setPassword(storedPassword);
      handleAutoLogin(storedDni, storedRole, storedPassword);
    }
  }, []);

  const handleAutoLogin = async (storedDni, storedRole, storedPassword) => {
    try {
      const result = await login(storedDni, storedRole, storedPassword);
      if (result.success) {
        if (result.user.rol === 'administrador') {
          if (storedRole === 'tecnico') {
            navigate('/employee-dashboard');
          } else if (storedRole === 'administrador') {
            navigate('/admin-dashboard');
          } else {
            setError('Rol no reconocido');
          }
        } else if (result.user.rol === 'tecnico') {
          navigate('/employee-dashboard');
        } else {
          setError('Rol no reconocido');
        }
      } else {
        setError(result.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      setError('Error en el servidor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(dni, role, password);
      if (result.success) {
        localStorage.setItem('dni', dni);
        localStorage.setItem('role', role);
        localStorage.setItem('password', password);
        if (result.user.rol === 'administrador') {
          if (role === 'administrador') {
            navigate('/admin-dashboard');
            window.location.reload();
          } else if (role === 'tecnico') {
            navigate('/employee-dashboard');
            window.location.reload();
          } else {
            setError('Rol no reconocido');
          }
        } else if (result.user.rol === 'tecnico' && role === 'tecnico') {
          navigate('/employee-dashboard');
          window.location.reload();
        } else {
          setError('Rol o credenciales incorrectas');
        }
      } else {
        setError(result.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      setError('Error en el servidor');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (isBlocked) return;
    if (updateStep === 1) {
      try {
        const response = await fetch(BASE_URL);
        const tecnicos = await response.json();
        const user = tecnicos.find(t => t.telefono === dni && t.contrasena === password);
        if (user) {
          setUpdateStep(2);
        } else {
          const tries = updateTries + 1;
          setUpdateTries(tries);
          localStorage.setItem('updateTries', tries);
          if (tries >= 4) {
            setIsBlocked(true);
            localStorage.setItem('updateBlocked', '1');
            setError('Demasiados intentos fallidos. El cambio de contraseña está bloqueado.');
          } else {
            setError('DNI o contraseña actual incorrectos.');
          }
        }
      } catch (err) {
        setError('Error en el servidor');
      }
    } else if (updateStep === 2) {
      if (newPassword.length < 6 || !(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
        setError('La nueva contraseña debe tener al menos 6 caracteres y combinar letras y números.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      try {
        const response = await fetch(BASE_URL);
        const tecnicos = await response.json();
        const user = tecnicos.find(t => t.telefono === dni && t.contrasena === password);
        if (!user) {
          setError('No se encontró el usuario para actualizar.');
          return;
        }
        const updateRes = await fetch(`${BASE_URL}/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: user.nombre,
            apellido: user.apellido,
            telefono: user.telefono,
            contrasena: newPassword,
            rol: 'tecnico',
          })
        });
        if (updateRes.ok) {
          setError('');
          setShowUpdatePassword(false);
          setUpdateStep(1);
          setNewPassword('');
          setConfirmPassword('');
          setPassword('');
          setUpdateTries(0);
          localStorage.removeItem('updateTries');
          localStorage.removeItem('updateBlocked');
          alert('Contraseña actualizada correctamente.');
        } else {
          setError('Error al actualizar la contraseña.');
        }
      } catch (err) {
        setError('Error en el servidor');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dni');
    localStorage.removeItem('role');
    localStorage.removeItem('password');
    setDni('');
    setRole('tecnico');
    navigate('/login');
  };

  return (
    <div className="login-bg d-flex justify-center align-center">
      <div className="login-card">
        <h2 className="login-title">Iniciar Sesión</h2>
        {error && <div className="login-alert">{error}</div>}
        {!showUpdatePassword ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-group">
              <label className="login-label">DNI</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese su DNI"
                required
                className="login-input"
                disabled={isBlocked}
              />
            </div>
            <div className="login-group">
              <label className="login-label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                className="login-input"
                disabled={isBlocked}
              />
            </div>
            <div className="login-group">
              <label className="login-label">Tipo de Usuario</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="login-select"
                disabled={isBlocked}
              >
                <option value="tecnico">Técnico</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <button type="submit" className="login-btn" disabled={isBlocked}>Ingresar</button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="login-form">
            <div className="login-group">
              <label className="login-label">DNI</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese su DNI"
                required
                className="login-input"
                disabled={isBlocked || updateStep !== 1}
              />
            </div>
            <div className="login-group">
              <label className="login-label">Contraseña actual</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña actual"
                required
                className="login-input"
                disabled={isBlocked || updateStep !== 1}
              />
            </div>
            {updateStep === 2 && (
              <>
                <div className="login-group">
                  <label className="login-label">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 6, letras y números)"
                    required
                    className="login-input"
                    minLength={6}
                  />
                </div>
                <div className="login-group">
                  <label className="login-label">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    className="login-input"
                    minLength={6}
                  />
                </div>
              </>
            )}
            <button type="submit" className="login-btn" disabled={isBlocked}>
              {updateStep === 1 ? 'Validar' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="login-btn"
            style={{ background: '#2563eb', color: '#fff' }}
            onClick={() => {
              setShowUpdatePassword(!showUpdatePassword);
              setError('');
              setUpdateStep(1);
              setNewPassword('');
              setConfirmPassword('');
              setPassword('');
            }}
            disabled={isBlocked}
          >
            {showUpdatePassword ? 'Volver al login' : 'Actualizar contraseña'}
          </button>
          {dni && !showUpdatePassword && (
            <button className="login-logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          )}
        </div>
        {isBlocked && (
          <div className="login-alert" style={{ marginTop: 12 }}>
            El cambio de contraseña está bloqueado por demasiados intentos fallidos.
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
