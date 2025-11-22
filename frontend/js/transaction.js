class TransactionsManager {
  constructor() {
    this.user = checkAuth();
    this.userData = this.loadUserData();
    this.filteredTransactions = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCategoryFilter();
    this.filterTransactions();
    this.renderTransactions();
    this.updateFilterSummary();
  }

  loadUserData() {
    const userDataKey = `userData_${this.user.id}`;
    const saved = localStorage.getItem(userDataKey);
    return saved ? JSON.parse(saved) : null;
  }

  saveUserData() {
    const userDataKey = `userData_${this.user.id}`;
    localStorage.setItem(userDataKey, JSON.stringify(this.userData));
  }

  setupEventListeners() {
    const search = document.getElementById('transactionSearch');
    const periodFilter = document.getElementById('periodFilter');
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    if (search) search.addEventListener('input', () => this.applyFilters());
    if (periodFilter) periodFilter.addEventListener('change', () => this.applyFilters());
    if (typeFilter) typeFilter.addEventListener('change', () => this.applyFilters());
    if (categoryFilter) categoryFilter.addEventListener('change', () => this.applyFilters());
  }

  updateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const categories = this.userData.categories || [];
    select.innerHTML = '<option value="all">Todas las categorías</option>' +
      categories.map(cat => `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`).join('');
  }

  applyFilters() {
    this.filterTransactions();
    this.renderTransactions();
    this.updateFilterSummary();
  }

  filterTransactions() {
    const search = (document.getElementById('transactionSearch')?.value || '').toLowerCase();
    const period = document.getElementById('periodFilter')?.value || '30-days';
    const type = document.getElementById('typeFilter')?.value || 'all';
    const category = document.getElementById('categoryFilter')?.value || 'all';

    let filtered = this.userData.transactions || [];

    if (search) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
      );
    }

    if (type !== 'all') {
      filtered = filtered.filter(t => t.type === type);
    }

    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case '7-days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30-days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90-days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'this-year':
        startDate.setMonth(0, 1);
        break;
    }

    filtered = filtered.filter(t => new Date(t.date) >= startDate);
    this.filteredTransactions = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  renderTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (this.filteredTransactions.length === 0) {
      container.innerHTML = `
        <div class="no-transactions">
          <div class="no-transactions-icon">📊</div>
          <h3>No se encontraron transacciones</h3>
          <p>Intenta ajustar los filtros o agrega una nueva transacción</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredTransactions.map(transaction => {
      const category = this.userData.categories.find(c => c.name === transaction.category);
      const amountClass = transaction.type === 'income' ? 'income' : 'expense';
      const amountPrefix = transaction.type === 'income' ? '+' : '-';

      return `
        <div class="transaction-item" onclick="showTransactionDetail(${transaction.id})">
          <div class="transaction-left">
            <div class="transaction-icon" style="background-color: ${category?.color || '#3B82F6'}20">
              ${category?.icon || '💰'}
            </div>
            <div class="transaction-info">
              <h4>${transaction.description}</h4>
              <div class="transaction-meta">
                <span>${transaction.category}</span>
                <span>•</span>
                <span>📍 ${transaction.location}</span>
                <span>•</span>
                <span>🕐 ${transaction.time}</span>
              </div>
            </div>
          </div>
          <div class="transaction-right">
            <div class="transaction-amount ${amountClass}">
              ${amountPrefix}${this.formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-date">${new Date(transaction.date).toLocaleDateString('es-ES')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateFilterSummary() {
    const totalIncome = this.filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = this.filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    document.getElementById('transactionCount').textContent = this.filteredTransactions.length;
    document.getElementById('filterIncome').textContent = this.formatCurrency(totalIncome);
    document.getElementById('filterExpenses').textContent = this.formatCurrency(totalExpenses);
    document.getElementById('filterBalance').textContent = this.formatCurrency(balance);

    const periodText = {
      '7-days': '7 días',
      '30-days': '30 días',
      '90-days': '90 días',
      'this-year': 'Este año'
    };

    document.getElementById('filterPeriod').textContent = periodText[document.getElementById('periodFilter')?.value] || 'Personalizado';
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  showAddTransactionModal(type = 'expense') {
    const modal = document.getElementById('addTransactionModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;

    document.getElementById('addTransactionForm').reset();
    document.getElementById('transactionType').value = type;
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];

    const categorySelect = document.getElementById('transactionCategory');
    categorySelect.innerHTML = '<option value="">Selecciona una categoría</option>' +
      (this.userData.categories || []).map(cat => `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`).join('');

    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  addTransaction(e) {
    e.preventDefault();

    const transaction = {
      id: Date.now(),
      type: document.getElementById('transactionType').value,
      amount: parseFloat(document.getElementById('transactionAmount').value),
      category: document.getElementById('transactionCategory').value,
      description: document.getElementById('transactionDescription').value,
      date: document.getElementById('transactionDate').value,
      status: 'completed',
      location: document.getElementById('transactionLocation').value || 'Ubicación no informada',
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      method: document.getElementById('transactionMethod').value || 'No informado'
    };

    if (!transaction.description || !transaction.category || isNaN(transaction.amount) || transaction.amount <= 0) {
      alert('Por favor completa todos los campos correctamente.');
      return;
    }

    this.userData.transactions.unshift(transaction);

    const category = this.userData.categories.find(c => c.name === transaction.category);
    if (category && transaction.type === 'expense') {
      category.spent += transaction.amount;
    }

    this.saveUserData();
    this.applyFilters();
    this.renderTransactions();
    this.updateFilterSummary();

    closeModal();
    alert('Transacción agregada exitosamente');
  }

  showTransactionDetail(transactionId) {
    const transaction = this.userData.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const category = this.userData.categories.find(c => c.name === transaction.category);
    const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
    const amountPrefix = transaction.type === 'income' ? '+' : '-';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Detalle de Transacción</h3>
        <div class="transaction-detail-header">
          <div class="transaction-detail-icon" style="background-color: ${category?.color || '#3B82F6'}20">
            ${category?.icon || '💰'}
          </div>
          <div class="transaction-detail-amount ${amountClass}">
            ${amountPrefix}${this.formatCurrency(transaction.amount)}
          </div>
          <div class="transaction-detail-description">${transaction.description}</div>
        </div>
        <div class="transaction-detail-info">
          <div class="detail-row">
            <span class="detail-label">Categoría:</span>
            <span class="detail-value">${transaction.category}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${new Date(transaction.date).toLocaleDateString('es-ES', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hora:</span>
            <span class="detail-value">${transaction.time}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Ubicación:</span>
            <span class="detail-value">${transaction.location}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Método:</span>
            <span class="detail-value">${transaction.method}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Estado:</span>
            <span class="detail-value status completed">✓ Completada</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="cancel-button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').style.display='none';">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('modalOverlay').style.display = 'block';
  }

  exportTransactions() {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  generateCSV() {
    const headers = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', 'Ubicación', 'Método'];
    const rows = this.filteredTransactions.map(t => [
      t.date,
      t.description,
      t.category,
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.amount,
      t.location,
      t.method
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

function showAddTransactionModal(type = 'expense') {
  if (window.transactionsManager) {
    window.transactionsManager.showAddTransactionModal(type);
  }
}

function addTransaction(e) {
  if (window.transactionsManager) {
    window.transactionsManager.addTransaction(e);
  }
}

function showTransactionDetail(id) {
  if (window.transactionsManager) {
    window.transactionsManager.showTransactionDetail(id);
  }
}

function exportTransactions() {
  if (window.transactionsManager) {
    window.transactionsManager.exportTransactions();
  }
}

function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(modal => modal.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('transactionsTab')) {
    window.transactionsManager = new TransactionsManager();
  }
});