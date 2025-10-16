require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ====== Model simples ======
const Post = require('./models/post');

// ====== Inicializações ======
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ====== Middlewares ======
app.use(express.static('public'));

// ====== Conexão MongoDB Atlas ======
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err.message));

// ====== Rota principal ======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== WebSockets ======
io.on('connection', async (socket) => {
  console.log(`🟢 Cliente conectado: ${socket.id}`);

  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100);
    socket.emit('previousMessage', posts);
  } catch (err) {
    console.error('Erro ao buscar posts:', err);
  }

  socket.on('sendMessage', async (data) => {
    if (!data?.author || !data?.message) return;

    try {
      const newPost = await Post.create({
        author: data.author,
        title: data.title || '',
        message: data.message
      });

      io.emit('receivedMessage', newPost);
    } catch (err) {
      console.error('Erro ao salvar post:', err);
    }
  });

  socket.on('deleteMessage', async (postId) => {
    try {
      await Post.findByIdAndDelete(postId);
      io.emit('removedMessage', postId);
    } catch (err) {
      console.error('Erro ao deletar post:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
  });
});

// ====== Iniciar servidor ======
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
