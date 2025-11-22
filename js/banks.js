class BanksManager {
  constructor() {
    this.user = checkAuth();
    this.userData = this.loadUserData();
    this.availableBankColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    this.init();
  }

  init() {
    this.updateBanksSummary();
    this.renderBanks();
    this.setupEventListeners();
  }

  loadUserData() {
    const userDataKey = `userData_${this.user.id}`;
    const saved = localStorage.getItem(userDataKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.banks) data.banks = this.getDefaultBanks();
      return data;
    }
    return { banks: this.getDefaultBanks() };
  }

  getDefaultBanks() {
    return [
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
    ];
  }

  saveUserData() {
    const userDataKey = `userData_${this.user.id}`;
    localStorage.setItem(userDataKey, JSON.stringify(this.userData));
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-action')) {
        const action = e.target.dataset.action;
        const bankId = e.target.dataset.bankId;
        this.handleQuickAction(action, bankId);
      }
    });
  }

  updateBanksSummary() {
    const banks = this.userData.banks;
    const activeBanks = banks.filter(b => b.isActive);
    const totalBalance = activeBanks.reduce((sum, b) => sum + b.balance, 0);

    document.getElementById('totalBanks').textContent = banks.length;
    document.getElementById('activeBanks').textContent = activeBanks.length;
    document.getElementById('totalBanksBalance').textContent = `$${totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    document.getElementById('totalCurrencies').textContent = [...new Set(banks.map(b => b.currency))].length;
  }

  renderBanks() {
    const container = document.getElementById('banksGrid');
    if (!container) return;

    const banks = this.userData.banks;

    if (banks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏦</div>
          <h3>No hay bancos registrados</h3>
          <p>Agrega tu primer banco para comenzar a gestionar tus cuentas financieras</p>
          <button class="primary-button" onclick="showAddBankModal()">Agregar Banco</button>
        </div>
      `;
      return;
    }

    container.innerHTML = banks.map(bank => {
      const typeLabel = this.getAccountTypeLabel(bank.type);
      const statusClass = bank.isActive ? 'active' : 'inactive';
      const statusText = bank.isActive ? 'Activa' : 'Inactiva';

      return `
        <div class="bank-card ${statusClass}" data-bank-id="${bank.id}">
          <div class="bank-header">
            <div class="bank-info">
              <div class="bank-icon" style="background-color: ${bank.color}">
                🏦
              </div>
              <div class="bank-details">
                <h4 class="bank-name">${bank.name}</h4>
                <p class="bank-type">${typeLabel}</p>
                <p class="bank-account">${bank.accountNumber}</p>
              </div>
            </div>
            <div class="bank-status">
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
          </div>

          <div class="bank-balance">
            <span class="balance-label">Saldo Actual</span>
            <span class="balance-amount">$${bank.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            <span class="balance-currency">${bank.currency}</span>
          </div>

          <div class="bank-actions">
            <button class="quick-action primary" data-action="transfer" data-bank-id="${bank.id}">
              💸 Transferir
            </button>
            <button class="quick-action secondary" data-action="history" data-bank-id="${bank.id}">
              📋 Historial
            </button>
            <button class="quick-action secondary" data-action="edit" data-bank-id="${bank.id}">
              ✏️ Editar
            </button>
            <button class="quick-action danger" data-action="delete" data-bank-id="${bank.id}">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  getAccountTypeLabel(type) {
    const labels = {
      'checking': 'Cuenta Corriente',
      'savings': 'Cuenta de Ahorros',
      'credit': 'Tarjeta de Crédito',
      'investment': 'Cuenta de Inversión'
    };
    return labels[type] || 'Otra';
  }

  handleQuickAction(action, bankId) {
    const bank = this.userData.banks.find(b => b.id === parseInt(bankId));
    if (!bank) return;

    switch (action) {
      case 'transfer':
        this.showTransferModal(bank);
        break;
      case 'history':
        this.showBankHistory(bank);
        break;
      case 'edit':
        this.showEditBankModal(bank);
        break;
      case 'delete':
        this.deleteBank(bank);
        break;
    }
  }

  showAddBankModal() {
    const modal = document.getElementById('addBankModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;

    document.getElementById('addBankForm').reset();
    document.getElementById('bankCurrency').value = 'USD';
    document.getElementById('bankColor').value = this.availableBankColors[0];
    document.getElementById('isActive').checked = true;

    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  addBank(e) {
    e.preventDefault();

    const name = document.getElementById('bankName').value.trim();
    const type = document.getElementById('accountType').value;
    const balance = parseFloat(document.getElementById('bankBalance').value);
    const accountNumber = document.getElementById('accountNumber').value || '****0000';
    const currency = document.getElementById('bankCurrency').value;
    const color = document.getElementById('bankColor').value;
    const isActive = document.getElementById('isActive').checked;

    if (!name || isNaN(balance) || balance < 0) {
      alert('Por favor completa todos los campos correctamente.');
      return;
    }

    if (this.userData.banks.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      alert('Ya existe un banco con este nombre.');
      return;
    }

    const newBank = {
      id: Date.now(),
      name,
      type,
      balance,
      accountNumber,
      currency,
      color,
      isActive,
      createdAt: new Date().toISOString()
    };

    this.userData.banks.push(newBank);
    this.saveUserData();
    this.updateBanksSummary();
    this.renderBanks();

    closeModal();
    alert('Banco agregado exitosamente');
  }

  showEditBankModal(bank) {
    const newName = prompt('Nuevo nombre del banco:', bank.name);
    if (newName && newName.trim() !== bank.name) {
      if (this.userData.banks.some(b => b.name.toLowerCase() === newName.trim().toLowerCase() && b.id !== bank.id)) {
        alert('Ya existe un banco con este nombre.');
        return;
      }
      bank.name = newName.trim();
      this.saveUserData();
      this.renderBanks();
    }

    const newBalance = prompt('Nuevo saldo:', bank.balance);
    if (newBalance && !isNaN(newBalance) && parseFloat(newBalance) >= 0) {
      bank.balance = parseFloat(newBalance);
      this.saveUserData();
      this.updateBanksSummary();
      this.renderBanks();
    }
  }

  deleteBank(bank) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el banco "${bank.name}"?`)) {
      return;
    }

    const bankIndex = this.userData.banks.findIndex(b => b.id === bank.id);
    if (bankIndex !== -1) {
      this.userData.banks.splice(bankIndex, 1);
      this.saveUserData();
      this.updateBanksSummary();
      this.renderBanks();
    }
  }

  showTransferModal(bank) {
    const amount = prompt(`Monto a transferir desde ${bank.name}:`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const transferAmount = parseFloat(amount);
      if (transferAmount > bank.balance) {
        alert('Fondos insuficientes');
        return;
      }

      const transaction = {
        id: Date.now(),
        type: 'expense',
        amount: transferAmount,
        category: 'Transferencia',
        description: `Transferencia desde ${bank.name}`,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        location: 'Transferencia Interna',
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        method: 'Transferencia',
        bankId: bank.id
      };

      bank.balance -= transferAmount;

      if (!this.userData.transactions) this.userData.transactions = [];
      this.userData.transactions.unshift(transaction);

      this.saveUserData();
      this.updateBanksSummary();
      this.renderBanks();

      if (window.transactionsManager) {
        window.transactionsManager.applyFilters();
        window.transactionsManager.renderTransactions();
      }

      alert('Transferencia realizada exitosamente');
    }
  }

  showBankHistory(bank) {
    const bankTransactions = (this.userData.transactions || []).filter(t => t.bankId === bank.id);

    if (bankTransactions.length === 0) {
      alert(`No hay transacciones registradas para ${bank.name}`);
      return;
    }

    let historyHtml = `
      <h3>Historial de ${bank.name}</h3>
      <div class="bank-history-list">
    `;

    bankTransactions.forEach(transaction => {
      const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
      const amountPrefix = transaction.type === 'income' ? '+' : '-';

      historyHtml += `
        <div class="history-item">
          <div class="history-date">${new Date(transaction.date).toLocaleDateString('es-ES')}</div>
          <div class="history-description">${transaction.description}</div>
          <div class="history-amount ${amountClass}">
            ${amountPrefix}$${transaction.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </div>
        </div>
      `;
    });

    historyHtml += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content">
        ${historyHtml}
        <div class="modal-actions">
          <button class="cancel-button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').style.display='none';">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('modalOverlay').style.display = 'block';
  }
}

function showAddBankModal() {
  if (window.banksManager) {
    window.banksManager.showAddBankModal();
  }
}

function addBank(e) {
  if (window.banksManager) {
    window.banksManager.addBank(e);
  }
}

function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(modal => modal.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('banksTab')) {
    window.banksManager = new BanksManager();
  }
});