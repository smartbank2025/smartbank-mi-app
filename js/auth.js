class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.users = this.loadUsers();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
    this.init();
  }

  init() {
    try {
      const savedUser = this.getStoredUser();
      if (savedUser && this.isSessionValid(savedUser)) {
        this.currentUser = savedUser;
        this.updateUI();
        this.redirectToDashboard();
      } else {
        this.clearStoredUser();
      }
      this.setupEventListeners();
      this.setupSessionManagement();
    } catch (error) {
      console.error('Error al inicializar AuthSystem:', error);
      this.showError('Error al inicializar el sistema de autenticación');
    }
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }

  setupSessionManagement() {
    setInterval(() => {
      if (this.currentUser && !this.isSessionValid(this.currentUser)) {
        this.logout('Sesión expirada por inactividad');
      }
    }, 60000);

    document.addEventListener('click', () => this.updateActivity());
    document.addEventListener('keypress', () => this.updateActivity());
  }

  updateActivity() {
    if (this.currentUser) {
      this.currentUser.lastActivity = Date.now();
      this.storeUser(this.currentUser);
    }
  }

  isSessionValid(user) {
    return user.lastActivity && (Date.now() - user.lastActivity) < this.sessionTimeout;
  }

  loadUsers() {
    try {
      const saved = localStorage.getItem('smartBankUsers');
      return saved ? JSON.parse(saved).map(u => this.migrateUser(u)) : this.getDefaultUsers();
    } catch {
      return this.getDefaultUsers();
    }
  }

  migrateUser(user) {
    return {
      ...user,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: user.lastLogin || null,
      failedAttempts: user.failedAttempts || 0,
      lockedUntil: user.lockedUntil || null,
      twoFactorEnabled: user.twoFactorEnabled || false,
      preferences: user.preferences || {
        language: 'es',
        currency: 'USD',
        theme: 'light',
        notifications: true
      }
    };
  }

  getDefaultUsers() {
    return [
      {
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@email.com',
        password: this.hashPassword('123456'),
        phone: '+1234567890',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        failedAttempts: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
        preferences: {
          language: 'es',
          currency: 'USD',
          theme: 'light',
          notifications: true
        }
      }
    ];
  }

  hashPassword(password, salt = this.generateSalt()) {
    return btoa(password + salt) + ':' + salt;
  }

  generateSalt() {
    return Math.random().toString(36).substring(2, 15);
  }

  verifyPassword(password, hashedPassword) {
    const [hash, salt] = hashedPassword.split(':');
    return this.hashPassword(password, salt) === hashedPassword;
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    if (!email || !password) {
      this.showError('Por favor completa todos los campos');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor ingresa un email válido');
      return;
    }

    const user = this.users.find(u => u.email === email);

    if (!user) {
      this.showError('Credenciales inválidas');
      return;
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      this.showError('Cuenta bloqueada temporalmente. Intenta más tarde.');
      return;
    }

    if (!this.verifyPassword(password, user.password)) {
      this.showError('Credenciales inválidas');
      this.logFailedAttempt(user);
      return;
    }

    await this.successfulLogin(user, rememberMe);
  }

  async handleRegister(e) {
    e.preventDefault();
    
    try {
      const userData = this.validateRegistrationData();
      if (!userData) return;

      if (this.users.find(u => u.email === userData.email)) {
        this.showError('Este correo ya está registrado');
        return;
      }

      const newUser = {
        id: Date.now(),
        ...userData,
        password: this.hashPassword(userData.password),
        createdAt: new Date().toISOString(),
        lastLogin: null,
        failedAttempts: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
        preferences: {
          language: 'es',
          currency: 'USD',
          theme: 'light',
          notifications: true
        }
      };

      this.users.push(newUser);
      this.saveUsers();
      
      this.showSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      
      setTimeout(() => {
        this.successfulLogin(newUser, false);
      }, 1500);

    } catch (error) {
      console.error('Error en registro:', error);
      this.showError('Ocurrió un error al registrar la cuenta');
    }
  }

  validateRegistrationData() {
    const firstName = document.getElementById('firstName')?.value.trim() || '';
    const lastName = document.getElementById('lastName')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim().toLowerCase() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const termsAccepted = document.getElementById('termsAccepted')?.checked || false;

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

  async successfulLogin(user, rememberMe) {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    user.lastActivity = Date.now();

    this.currentUser = user;
    this.storeUser(user, rememberMe);
    this.saveUsers();
    this.initializeUserData(user.id);

    this.showSuccess(`¡Bienvenido ${user.firstName}!`);

    setTimeout(() => {
      this.redirectToDashboard();
    }, 1000);
  }

  logFailedAttempt(user) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      this.showError('Cuenta bloqueada por 15 minutos por múltiples intentos fallidos');
    }
    this.saveUsers();
  }

  initializeUserData(userId) {
    const userDataKey = `userData_${userId}`;
    if (!localStorage.getItem(userDataKey)) {
      const initialData = {
        transactions: [
          {
            id: 1,
            type: 'income',
            amount: 5000,
            category: 'Salario',
            description: 'Salario Mensual',
            date: new Date().toISOString().split('T')[0],
            status: 'completed',
            location: 'Transferencia Bancaria',
            time: '08:00',
            method: 'Transferencia',
            bankId: 1,
            notes: ''
          },
          {
            id: 2,
            type: 'expense',
            amount: 1200,
            category: 'Vivienda',
            description: 'Alquiler',
            date: new Date().toISOString().split('T')[0],
            status: 'completed',
            location: 'Pago Bancario',
            time: '09:00',
            method: 'Débito Automático',
            bankId: 1,
            notes: ''
          }
        ],
        categories: [
          { id: 1, name: 'Alimentación', budget: 500, spent: 0, color: '#3B82F6', icon: '🍽️' },
          { id: 2, name: 'Transporte', budget: 300, spent: 0, color: '#60A5FA', icon: '🚗' },
          { id: 3, name: 'Vivienda', budget: 1200, spent: 1200, color: '#93C5FD', icon: '🏠' },
          { id: 4, name: 'Ocio', budget: 200, spent: 0, color: '#BFDBFE', icon: '🎬' },
          { id: 5, name: 'Salud', budget: 150, spent: 0, color: '#10B981', icon: '⚕️' },
          { id: 6, name: 'Educación', budget: 100, spent: 0, color: '#F59E0B', icon: '📚' }
        ],
        subscriptions: [
          {
            id: 1,
            name: 'Netflix',
            price: 15.99,
            billingCycle: 'monthly',
            nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            active: true,
            icon: '🎬',
            color: '#E50914'
          }
        ],
        banks: [
          {
            id: 1,
            name: 'Banco Principal',
            type: 'checking',
            balance: 5000,
            accountNumber: '****1234',
            currency: 'USD',
            color: '#3B82F6',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ],
        settings: {
          language: 'es',
          currency: 'USD',
          savingsGoal: 20,
          emergencyFund: 10000,
          notifications: {
            budgetAlerts: true,
            monthlyReports: true,
            goalReminders: false
          }
        }
      };
      localStorage.setItem(userDataKey, JSON.stringify(initialData));
    }
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  }

  storeUser(user, rememberMe = false) {
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(user));
      if (rememberMe) sessionStorage.removeItem('currentUser');
      else localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error al almacenar usuario:', error);
    }
  }

  clearStoredUser() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  }

  saveUsers() {
    try {
      localStorage.setItem('smartBankUsers', JSON.stringify(this.users));
    } catch (error) {
      console.error('Error al guardar usuarios:', error);
    }
  }

  logout(reason = null) {
    try {
      if (this.currentUser) {
        console.log(`Sesión cerrada para ${this.currentUser.email}${reason ? `: ${reason}` : ''}`);
      }
      
      this.currentUser = null;
      this.clearStoredUser();
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  redirectToDashboard() {
    if (!window.location.pathname.includes('dashboard.html')) {
      window.location.href = 'dashboard.html';
    }
  }

  getCurrentUser() {
    return this.currentUser || this.getStoredUser();
  }

  updateUI() {
    if (!this.currentUser) return;

    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userInitialsElement = document.getElementById('userInitials');

    if (userNameElement) userNameElement.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    if (userEmailElement) userEmailElement.textContent = this.currentUser.email;
    if (userInitialsElement) {
      userInitialsElement.textContent = `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`;
    }
  }

  showError(message) {
    alert(message); // Simplificado para este entorno
  }

  showSuccess(message) {
    alert(message); // Simplificado para este entorno
  }
}

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
    const user = auth.getCurrentUser();
    
    if (!user && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
      window.location.href = 'login.html';
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error en checkAuth:', error);
    window.location.href = 'login.html';
    return null;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  try {
    window.authSystem = new AuthSystem();
    
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
      checkAuth();
    }
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
});