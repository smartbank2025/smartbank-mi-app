const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const MONGO_URI = 'Pega aquí tu cadena de MongoDB';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Esquema de usuario
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Rutas
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone
    });
    
    await user.save();
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ userId: user._id }, 'tu_secreto_secreto', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: `${user.firstName} ${user.lastName}` } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});