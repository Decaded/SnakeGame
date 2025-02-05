require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss-clean');
const sanitizeHtml = require('sanitize-html');
const NyaDB = require('@decaded/nyadb');
const morgan = require('morgan');

// Initialize Express
const app = express();

// Configuration
const config = {
	port: process.env.PORT,
	cors: {
		origin: process.env.CORS_ORIGIN || 'https://decaded.dev',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type'],
		credentials: true,
	},
	rateLimit: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // Limit each IP to 100 requests per windowMs
		standardHeaders: true,
		legacyHeaders: false,
	},
};

// Database Setup
const initializeDatabase = () => {
	const nyadb = new NyaDB();
	nyadb.create('scores');
	return nyadb;
};

const db = initializeDatabase();

// Security Middleware
app.use(helmet());
app.use(xss());
app.use(cors(config.cors));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const apiLimiter = rateLimit(config.rateLimit);
app.use('/', apiLimiter);

// Validation Middleware
const validateRequest = validations => [
	validations,
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		next();
	},
];

// API Routes
app.post(
	'/saveScore',
	validateRequest([
		body('nick')
			.trim()
			.isLength({ min: 3, max: 16 })
			.matches(/^[\w-]+$/)
			.withMessage('Nickname must be 3-16 alphanumeric characters'),
		body('score').isInt({ min: 0, max: 9_999_999 }).withMessage('Invalid score value'),
	]),
	async (req, res) => {
		try {
			const { nick, score } = req.body;
			const sanitizedNick = sanitizeHtml(nick);

			const scores = db.get('scores') || {};
			const currentScore = scores[sanitizedNick] || 0;

			if (score > currentScore) {
				scores[sanitizedNick] = score;
				db.set('scores', scores);
				return res.json({
					success: true,
					message: 'Score saved successfully',
					newHighScore: score > currentScore,
				});
			}

			res.json({
				success: true,
				message: 'Existing score remains valid',
				currentScore,
			});
		} catch (error) {
			console.error('Database error:', error);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
			});
		}
	},
);

app.get('/getTopPlayers', (req, res) => {
	try {
		const scores = db.get('scores') || {};
		const topPlayers = Object.entries(scores)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([nick, score]) => ({
				nick: sanitizeHtml(nick),
				score,
			}));

		res.json(topPlayers);
	} catch (error) {
		console.error('Database error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to retrieve leaderboard',
		});
	}
});

// Error Handling
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		success: false,
		message: 'An unexpected error occurred',
	});
});

// Server Initialization
const startServer = () => {
	app.listen(config.port, () => {
		console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
		console.log(`Listening on port ${config.port}`);
	});
};

// Start the server
if (require.main === module) {
	startServer();
}

module.exports = app;
