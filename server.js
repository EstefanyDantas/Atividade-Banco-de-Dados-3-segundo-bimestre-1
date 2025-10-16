// server.js

// Importações dos módulos
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// 1. Configuração do Express e Socket.IO
const app = express();
const server = http.createServer(app);
// Habilita o Socket.IO no servidor
const io = socketIo(server); 

// Porta do servidor
const PORT = 3000; 

// 2. CONEXÃO COM O BANCO DE DADOS (MongoDB)
// !!! SUBSTITUA SUA URL DE CONEXÃO AQUI !!!
const DB_URL = 'mongodb://localhost:27017/minhaRedeSocial'; 

mongoose.connect(DB_URL)
    .then(() => console.log('Conexão com o MongoDB estabelecida com sucesso!'))
    .catch(err => console.error('Erro de conexão com o MongoDB:', err));

// 3. MODELO MONGOOSE (Baseado no que você forneceu)
const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'O título é obrigatório.']
        },
        author: {
            type: String,
            default: 'Anônimo' // Define um valor padrão
        },
        message: {
            type: String,
            required: [true, 'A mensagem não pode estar vazia.']
        },
        createdAt: {
            type: Date,
            default: Date.now 
        }
    },
    { collection: 'posts' }
);
const Post = mongoose.model('Post', postSchema);


// 4. CONFIGURAÇÃO DE ROTAS (Para servir arquivos estáticos)
// Serve os arquivos HTML, CSS e JS que estão na mesma pasta
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial (se necessário, mas o static já faz isso)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// 5. LÓGICA DO SOCKET.IO (Comunicação em tempo real)
io.on('connection', (socket) => {
    console.log(`Novo usuário conectado: ${socket.id}`);

    // Carregar e enviar posts existentes para o novo usuário
    // Chamado assim que a página carrega no Frontend
    socket.on('getInitialPosts', async () => {
        try {
            // Busca todos os posts, ordenando do mais novo para o mais antigo
            const posts = await Post.find().sort({ createdAt: -1 });
            // Envia a lista para o cliente que acabou de se conectar
            socket.emit('loadPosts', posts.map(p => ({
                title: p.title,
                message: p.message,
                author: p.author,
                createdAt: p.createdAt.toLocaleString('pt-BR')
            })));
        } catch (error) {
            console.error('Erro ao buscar posts iniciais:', error);
        }
    });

    // RECEBE o novo post enviado do Frontend
    socket.on('newPost', async (postData) => {
        try {
            // Cria e salva o post no MongoDB
            const newPost = new Post(postData);
            await newPost.save();

            // Formata a data para exibir no Frontend
            const postToSend = {
                title: newPost.title,
                message: newPost.message,
                author: newPost.author,
                createdAt: newPost.createdAt.toLocaleString('pt-BR')
            };

            // Envia o novo post para TODOS os clientes conectados
            io.emit('postAdded', postToSend); 
        } catch (error) {
            console.error('Erro ao salvar o post:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
    });
});


// 6. INICIA O SERVIDOR
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});