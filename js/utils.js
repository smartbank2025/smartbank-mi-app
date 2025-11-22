function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(modal => modal.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => item.classList.remove('active'));

  const selectedTab = document.getElementById(tabName + 'Tab');
  const selectedMenuItem = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedMenuItem) selectedMenuItem.classList.add('active');

  updatePageTitle(tabName);
}

function updatePageTitle(tabName) {
  const titles = {
    dashboard: { title: 'Dashboard', subtitle: 'Resumen financiero' },
    transactions: { title: 'Transacciones', subtitle: 'Estado de cuenta completo' },
    categories: { title: 'Categorías', subtitle: 'Gestión de presupuestos' },
    subscriptions: { title: 'Suscripciones', subtitle: 'Gestión de pagos recurrentes' },
    banks: { title: 'Bancos', subtitle: 'Mis cuentas bancarias' },
    settings: { title: 'Configuración', subtitle: 'Ajustes de la aplicación' }
  };

  const titleInfo = titles[tabName];
  if (titleInfo) {
    document.getElementById('pageTitle').textContent = titleInfo.title;
    document.getElementById('pageSubtitle').textContent = titleInfo.subtitle;
  }
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(date, format = 'full') {
  const options = {
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    minimal: { month: 'short', day: 'numeric' }
  };
  return new Date(date).toLocaleDateString('es-ES', options[format]);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return re.test(password);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
});