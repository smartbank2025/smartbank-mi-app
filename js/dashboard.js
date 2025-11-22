class Dashboard {
  constructor() {
    this.user = checkAuth();
    this.userData = this.loadUserData();
    this.charts = {};
    this.language = localStorage.getItem('language') || 'es';
    this.theme = localStorage.getItem('theme') || 'light';
    this.period = 'month';
    this.isLoading = false;
    this.refreshInterval = null;
    
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      this.applyTheme();
      this.updateSummaryCards();
      await this.createCharts();
      this.updateBudgetItems();
      this.setupAutoRefresh();
      this.setupNotifications();
      await this.initializeManagers();
    } catch (error) {
      console.error('Error al inicializar dashboard:', error);
      this.showError('Error al cargar el dashboard');
    }
  }

  setupEventListeners() {
    const periodSelector = document.getElementById('periodSelector');
    if (periodSelector) {
      periodSelector.addEventListener('change', (e) => {
        this.period = e.target.value;
        this.updateDashboard();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-action')) {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      }
    });
  }

  async initializeManagers() {
    const managers = [
      { name: 'transactionsManager', file: 'TransactionsManager' },
      { name: 'categoriesManager', file: 'CategoriesManager' },
      { name: 'banksManager', file: 'BanksManager' },
      { name: 'subscriptionsManager', file: 'SubscriptionsManager' }
    ];

    for (const manager of managers) {
      if (!window[manager.name]) {
        console.log(`Inicializando ${manager.name}...`);
      }
    }
  }

  setupAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, 5 * 60 * 1000);
  }

  setupNotifications() {
    this.checkPendingNotifications();
    setInterval(() => {
      this.checkPendingNotifications();
    }, 60000);
  }

  checkPendingNotifications() {
    const now = new Date();
    const subscriptions = this.userData.subscriptions || [];
    subscriptions.forEach(sub => {
      const nextPayment = new Date(sub.nextPayment);
      const daysUntil = Math.ceil((nextPayment - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntil === 1 && sub.active) {
        this.showNotification(
          `Mañana vence tu suscripción a ${sub.name}`,
          'warning'
        );
      }
    });

    const categories = this.userData.categories || [];
    categories.forEach(cat => {
      const percentage = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
      if (percentage >= 90 && percentage < 100) {
        this.showNotification(
          `Tu presupuesto en ${cat.name} está al ${percentage.toFixed(1)}%`,
          'warning'
        );
      } else if (percentage >= 100) {
        this.showNotification(
          `¡Has excedido tu presupuesto en ${cat.name}!`,
          'error'
        );
      }
    });
  }

  loadUserData() {
    try {
      const userDataKey = `userData_${this.user.id}`;
      const saved = localStorage.getItem(userDataKey);
      
      if (saved) {
        const data = JSON.parse(saved);
        return {
          transactions: data.transactions || [],
          categories: data.categories || [],
          subscriptions: data.subscriptions || [],
          banks: data.banks || [],
          settings: data.settings || {
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
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
    
    return {
      transactions: [],
      categories: [],
      subscriptions: [],
      banks: [],
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
  }

  saveUserData() {
    try {
      const userDataKey = `userData_${this.user.id}`;
      localStorage.setItem(userDataKey, JSON.stringify(this.userData));
      window.dispatchEvent(new CustomEvent('userDataChanged', { detail: { userData: this.userData } }));
    } catch (error) {
      console.error('Error al guardar datos del usuario:', error);
      this.showError('Error al guardar los datos');
    }
  }

  updateSummaryCards() {
    try {
      const transactions = this.getTransactionsForPeriod(this.period);
      const banks = this.userData.banks || [];

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const transactionBalance = totalIncome - totalExpenses;
      const banksBalance = banks
        .filter(b => b.isActive)
        .reduce((sum, b) => sum + b.balance, 0);
      
      const totalBalance = transactionBalance + banksBalance;
      const savingsRate = totalIncome > 0 ? (totalBalance / totalIncome) * 100 : 0;

      this.updateElement('totalBalance', this.formatCurrency(totalBalance));
      this.updateElement('totalIncome', this.formatCurrency(totalIncome));
      this.updateElement('totalExpenses', this.formatCurrency(totalExpenses));
      this.updateElement('savingsRate', `${savingsRate.toFixed(1)}%`);
      this.updateElement('balanceTrend', '+12% vs mes anterior'); // Simulado
      this.updateTrendColor('balanceTrend', totalBalance >= 0);
      this.updateAmountColor('totalIncome', 'positive');
      this.updateAmountColor('totalExpenses', 'negative');
    } catch (error) {
      console.error('Error al actualizar tarjetas de resumen:', error);
    }
  }

  getTransactionsForPeriod(period) {
    const transactions = this.userData.transactions || [];
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return transactions.filter(t => new Date(t.date) >= startDate);
  }

  async createCharts() {
    try {
      await this.createCashFlowChart();
      await this.createExpensesChart();
    } catch (error) {
      console.error('Error al crear gráficos:', error);
    }
  }

  async createCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart');
    if (!ctx) return;

    if (this.charts.cashFlow) {
      this.charts.cashFlow.destroy();
    }

    const data = this.generateCashFlowData();

    this.charts.cashFlow = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: this.language === 'es' ? 'Ingresos' : 'Income',
          data: data.income,
          backgroundColor: '#10B981',
          borderRadius: 4,
          borderSkipped: false,
        }, {
          label: this.language === 'es' ? 'Gastos' : 'Expenses',
          data: data.expenses,
          backgroundColor: '#3B82F6',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              callback: (value) => this.formatCurrency(value)
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  async createExpensesChart() {
    const ctx = document.getElementById('expensesChart');
    if (!ctx) return;

    if (this.charts.expenses) {
      this.charts.expenses.destroy();
    }

    const expensesByCategory = this.getExpensesByCategory();
    const colors = expensesByCategory.map(cat => 
      this.userData.categories.find(c => c.name === cat.category)?.color || '#3B82F6'
    );

    this.charts.expenses = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: expensesByCategory.map(d => d.category),
        datasets: [{
          data: expensesByCategory.map(d => d.amount),
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              generateLabels: (chart) => {
                const data = chart.data;
                return data.labels.map((label, index) => ({
                  text: `${label}: ${this.formatCurrency(data.datasets[0].data[index])}`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].backgroundColor[index],
                  pointStyle: 'circle',
                  hidden: false,
                  index: index
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${this.formatCurrency(context.parsed)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.updateExpensesLegend(expensesByCategory);
  }

  updateExpensesLegend(expensesByCategory) {
    const legendContainer = document.getElementById('expensesLegend');
    if (!legendContainer) return;

    const total = expensesByCategory.reduce((sum, d) => sum + d.amount, 0);

    legendContainer.innerHTML = expensesByCategory.map(item => {
      const category = this.userData.categories.find(c => c.name === item.category);
      const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
      
      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${category?.color || '#3B82F6'}"></div>
          <span>${item.category}: ${this.formatCurrency(item.amount)} (${percentage}%)</span>
        </div>
      `;
    }).join('');
  }

  generateCashFlowData() {
    const labels = this.getPeriodLabels();
    const income = [];
    const expenses = [];

    labels.forEach(label => {
      const periodData = this.getPeriodData(label);
      income.push(periodData.income);
      expenses.push(periodData.expenses);
    });

    return { labels, income, expenses };
  }

  getPeriodLabels() {
    const labels = [];
    const now = new Date();
    
    switch (this.period) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString(this.language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }));
        }
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.getDate().toString());
        }
        break;
      case 'quarter':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString(this.language === 'es' ? 'es-ES' : 'en-US', { month: 'short' }));
        }
        break;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString(this.language === 'es' ? 'es-ES' : 'en-US', { month: 'short' }));
        }
        break;
      default:
        labels.push('Período');
    }
    
    return labels;
  }

  getPeriodData(label) {
    // Simulación de datos por período
    return {
      income: Math.floor(Math.random() * 3000) + 4000,
      expenses: Math.floor(Math.random() * 2000) + 3000
    };
  }

  getExpensesByCategory() {
    const transactions = this.getTransactionsForPeriod(this.period);
    const expenses = transactions.filter(t => t.type === 'expense');
    const byCategory = {};

    expenses.forEach(transaction => {
      if (!byCategory[transaction.category]) {
        byCategory[transaction.category] = 0;
      }
      byCategory[transaction.category] += transaction.amount;
    });

    return Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  updateBudgetItems() {
    const container = document.getElementById('budgetItems');
    if (!container) return;

    const categories = this.userData.categories || [];

    container.innerHTML = categories.map(category => {
      const percentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
      const remaining = category.budget - category.spent;
      const isOverBudget = percentage > 100;
      const isNearLimit = percentage >= 80 && percentage < 100;

      return `
        <div class="budget-item">
          <div class="budget-header">
            <span class="budget-name">${category.icon} ${category.name}</span>
            <span class="budget-amount">
              ${this.formatCurrency(category.spent)} / ${this.formatCurrency(category.budget)}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${isOverBudget ? 'over-budget' : ''} ${isNearLimit ? 'near-limit' : ''}" 
                 style="width: ${Math.min(percentage, 100)}%; background-color: ${category.color}"
                 role="progressbar"
                 aria-valuenow="${percentage}"
                 aria-valuemin="0"
                 aria-valuemax="100">
            </div>
          </div>
          <div class="progress-info">
            <span class="progress-percentage">${percentage.toFixed(1)}%</span>
            <span class="progress-remaining ${remaining < 0 ? 'negative' : ''}">
              ${remaining >= 0 ? (this.language === 'es' ? 'Restante' : 'Remaining') : (this.language === 'es' ? 'Excedido' : 'Over')}:
              ${this.formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  handleQuickAction(action) {
    switch (action) {
      case 'sync':
        this.syncData();
        break;
      case 'refresh':
        this.refreshDashboard();
        break;
      case 'export':
        this.exportDashboardData();
        break;
      case 'report':
        this.generateQuickReport();
        break;
      default:
        console.log(`Acción ${action} no implementada`);
    }
  }

  async syncData() {
    try {
      this.showLoading('Sincronizando datos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.showSuccess('Datos sincronizados exitosamente');
      this.refreshDashboard();
    } catch (error) {
      console.error('Error al sincronizar:', error);
      this.showError('Error al sincronizar datos');
    } finally {
      this.hideLoading();
    }
  }

  refreshDashboard() {
    this.updateSummaryCards();
    this.createCharts();
    this.updateBudgetItems();
    this.checkPendingNotifications();
  }

  updateDashboard(period = null) {
    if (period) {
      this.period = period;
    }
    
    this.updateSummaryCards();
    this.createCharts();
    this.updateBudgetItems();
  }

  generateQuickReport() {
    try {
      const data = this.prepareExportData();
      if (!data) return;

      const reportHTML = this.generateReportHTML(data);
      const modal = this.createModal('Reporte Financiero Rápido', reportHTML, {
        showPrint: true,
        showExport: true,
        onPrint: () => this.printReport(data),
        onExport: () => this.exportDashboardData('pdf')
      });

    } catch (error) {
      console.error('Error al generar reporte:', error);
      this.showError('Error al generar el reporte');
    }
  }

  prepareExportData() {
    try {
      const transactions = this.getTransactionsForPeriod(this.period);
      const categories = this.userData.categories || [];
      const banks = this.userData.banks || [];
      const subscriptions = this.userData.subscriptions || [];

      return {
        summary: {
          totalBalance: document.getElementById('totalBalance')?.textContent || '$0.00',
          totalIncome: document.getElementById('totalIncome')?.textContent || '$0.00',
          totalExpenses: document.getElementById('totalExpenses')?.textContent || '$0.00',
          savingsRate: document.getElementById('savingsRate')?.textContent || '0.0%',
          period: this.period,
          currency: this.userData.settings?.currency || 'USD'
        },
        transactions: transactions,
        categories: categories,
        banks: banks,
        subscriptions: subscriptions,
        exportDate: new Date().toISOString(),
        user: {
          name: `${this.user.firstName} ${this.user.lastName}`,
          email: this.user.email
        }
      };
    } catch (error) {
      console.error('Error al preparar datos de exportación:', error);
      return null;
    }
  }

  generateReportHTML(data) {
    const periodText = this.getPeriodText(data.summary.period);
    
    return `
      <div class="report-content">
        <div class="report-header">
          <h1>📊 ${this.language === 'es' ? 'Reporte Financiero' : 'Financial Report'} - Smart/Bank</h1>
          <p>${this.language === 'es' ? 'Generado el' : 'Generated on'} ${new Date().toLocaleDateString(this.language === 'es' ? 'es-ES' : 'en-US')}</p>
          <p>${this.language === 'es' ? 'Período' : 'Period'}: ${periodText}</p>
          <p>${this.language === 'es' ? 'Usuario' : 'User'}: ${data.user.name} (${data.user.email})</p>
        </div>

        <div class="report-summary">
          <div class="summary-item">
            <h4>💰 ${this.language === 'es' ? 'Saldo Total' : 'Total Balance'}</h4>
            <p>${data.summary.totalBalance}</p>
          </div>
          <div class="summary-item">
            <h4>📈 ${this.language === 'es' ? 'Ingresos' : 'Income'}</h4>
            <p>${data.summary.totalIncome}</p>
          </div>
          <div class="summary-item">
            <h4>📉 ${this.language === 'es' ? 'Gastos' : 'Expenses'}</h4>
            <p>${data.summary.totalExpenses}</p>
          </div>
          <div class="summary-item">
            <h4>🎯 ${this.language === 'es' ? 'Tasa de Ahorro' : 'Savings Rate'}</h4>
            <p>${data.summary.savingsRate}</p>
          </div>
        </div>

        <div class="report-section">
          <h2>🏦 ${this.language === 'es' ? 'Resumen de Bancos' : 'Bank Summary'}</h2>
          ${data.banks.map(bank => `
            <div class="report-item">
              <span>${bank.name} (${this.getAccountTypeLabel(bank.type)})</span>
              <span>${this.formatCurrency(bank.balance)} ${bank.currency}</span>
            </div>
          `).join('')}
        </div>

        <div class="report-section">
          <h2>📊 ${this.language === 'es' ? 'Transacciones Recientes' : 'Recent Transactions'}</h2>
          ${data.transactions.slice(0, 10).map(t => `
            <div class="report-item">
              <span>${t.description} (${t.category})</span>
              <span class="${t.type === 'income' ? 'positive' : 'negative'}">
                ${t.type === 'income' ? '+' : '-'}${this.formatCurrency(t.amount)}
              </span>
            </div>
          `).join('')}
        </div>

        <div class="report-section">
          <h2>🔄 ${this.language === 'es' ? 'Suscripciones Activas' : 'Active Subscriptions'}</h2>
          ${data.subscriptions.filter(s => s.active).map(sub => `
            <div class="report-item">
              <span>${sub.icon} ${sub.name}</span>
              <span>${this.formatCurrency(sub.price)}/${sub.billingCycle === 'monthly' ? 'mes' : 'año'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  printReport(data) {
    const printWindow = window.open('', '_blank');
    const htmlContent = this.generatePrintableHTML(data);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }

  generatePrintableHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Financiero - Smart/Bank</title>
        <style>
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 20px; 
            color: #333;
          }
          .report-header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #3B82F6;
            padding-bottom: 20px;
          }
          .report-summary { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .report-section { 
            margin-bottom: 30px; 
          }
          .report-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .positive { color: #10B981; }
          .negative { color: #EF4444; }
          @media print { 
            body { margin: 10px; } 
          }
        </style>
      </head>
      <body>
        ${this.generateReportHTML(data)}
      </body>
      </html>
    `;
  }

  exportDashboardData(format = 'pdf') {
    try {
      const data = this.prepareExportData();
      if (!data) return;

      switch (format) {
        case 'pdf':
          this.printReport(data);
          break;
        case 'csv':
          this.exportToCSV(data);
          break;
        case 'json':
          this.exportToJSON(data);
          break;
        default:
          console.error('Formato de exportación no soportado:', format);
      }
    } catch (error) {
      console.error('Error al exportar datos:', error);
      this.showError('Error al exportar los datos');
    }
  }

  exportToCSV(data) {
    const headers = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', 'Ubicación', 'Método', 'Notas'];
    const rows = data.transactions.map(t => [
      t.date,
      t.description,
      t.category,
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.amount,
      t.location || '',
      t.method || '',
      t.notes || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    this.downloadFile(csv, `reporte_${data.exportDate.split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  exportToJSON(data) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, `datos_${data.exportDate.split('T')[0]}.json`, 'application/json');
  }

  downloadFile(content, filename, mimeType) {
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

  getPeriodText(period) {
    const texts = {
      es: {
        week: 'Semana',
        month: 'Mes',
        quarter: 'Trimestre',
        year: 'Año'
      },
      en: {
        week: 'Week',
        month: 'Month',
        quarter: 'Quarter',
        year: 'Year'
      }
    };
    
    return texts[this.language]?.[period] || period;
  }

  getAccountTypeLabel(type) {
    const labels = {
      es: {
        'checking': 'Cuenta Corriente',
        'savings': 'Cuenta de Ahorros',
        'credit': 'Tarjeta de Crédito',
        'investment': 'Cuenta de Inversión'
      },
      en: {
        'checking': 'Checking Account',
        'savings': 'Savings Account',
        'credit': 'Credit Card',
        'investment': 'Investment Account'
      }
    };
    
    return labels[this.language]?.[type] || type;
  }

  formatCurrency(amount, currency = null) {
    const curr = currency || this.userData.settings?.currency || 'USD';
    return new Intl.NumberFormat(this.language === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  updateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  updateTrendColor(elementId, isPositive) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = `trend ${isPositive ? 'positive' : 'negative'}`;
    }
  }

  updateAmountColor(elementId, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add(type);
    }
  }

  showLoading(message = 'Cargando...') {
    console.log(message);
  }

  hideLoading() {
    console.log('Carga completada');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  createModal(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-actions">
          ${options.showPrint ? `<button class="save-button" onclick="${options.onPrint}">Imprimir</button>` : ''}
          ${options.showExport ? `<button class="save-button" onclick="${options.onExport}">Exportar</button>` : ''}
          <button class="cancel-button" onclick="this.closest('.modal').remove()">Cerrar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
  }
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

document.addEventListener('DOMContentLoaded', function () {
  if (window.location.pathname.includes('dashboard')) {
    window.dashboard = new Dashboard();
  }
});