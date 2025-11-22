class CategoriesManager {
  constructor() {
    this.user = checkAuth();
    this.userData = this.loadUserData();
    this.availableIcons = [
      '💰', '🍽️', '🚗', '🏠', '🎬', '⚕️', '💼', '💻', '📈', '🛒',
      '✈️', '🎓', '👕', '📱', '🏋️', '🎵', '📚', '🎮', '🍕', '☕',
      '🎯', '🔒', '💡', '🌱', '🔧', '🎨', '🏥', '🏦', '🛍️', '📊'
    ];
    this.init();
  }

  init() {
    this.renderCategories();
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
    const iconSelector = document.getElementById('iconSelector');
    if (iconSelector) {
      this.renderIconSelector(iconSelector);
    }
  }

  renderIconSelector(container) {
    container.innerHTML = this.availableIcons.map(icon => `
      <button type="button" class="icon-option" data-icon="${icon}" onclick="selectIcon('${icon}')">
        ${icon}
      </button>
    `).join('');
    selectIcon('💰');
  }

  renderCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;

    const categories = this.userData.categories || [];

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3>No hay categorías</h3>
          <p>Crea tu primera categoría para comenzar a organizar tus gastos</p>
          <button class="primary-button" onclick="showAddCategoryModal()">Agregar Categoría</button>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(category => {
      const percentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
      const remaining = category.budget - category.spent;
      const isOverBudget = percentage > 100;

      return `
        <div class="category-card">
          <div class="category-header">
            <div class="category-title">
              <span class="category-icon">${category.icon}</span>
              <span class="category-name">${category.name}</span>
            </div>
            <div class="category-color" style="background-color: ${category.color}"></div>
          </div>
          <div class="category-stats">
            <div class="stat-item">
              <span class="stat-label">Gastado</span>
              <span class="stat-value">${this.formatCurrency(category.spent)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Presupuesto</span>
              <span class="stat-value">${this.formatCurrency(category.budget)}</span>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill ${isOverBudget ? 'over-budget'}" 
                   style="width: ${Math.min(percentage, 100)}%; background-color: ${category.color}">
              </div>
            </div>
            <div class="progress-info">
              <span class="progress-percentage">${percentage.toFixed(1)}%</span>
              <span class="progress-remaining ${remaining < 0 ? 'negative' : ''}">
                ${remaining >= 0 ? 'Restante' : 'Excedido'}: ${this.formatCurrency(Math.abs(remaining))}
              </span>
            </div>
          </div>
          <div class="category-actions">
            <button class="action-button edit" onclick="editCategory(${category.id})">
              ✏️ Editar
            </button>
            <button class="action-button delete" onclick="deleteCategory(${category.id})">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  showAddCategoryModal() {
    const modal = document.getElementById('addCategoryModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;

    document.getElementById('categoryName').value = '';
    document.getElementById('categoryBudget').value = '';
    document.getElementById('categoryColor').value = '#3B82F6';

    const iconSelector = document.getElementById('iconSelector');
    if (iconSelector) {
      this.renderIconSelector(iconSelector);
    }

    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  addCategory(e) {
    e.preventDefault();

    const name = document.getElementById('categoryName').value.trim();
    const budget = parseFloat(document.getElementById('categoryBudget').value);
    const color = document.getElementById('categoryColor').value;
    const icon = document.querySelector('#iconSelector .icon-option.selected')?.dataset.icon || '💰';

    if (!name || isNaN(budget) || budget < 0) {
      alert('Por favor completa todos los campos correctamente.');
      return;
    }

    if (this.userData.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      alert('Ya existe una categoría con este nombre.');
      return;
    }

    const newCategory = {
      id: Date.now(),
      name,
      budget,
      spent: 0,
      color,
      icon
    };

    this.userData.categories.push(newCategory);
    this.saveUserData();
    this.renderCategories();

    closeModal();

    if (window.transactionsManager) {
      window.transactionsManager.updateCategoryFilter();
      window.transactionsManager.applyFilters();
    }

    alert('Categoría creada exitosamente');
  }

  editCategory(categoryId) {
    const category = this.userData.categories.find(c => c.id === categoryId);
    if (!category) return;

    const newName = prompt('Nuevo nombre de la categoría:', category.name);
    if (newName && newName.trim() !== category.name) {
      if (this.userData.categories.some(cat => cat.name.toLowerCase() === newName.trim().toLowerCase() && cat.id !== categoryId)) {
        alert('Ya existe una categoría con este nombre.');
        return;
      }
      category.name = newName.trim();
      this.saveUserData();
      this.renderCategories();
    }

    const newBudget = prompt('Nuevo presupuesto:', category.budget);
    if (newBudget && !isNaN(newBudget) && parseFloat(newBudget) >= 0) {
      category.budget = parseFloat(newBudget);
      this.saveUserData();
      this.renderCategories();
    }
  }

  deleteCategory(categoryId) {
    const categoryIndex = this.userData.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;

    const category = this.userData.categories[categoryIndex];

    const hasTransactions = this.userData.transactions.some(t => t.category === category.name);
    if (hasTransactions) {
      if (!confirm(`Esta categoría tiene transacciones asociadas. ¿Realmente deseas eliminarla? Las transacciones mantendrán la categoría pero no podrás filtrar por ella.`)) {
        return;
      }
    } else {
      if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`)) {
        return;
      }
    }

    this.userData.categories.splice(categoryIndex, 1);
    this.saveUserData();
    this.renderCategories();

    if (window.transactionsManager) {
      window.transactionsManager.updateCategoryFilter();
      window.transactionsManager.applyFilters();
    }

    alert('Categoría eliminada');
  }
}

function selectIcon(icon) {
  document.querySelectorAll('#iconSelector .icon-option').forEach(option => {
    option.classList.remove('selected');
  });
  const selectedOption = document.querySelector(`#iconSelector [data-icon="${icon}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
}

function showAddCategoryModal() {
  if (window.categoriesManager) {
    window.categoriesManager.showAddCategoryModal();
  }
}

function addCategory(e) {
  if (window.categoriesManager) {
    window.categoriesManager.addCategory(e);
  }
}

function editCategory(categoryId) {
  if (window.categoriesManager) {
    window.categoriesManager.editCategory(categoryId);
  }
}

function deleteCategory(categoryId) {
  if (window.categoriesManager) {
    window.categoriesManager.deleteCategory(categoryId);
  }
}

function closeModal() {
  const modals = document.querySelectorAll('.modal');
  const overlay = document.getElementById('modalOverlay');
  modals.forEach(modal => modal.style.display = 'none');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('categoriesTab')) {
    window.categoriesManager = new CategoriesManager();
  }
});