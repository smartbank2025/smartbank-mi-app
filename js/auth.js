/**
 * 🔐 AUTH.JS COMPLETO - SMART/BANK
 * ✅ Login/Register real con backend
 * ✅ Manejo de errores
 * ✅ Token JWT
 * ✅ Recordar usuario
 */

// 🌐 CONFIGURACIÓN - CAMBIA ESTO POR TU URL REAL
const API_URL = 'https://smartbank-mi-app.onrender.com'; // ← IMPORTANTE: pon tu URL de Render

// 📦 CLASE PRINCIPAL
class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
    this.init();
  }

  // 🚀 INICIALIZAR
  init() {
    try {
      // Si hay token, verificar usuario
      if (this.token) {
        this.currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
        this.updateUI();
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
      this.logout();
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

    // Validar contraseña en tiempo real
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
        this.currentUser = data.user;
        
        // Guardar según "recordarme"
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

  // ✅ VALIDAR DATOS
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

  // 📧 VALIDAR EMAIL
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // 🔒 CERRAR SESIÓN
  logout(message = null) {
    try {
      // Limpiar todo
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      this.token = null;
      this.currentUser = null;

      console.log('👋 Sesión cerrada' + (message ? `: ${message}` : ''));
      
      // Redirigir
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

    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userInitialsElement = document.getElementById('userInitials');

    if (userNameElement) userNameElement.textContent = this.currentUser.name || 'Usuario';
    if (userEmailElement) userEmailElement.textContent = this.currentUser.email;
    if (userInitialsElement) {
      const initials = this.currentUser.name ? this.currentUser.name.split(' ').map(n => n[0]).join('') : 'U';
      userInitialsElement.textContent = initials;
    }
  }

  // 🔍 VALIDAR CONTRASEÑA
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

  // 💪 CALCULAR FORTALEZA
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

  // 🎨 ACTUALIZAR UI FORTALEZA
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
    
    if (button) {
      button.style.display = 'none';
      button.textContent = message;
    }
    if (loader) loader.style.display = 'inline';
  }

  // ✅ OCULTAR CARGANDO
  hideLoading() {
    const button = document.querySelector('.login-button .button-text');
    const loader = document.querySelector('.login-button .button-loader');
    
    if (loader) loader.style.display = 'none';
    if (button) {
      button.style.display = 'inline';
      button.textContent = window.location.pathname.includes('register') ? 'Crear Cuenta' : 'Iniciar Sesión';
    }
  }

  // ❌ MOSTRAR ERROR
  showError(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = '❌ ' + message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  // ✅ MOSTRAR ÉXITO
  showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = '✅ ' + message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
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
    console.log('✅ AuthSystem iniciado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la aplicación:', error);
  }
});

// 🎨 CSS para notificaciones (agrega esto a tu styles.css)
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .password-strength-meter {
    margin-top: 8px;
  }
  
  .strength-bar {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }
  
  .strength-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .strength-text {
    font-size: 12px;
    margin-top: 4px;
    font-weight: 500;
  }
`;
document.head.appendChild(style);