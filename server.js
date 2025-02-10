require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const config = require('./src/config');
const securityMiddlewares = require('./src/middlewares/security');
const errorHandler = require('./src/middlewares/errorHandler');
const scoresRouter = require('./src/routes/scores.route');

const app = express();

// Database initialization
require('./src/db');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Security middlewares
securityMiddlewares.forEach(middleware => app.use(middleware));

// Routes
app.use('/api', scoresRouter);

// Error handling
app.use(errorHandler);

// Server initialization
app.listen(config.port, () => {
	console.log(`Server running in ${process.env.NODE_ENV || 'development'}`);
	console.log(`Listening on port ${config.port}`);
});
