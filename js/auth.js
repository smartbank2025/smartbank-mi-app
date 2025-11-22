/**
 * 🔐 Sistema de Autenticación Completo para Smart/Bank
 * ✅ Conexión real con backend
 * ✅ JWT tokens
 * ✅ Cierre de sesión
 * ✅ Recordar usuario
 */

// 🌐 CONFIGURACIÓN DEL BACKEND
const API_URL = 'https://smartbank-backend-lcnr.onrender.com'; // ← CAMBIA ESTO por tu URL de Render

// 📦 CLASE PRINCIPAL DE AUTENTICACIÓN
class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('token');
    this.init();
  }

  // 🚀 INICIALIZAR SISTEMA
  init() {
    try {
      // Si hay token, verificar usuario
      if (this.token) {
        this.verifyToken();
      }
      
      // Configurar eventos
      this.setupEventListeners();
      
      // Verificar autenticación en páginas protegidas
      if (!window.location.pathname.includes('login') && 
          !window.location.pathname.includes('register') && 
          !this.token) {
        this.redirectToLogin();
      }
    } catch (error) {
      console.error('❌ Error al inicializar AuthSystem:', error);
      this.showError('Error al inicializar el sistema de autenticación');
    }
  }

  // 🎯 CONFIGURAR EVENTOS
  setupEventListeners() {
    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Botón de cerrar sesión
    const logoutBtn = document.querySelector('.logout-button');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Verificar contraseña en tiempo real
    this.setupPasswordValidation();
  }

  // 🔑 LOGIN
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value.trim().toLowerCase();
    const password = document.getElementById('password')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Validaciones
    if (!email || !password) {
      this.showError('Por favor completa todos los campos');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor ingresa un email válido');
      return;
    }

    try {
      this.showLoading('Iniciando sesión...');

      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Éxito ✅
        this.token = data.token;
        
        if (rememberMe) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('user', JSON.stringify(data.user));
        }

        this.showSuccess('¡Bienvenido! Redirigiendo...');
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);

      } else {
        // Error ❌
        this.showError(data.error || 'Credenciales inválidas');
      }

    } catch (error) {
      console.error('❌ Error en login:', error);
      this.showError('Error de conexión con el servidor');
    } finally {
      this.hideLoading();
    }
  }

  // 📝 REGISTRO
  async handleRegister(e) {
    e.preventDefault();
    
    try {
      const userData = this.validateRegistrationData();
      if (!userData) return;

      this.showLoading('Creando cuenta...');

      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        // Éxito ✅
        this.showSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
        
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);

      } else {
        // Error ❌
        this.showError(data.error || 'Error al crear cuenta');
      }

    } catch (error) {
      console.error('❌ Error en registro:', error);
      this.showError('Error de conexión con el servidor');
    } finally {
      this.hideLoading();
    }
  }

  // ✅ VALIDAR DATOS DE REGISTRO
  validateRegistrationData() {
    const firstName = document.getElementById('firstName')?.value.trim() || '';
    const lastName = document.getElementById('lastName')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim().toLowerCase() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const termsAccepted = document.getElementById('termsAccepted')?.checked || false;

    // Validaciones
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      this.showError('Por favor completa todos los campos obligatorios');
      return null;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor ingresa un email válido');
      return null;
    }

    if (password.length < 6) {
      this.showError('La contraseña debe tener al menos 6 caracteres');
      return null;
    }

    if (password !== confirmPassword) {
      this.showError('Las contraseñas no coinciden');
      return null;
    }

    if (!termsAccepted) {
      this.showError('Debes aceptar los términos y condiciones');
      return null;
    }

    return {
      firstName,
      lastName,
      email,
      phone,
      password,
      termsAccepted
    };
  }

  // 🔐 VERIFICAR TOKEN
  async verifyToken() {
    try {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.updateUI();
      } else {
        // Token inválido o expirado
        this.logout();
      }
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      this.logout();
    }
  }

  // 📧 VALIDAR EMAIL
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // 🔒 CERRAR SESIÓN
  logout(message = null) {
    try {
      // Limpiar almacenamiento
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      this.token = null;
      this.currentUser = null;

      console.log('👋 Sesión cerrada' + (message ? `: ${message}` : ''));
      
      // Redirigir al login
      if (!window.location.pathname.includes('login')) {
        window.location.href = 'login.html';
      }
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
    }
  }

  // 🔀 REDIRECCIONAR
  redirectToLogin() {
    window.location.href = 'login.html';
  }

  // 🎨 ACTUALIZAR UI
  updateUI() {
    if (!this.currentUser) return;

    // Actualizar nombre y email en la UI
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userInitialsElement = document.getElementById('userInitials');

    if (userNameElement) userNameElement.textContent = this.currentUser.name;
    if (userEmailElement) userEmailElement.textContent = this.currentUser.email;
    if (userInitialsElement) {
      const initials = this.currentUser.name.split(' ').map(n => n[0]).join('');
      userInitialsElement.textContent = initials;
    }
  }

  // 🔍 VALIDAR CONTRASEÑA EN TIEMPO REAL
  setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const strengthDiv = document.getElementById('passwordStrength');
    
    if (!passwordInput || !strengthDiv) return;

    passwordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = this.calculatePasswordStrength(password);
      this.updatePasswordStrengthUI(strength, strengthDiv);
    });
  }

  // 💪 CALCULAR FORTALEZA DE CONTRASEÑA
  calculatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return Math.min(strength, 5);
  }

  // 🎨 ACTUALIZAR UI DE FORTALEZA
  updatePasswordStrengthUI(strength, container) {
    const labels = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
    const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#059669'];
    
    container.innerHTML = `
      <div class="password-strength-meter">
        <div class="strength-bar">
          <div class="strength-fill" style="width: ${(strength + 1) * 20}%; background-color: ${colors[strength]}"></div>
        </div>
        <span class="strength-text">${labels[strength]}</span>
      </div>
    `;
  }

  // ⏳ MOSTRAR CARGANDO
  showLoading(message = 'Cargando...') {
    const button = document.querySelector('.login-button .button-text');
    const loader = document.querySelector('.login-button .button-loader');
    
    if (button) button.style.display = 'none';
    if (loader) loader.style.display = 'inline';
    
    if (button) button.textContent = message;
  }

  // ✅ OCULTAR CARGANDO
  hideLoading() {
    const button = document.querySelector('.login-button .button-text');
    const loader = document.querySelector('.login-button .button-loader');
    
    if (loader) loader.style.display = 'none';
    if (button) {
      button.style.display = 'inline';
      button.textContent = 'Iniciar Sesión';
    }
  }

  // ❌ MOSTRAR ERROR
  showError(message) {
    alert(`❌ ${message}`); // Simplificado para producción básica
  }

  // ✅ MOSTRAR ÉXITO
  showSuccess(message) {
    alert(`✅ ${message}`); // Simplificado para producción básica
  }
}

// 🌟 FUNCIONES GLOBALES
function logout() {
  if (window.authSystem) {
    window.authSystem.logout();
  } else {
    window.location.href = 'login.html';
  }
}

function checkAuth() {
  try {
    const auth = new AuthSystem();
    const user = auth.currentUser || JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    
    if (!user && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
      window.location.href = 'login.html';
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error en checkAuth:', error);
    window.location.href = 'login.html';
    return null;
  }
}

// 🚀 INICIALIZAR CUANDO SE CARGUE LA PÁGINA
document.addEventListener('DOMContentLoaded', function () {
  try {
    window.authSystem = new AuthSystem();
  } catch (error) {
    console.error('❌ Error al inicializar la aplicación:', error);
  }
});