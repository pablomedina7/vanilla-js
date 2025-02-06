const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');


const app = express();
const PORT = 3000;

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/gestor-enlaces', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conectado a la base de datos MongoDB');
});

// Definir el esquema y modelo de enlaces
const enlaceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  tags: { type: [String], default: [] },
  votes: { type: Number, default: 0 },
  comments: { type: [String], default: [] },
});

const Enlace = mongoose.model('Enlace', enlaceSchema);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rutas de la API

// Obtener todos los enlaces
app.get('/links', async (req, res) => {
  try {
    const links = await Enlace.find();
    res.json(links);
  } catch (error) {
    console.error('Error al obtener los enlaces:', error);
    res.status(500).json({ error: 'Error al obtener los enlaces' });
  }
});


// Obtener un enlace por su ID
app.get('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const link = await Enlace.findById(id);
    if (!link) return res.status(404).json({ error: 'Enlace no encontrado' });
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el enlace' });
  }
});


// Crear un nuevo enlace
app.post('/links', async (req, res) => {
  try {
    const { title, url, tags } = req.body;
    if (!title || !url) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (title, url)' });
    }
    const newLink = new Enlace({ title, url, tags });
    await newLink.save();
    res.json(newLink);
  } catch (error) {
    console.error('Error al agregar el enlace:', error);
    res.status(500).json({ error: 'Error al agregar el enlace' });
  }
});

// Votar un enlace
app.post('/links/:id/votes', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    const link = await Enlace.findById(id);
    if (!link) return res.status(404).json({ error: 'Enlace no encontrado' });
    link.votes += value || 0;
    await link.save();
    res.json(link);
  } catch (error) {
    console.error('Error al votar el enlace:', error);
    res.status(500).json({ error: 'Error al votar el enlace' });
  }
});


// Eliminar un comentario
app.delete('/links/:id/comments/:index', async (req, res) => {
  try {
    const { id, index } = req.params;

    // Validar formato de ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const link = await Enlace.findById(id);
    if (!link) return res.status(404).json({ error: 'Enlace no encontrado' });

    // Validar que el índice sea válido
    const commentIndex = parseInt(index, 10);
    if (isNaN(commentIndex) || commentIndex < 0 || commentIndex >= link.comments.length) {
      return res.status(400).json({ error: 'Índice de comentario inválido' });
    }

    // Eliminar el comentario
    link.comments.splice(commentIndex, 1);
    await link.save();

    res.json(link);
  } catch (error) {
    console.error('Error al eliminar el comentario:', error);
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
});
// Agregar un comentario a un enlace
app.post('/links/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const link = await Enlace.findById(id);
    if (!link) return res.status(404).json({ error: 'Enlace no encontrado' });

    link.comments.push(comment);
    await link.save();
    
    res.json(link);
  } catch (error) {
    console.error('Error al agregar el comentario:', error);
    res.status(500).json({ error: 'Error al agregar el comentario' });
  }
});


// Ruta GET /links/:id
app.get('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar formato de ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const link = await Enlace.findById(id);
    if (!link) return res.status(404).json({ error: 'Enlace no encontrado' });
    
    res.json({
      _id: link._id,
      title: link.title,
      url: link.url,
      tags: link.tags,
      votes: link.votes,
      comments: link.comments
    });
    
  } catch (error) {
    console.error('📌 Error en backend:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Rutas para servir los archivos estáticos de los frameworks
app.use('/vanilla', express.static(path.join(__dirname, '../vanilla-js')));
app.use('/vue', express.static(path.join(__dirname, '../vue-project/dist')));
app.get('/vue/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../vue-project/dist/index.html'));
});

//react
app.use('/react', express.static(path.join(__dirname, '../react-links/dist')));
app.get('/react/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../react-links/dist/index.html'));
});

//alpine
app.use('/alpine', express.static(path.join(__dirname, '../alpine'))); 
// Svelte
app.use('/svelte', express.static(path.join(__dirname, '../svelte-project/public')));
app.get('/svelte/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../svelte-project/public/index.html'));
});
// En server.js
app.use(cors({
  origin: ['http://localhost:5173'], // Puerto de Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`- Vanilla JS disponible en: http://localhost:${PORT}/vanilla`);
  console.log(`- Vue disponible en: http://localhost:${PORT}/vue`);
  console.log(`- React disponible en: http://localhost:${PORT}/react`);
  console.log(`- Alpine disponible en: http://localhost:3000/alpine`);  // ✅ Agregado
});
