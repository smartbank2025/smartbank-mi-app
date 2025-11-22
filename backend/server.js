// 📦 BACKEND COMPLETO - SMART/BANK
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// 🔧 CONFIGURACIÓN
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir archivos estáticos

// 🌐 CONEXIÓN A MONGODB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://usuario:contraseña@cluster.mongodb.net/smartbank?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 📋 ESQUEMAS

// Usuario
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  currency: { type: String, default: 'USD' },
  language: { type: String, default: 'es' },
  theme: { type: String, default: 'light' },
  savingsGoal: { type: Number, default: 20 },
  emergencyFund: { type: Number, default: 10000 },
  createdAt: { type: Date, default: Date.now }
});

// Transacción
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: String,
  method: String,
  bankId: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

// Categoría
const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: '💰' },
  createdAt: { type: Date, default: Date.now }
});

// Suscripción
const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
  nextPayment: { type: Date, required: true },
  active: { type: Boolean, default: true },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: '📱' },
  createdAt: { type: Date, default: Date.now }
});

// Banco
const bankSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['checking', 'savings', 'credit', 'investment'], default: 'checking' },
  balance: { type: Number, default: 0 },
  accountNumber: String,
  currency: { type: String, default: 'USD' },
  color: { type: String, default: '#3B82F6' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// 📦 MODELOS
const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Category = mongoose.model('Category', categorySchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Bank = mongoose.model('Bank', bankSchema);

// 🔐 MIDDLEWARE DE AUTENTICACIÓN
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_super_secreto');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// 🚀 RUTAS DE AUTENTICACIÓN

// Registro
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Verificar si el usuario existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();

    // Crear datos iniciales
    await createInitialData(user._id);

    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      user: { id: user._id, email: user.email, name: `${user.firstName} ${user.lastName}` }
    });

  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Crear token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'tu_secreto_super_secreto',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        currency: user.currency,
        language: user.language,
        theme: user.theme
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(400).json({ error: error.message });
  }
});

// Verificar token
app.get('/api/verify', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: `${req.user.firstName} ${req.user.lastName}`,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      currency: req.user.currency,
      language: req.user.language,
      theme: req.user.theme
    }
  });
});

// 🚀 RUTAS DE DATOS

// Obtener datos del usuario
app.get('/api/user/data', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [transactions, categories, subscriptions, banks] = await Promise.all([
      Transaction.find({ userId }).sort({ date: -1 }).limit(100),
      Category.find({ userId }),
      Subscription.find({ userId }),
      Bank.find({ userId })
    ]);

    res.json({
      transactions,
      categories,
      subscriptions,
      banks,
      settings: {
        currency: req.user.currency,
        language: req.user.language,
        theme: req.user.theme,
        savingsGoal: req.user.savingsGoal,
        emergencyFund: req.user.emergencyFund
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear transacción
app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const transaction = new Transaction({
      ...req.body,
      userId: req.userId,
      date: new Date(req.body.date)
    });

    await transaction.save();

    // Actualizar categoría si es gasto
    if (req.body.type === 'expense' && req.body.category) {
      await Category.updateOne(
        { userId: req.userId, name: req.body.category },
        { $inc: { spent: req.body.amount } }
      );
    }

    res.status(201).json(transaction);

  } catch (error) {
    console.error('❌ Error creando transacción:', error);
    res.status(400).json({ error: error.message });
  }
});

// Crear categoría
app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const category = new Category({
      ...req.body,
      userId: req.userId
    });

    await category.save();
    res.status(201).json(category);

  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    res.status(400).json({ error: error.message });
  }
});

// Crear suscripción
app.post('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const subscription = new Subscription({
      ...req.body,
      userId: req.userId
    });

    await subscription.save();
    res.status(201).json(subscription);

  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    res.status(400).json({ error: error.message });
  }
});

// Crear banco
app.post('/api/banks', authMiddleware, async (req, res) => {
  try {
    const bank = new Bank({
      ...req.body,
      userId: req.userId
    });

    await bank.save();
    res.status(201).json(bank);

  } catch (error) {
    console.error('❌ Error creando banco:', error);
    res.status(400).json({ error: error.message });
  }
});

// 🎯 RUTA PRINCIPAL - SERVIR LA APLICACIÓN
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 🛠️ FUNCIÓN PARA CREAR DATOS INICIALES
async function createInitialData(userId) {
  try {
    // Categorías iniciales
    const initialCategories = [
      { userId, name: 'Alimentación', budget: 500, spent: 0, color: '#3B82F6', icon: '🍽️' },
      { userId, name: 'Transporte', budget: 300, spent: 0, color: '#60A5FA', icon: '🚗' },
      { userId, name: 'Vivienda', budget: 1200, spent: 0, color: '#93C5FD', icon: '🏠' },
      { userId, name: 'Ocio', budget: 200, spent: 0, color: '#BFDBFE', icon: '🎬' },
      { userId, name: 'Salud', budget: 150, spent: 0, color: '#10B981', icon: '⚕️' },
      { userId, name: 'Educación', budget: 100, spent: 0, color: '#F59E0B', icon: '📚' }
    ];

    await Category.insertMany(initialCategories);

    // Banco inicial
    const initialBank = new Bank({
      userId,
      name: 'Banco Principal',
      type: 'checking',
      balance: 5000,
      accountNumber: '****1234',
      currency: 'USD',
      color: '#3B82F6',
      isActive: true
    });

    await initialBank.save();

    // Transacciones iniciales
    const initialTransactions = [
      {
        userId,
        type: 'income',
        amount: 5000,
        category: 'Salario',
        description: 'Salario Mensual',
        date: new Date(),
        location: 'Transferencia Bancaria',
        method: 'Transferencia',
        bankId: initialBank._id
      },
      {
        userId,
        type: 'expense',
        amount: 1200,
        category: 'Vivienda',
        description: 'Alquiler',
        date: new Date(),
        location: 'Pago Bancario',
        method: 'Débito Automático',
        bankId: initialBank._id
      }
    ];

    await Transaction.insertMany(initialTransactions);

    // Actualizar categoría de vivienda
    await Category.updateOne(
      { userId, name: 'Vivienda' },
      { $inc: { spent: 1200 } }
    );

    // Suscripción inicial
    const initialSubscription = new Subscription({
      userId,
      name: 'Netflix',
      price: 15.99,
      billingCycle: 'monthly',
      nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      active: true,
      icon: '🎬',
      color: '#E50914'
    });

    await initialSubscription.save();

    console.log('✅ Datos iniciales creados para usuario:', userId);

  } catch (error) {
    console.error('❌ Error creando datos iniciales:', error);
  }
}

// 🌐 SERVIDOR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SmartBank server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔑 API: http://localhost:${PORT}/api`);
});