const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Initialize all middlewares explicitly
const helmetMiddleware = helmet();
const corsMiddleware = cors(config.cors);
const limiterMiddleware = rateLimit(config.rateLimit);

const securityMiddlewares = [helmetMiddleware, corsMiddleware, limiterMiddleware];

module.exports = securityMiddlewares;
