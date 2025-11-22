class SubscriptionsManager {
  constructor() {
    this.user = checkAuth();
    this.userData = this.loadUserData();
    this.availableIcons = [
      '📱', '🎬', '🎵', '💪', '🎨', '📺', '🎮', '☁️', '📰', '🍕',
      '🚗', '🏠', '💻', '📚', '🎓', '✈️', '🏋️', '☕', '🎯', '🔒',
      '🌐', '🛡️', '📞', '💡', '🔌', '🧪', '🏪', '🚚', '🎁', '🏆'
    ];
    this.init();
  }

  init() {
    this.updateSummary();
    this.renderSubscriptions();
    this.setupEventListeners();
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
    const iconSelector = document.getElementById('subscriptionIconSelector');
    if (iconSelector) {
      this.renderIconSelector(iconSelector);
    }
  }

  renderIconSelector(container) {
    container.innerHTML = this.availableIcons.map(icon => `
      <button type="button" class="icon-option" data-icon="${icon}" onclick="selectSubscriptionIcon('${icon}')">
        ${icon}
      </button>
    `).join('');
    selectSubscriptionIcon('📱');
  }

  updateSummary() {
    const subscriptions = this.userData.subscriptions || [];
    const activeCount = subscriptions.filter(s => s.active).length;
    const monthlyTotal = subscriptions
      .filter(s => s.active && s.billingCycle === 'monthly')
      .reduce((sum, s) => sum + s.price, 0);
    const annualTotal = subscriptions
      .filter(s => s.active && s.billingCycle === 'annual')
      .reduce((sum, s) => sum + s.price, 0);

    document.getElementById('totalSubscriptions').textContent = subscriptions.length;
    document.getElementById('monthlySubscriptions').textContent = this.formatCurrency(monthlyTotal);
    document.getElementById('annualSubscriptions').textContent = this.formatCurrency(annualTotal);
    document.getElementById('activeSubscriptions').textContent = activeCount;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  renderSubscriptions() {
    const container = document.getElementById('subscriptionsGrid');
    if (!container) return;

    const subscriptions = this.userData.subscriptions || [];

    if (subscriptions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔄</div>
          <h3>No hay suscripciones</h3>
          <p>Agrega tu primera suscripción para comenzar a gestionar tus pagos recurrentes</p>
          <button class="primary-button" onclick="showAddSubscriptionModal()">Agregar Suscripción</button>
        </div>
      `;
      return;
    }

    container.innerHTML = subscriptions.map(subscription => {
      const nextPaymentDate = new Date(subscription.nextPayment);
      const daysUntilPayment = Math.ceil((nextPaymentDate - new Date()) / (1000 * 60 * 60 * 24));

      return `
        <div class="subscription-card">
          <div class="subscription-header">
            <div class="subscription-title">
              <div class="subscription-icon" style="background-color: ${subscription.color}20">
                ${subscription.icon}
              </div>
              <span class="subscription-name">${subscription.name}</span>
            </div>
            <span class="subscription-status ${subscription.active ? 'active' : 'inactive'}">
              ${subscription.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div class="subscription-details">
            <div class="detail-row">
              <span class="detail-label">Precio:</span>
              <span class="detail-value price">${this.formatCurrency(subscription.price)}/${subscription.billingCycle === 'monthly' ? 'mes' : 'año'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Próximo pago:</span>
              <span class="detail-value">${nextPaymentDate.toLocaleDateString('es-ES')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Faltan:</span>
              <span class="detail-value ${daysUntilPayment <= 7 ? 'urgent' : ''}">${daysUntilPayment} días</span>
            </div>
          </div>
          <div class="subscription-actions">
            <button class="action-button toggle" onclick="toggleSubscription(${subscription.id})">
              ${subscription.active ? '⏸️ Pausar' : '▶️ Activar'}
            </button>
            <button class="action-button edit" onclick="editSubscription(${subscription.id})">
              ✏️ Editar
            </button>
            <button class="action-button delete" onclick="deleteSubscription(${subscription.id})">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  showAddSubscriptionModal() {
    const modal = document.getElementById('addSubscriptionModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;

    document.getElementById('subscriptionName').value = '';
    document.getElementById('subscriptionPrice').value = '';
    document.getElementById('subscriptionCycle').value = 'monthly';
    document.getElementById('subscriptionNextPayment').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('subscriptionColor').value = '#3B82F6';

    const iconSelector = document.getElementById('subscriptionIconSelector');
    if (iconSelector) {
      this.renderIconSelector(iconSelector);
    }

    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  addSubscription(e) {
    e.preventDefault();

    const name = document.getElementById('subscriptionName').value.trim();
    const price = parseFloat(document.getElementById('subscriptionPrice').value);
    const billingCycle = document.getElementById('subscriptionCycle').value;
    const nextPayment = document.getElementById('subscriptionNextPayment').value;
    const color = document.getElementById('subscriptionColor').value;
    const icon = document.querySelector('#subscriptionIconSelector .icon-option.selected')?.dataset.icon || '📱';

    if (!name || isNaN(price) || price <= 0 || !nextPayment) {
      alert('Por favor completa todos los campos correctamente.');
      return;
    }

    if (this.userData.subscriptions.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
      alert('Ya existe una suscripción con este nombre.');
      return;
    }

    const newSubscription = {
      id: Date.now(),
      name,
      price,
      billingCycle,
      nextPayment,
      active: true,
      color,
      icon
    };

    this.userData.subscriptions.push(newSubscription);
    this.saveUserData();
    this.updateSummary();
    this.renderSubscriptions();

    closeModal();
    alert('Suscripción agregada exitosamente');
  }

  toggleSubscription(subscriptionId) {
    const subscription = this.userData.subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    subscription.active = !subscription.active;
    this.saveUserData();
    this.updateSummary();
    this.renderSubscriptions();

    alert(subscription.active ? 'Suscripción activada' : 'Suscripción pausada');
  }

  editSubscription(subscriptionId) {
    const subscription = this.userData.subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    const newName = prompt('Nuevo nombre de la suscripción:', subscription.name);
    if (newName && newName.trim() !== subscription.name) {
      if (this.userData.subscriptions.some(sub => sub.name.toLowerCase() === newName.trim().toLowerCase() && sub.id !== subscriptionId)) {
        alert('Ya existe una suscripción con este nombre.');
        return;
      }
      subscription.name = newName.trim();
      this.saveUserData();
      this.renderSubscriptions();
    }

    const newPrice = prompt('Nuevo precio:', subscription.price);
    if (newPrice && !isNaN(newPrice) && parseFloat(newPrice) > 0) {
      subscription.price = parseFloat(newPrice);
      this.saveUserData();
      this.updateSummary();
      this.renderSubscriptions();
    }
  }

  deleteSubscription(subscriptionId) {
    const subscriptionIndex = this.userData.subscriptions.findIndex(s => s.id === subscriptionId);
    if (subscriptionIndex === -1) return;

    const subscription = this.userData.subscriptions[subscriptionIndex];

    if (!confirm(`¿Estás seguro de que deseas eliminar la suscripción "${subscription.name}"?`)) {
      return;
    }

    this.userData.subscriptions.splice(subscriptionIndex, 1);
    this.saveUserData();
    this.updateSummary();
    this.renderSubscriptions();

    alert('Suscripción eliminada');
  }
}

function selectSubscriptionIcon(icon) {
  document.querySelectorAll('#subscriptionIconSelector .icon-option').forEach(option => {
    option.classList.remove('selected');
  });
  const selectedOption = document.querySelector(`#subscriptionIconSelector [data-icon="${icon}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
}

function showAddSubscriptionModal() {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.showAddSubscriptionModal();
  }
}

function addSubscription(e) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.addSubscription(e);
  }
}

function toggleSubscription(subscriptionId) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.toggleSubscription(subscriptionId);
  }
}

function editSubscription(subscriptionId) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.editSubscription(subscriptionId);
  }
}

function deleteSubscription(subscriptionId) {
  if (window.subscriptionsManager) {
    window.subscriptionsManager.deleteSubscription(subscriptionId);
  }
}

function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(modal => modal.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('subscriptionsTab')) {
    window.subscriptionsManager = new SubscriptionsManager();
  }
});