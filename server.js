require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const config = require('./src/config');
const securityMiddlewares = require('./src/middlewares/security');
const saveScoreRouter = require('./src/routes/saveScore.route');
const getTopPlayersRouter = require('./src/routes/getTopPlayers.route');
const authRouter = require('./src/routes/auth.route');

const app = express();

// Trust cloudflare and nginx proxies
app.set('trust proxy', 2);

// Database initialization
require('./src/db');

// Middlewares
app.use(express.json());

// Security middlewares
securityMiddlewares.forEach(middleware => app.use(middleware));

// Middlewares continued
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/SnakeGame/saveScore', saveScoreRouter);
app.use('/SnakeGame/getTopPlayers', getTopPlayersRouter);
app.use('/SnakeGame', authRouter);

// Error handling
app.use(errorHandler);

// Server initialization
app.listen(config.port, () => {
	console.log(`Server running in ${process.env.NODE_ENV || 'development'}`);
	console.log(`Listening on port ${config.port}`);
});
