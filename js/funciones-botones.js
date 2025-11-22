function showAddTransactionModal(type = 'expense') {
  if (!window.transactionsManager) {
    window.transactionsManager = new TransactionsManager();
  }
  window.transactionsManager.showAddTransactionModal(type);
}

function addTransaction(e) {
  if (window.transactionsManager) {
    window.transactionsManager.addTransaction(e);
  }
}

function exportTransactions() {
  if (window.transactionsManager) {
    window.transactionsManager.exportTransactions();
  }
}

function importTransactions() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const csv = event.target.result;
      // Simular procesamiento de CSV
      alert('Archivo CSV importado exitosamente (simulación)');
    };
    reader.readAsText(file);
  };
  input.click();
}

function showAddCategoryModal() {
  if (!window.categoriesManager) {
    window.categoriesManager = new CategoriesManager();
  }
  window.categoriesManager.showAddCategoryModal();
}

function addCategory(e) {
  if (window.categoriesManager) {
    window.categoriesManager.addCategory(e);
  }
}

function editCategory(id) {
  if (window.categoriesManager) {
    window.categoriesManager.editCategory(id);
  }
}

function deleteCategory(id) {
  if (window.categoriesManager) {
    window.categoriesManager.deleteCategory(id);
  }
}

function exportCategories() {
  const categories = JSON.parse(localStorage.getItem('userData_1') || '{}').categories || [];
  const csv = [
    ['Nombre', 'Presupuesto', 'Gastado', 'Color', 'Icono'],
    ...categories.map(cat => [cat.name, cat.budget, cat.spent, cat.color, cat.icon])
  ].map(row => row.join(',')).join('\n');
  downloadFile(csv, 'categorias.csv', 'text/csv;charset=utf-8;');
}

function showAddSubscriptionModal() {
  if (!window.subscriptionsManager) {
    window.subscriptionsManager = new SubscriptionsManager();
  }
  window.subscriptionsManager.showAddSubscriptionModal();
}

function addSubscription(e) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.addSubscription(e);
  }
}

function toggleSubscription(id) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.toggleSubscription(id);
  }
}

function editSubscription(id) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.editSubscription(id);
  }
}

function deleteSubscription(id) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.deleteSubscription(id);
  }
}

function exportSubscriptions() {
  const subs = JSON.parse(localStorage.getItem('userData_1') || '{}').subscriptions || [];
  const csv = [
    ['Nombre', 'Precio', 'Ciclo', 'Próximo Pago', 'Activa'],
    ...subs.map(s => [s.name, s.price, s.billingCycle, s.nextPayment, s.active ? 'Sí' : 'No'])
  ].map(row => row.join(',')).join('\n');
  downloadFile(csv, 'suscripciones.csv', 'text/csv;charset=utf-8;');
}

function showAddBankModal() {
  if (!window.banksManager) {
    window.banksManager = new BanksManager();
  }
  window.banksManager.showAddBankModal();
}

function addBank(e) {
  if (window.banksManager) {
    window.banksManager.addBank(e);
  }
}

function showBankFilterModal() {
  alert('Filtro avanzado de bancos en desarrollo');
}

function exportSelectedBanks() {
  alert('Exportando bancos seleccionados...');
}

function toggleSelectedBanksStatus() {
  alert('Cambiando estado de bancos seleccionados...');
}

function deleteSelectedBanks() {
  alert('Eliminando bancos seleccionados...');
}

function syncBanks() {
  alert('Sincronizando bancos con servicio externo...');
}

function generateQuickReport() {
  if (window.dashboard) {
    window.dashboard.generateQuickReport();
  }
}

function exportDashboardData(format = 'pdf') {
  if (window.dashboard) {
    window.dashboard.exportDashboardData(format);
  }
}

function syncData() {
  if (window.dashboard) {
    window.dashboard.syncData();
  }
}

function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(m => m.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

  const selectedTab = document.getElementById(tabName + 'Tab');
  const selectedMenu = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedMenu) selectedMenu.classList.add('active');

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
  const t = titles[tabName];
  if (t) {
    document.getElementById('pageTitle').textContent = t.title;
    document.getElementById('pageSubtitle').textContent = t.subtitle;
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}