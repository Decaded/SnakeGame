import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import xss from 'xss-clean';
import sanitizeHtml from 'sanitize-html';
import NyaDB from '@decaded/nyadb';
import morgan from 'morgan';
import Filter from 'bad-words';

const app = express();

// Configuration variables
const PORT = process.env.PORT;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://decaded.dev';

// Setup profanity filter
const profanityFilter = new Filter();

// Rate limiting setup
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // max 100 requests per window per IP
	standardHeaders: true,
	legacyHeaders: false,
});

// Database initialization
const db = new NyaDB();
db.create('scores');

// Middleware setup
app.set('trust proxy', 1);
app.use(helmet());
app.use(xss());
app.use(limiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Validation middleware helper
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

// Custom middleware to verify the origin for non-GET requests
function verifyOrigin(req, res, next) {
	// Allow GET requests without an origin check.
	if (req.method === 'GET') return next();

	// For non-GET requests, ensure the Origin header matches our allowed domain.
	if (req.headers.origin && req.headers.origin === ALLOWED_ORIGIN) {
		return next();
	}
	return res.status(403).json({
		success: false,
		message: 'Forbidden: Invalid origin',
	});
}

// CORS configuration for POST routes (only allow the allowed domain)
const corsOptionsForPost = {
	origin: (origin, callback) => {
		if (origin === ALLOWED_ORIGIN) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	methods: ['POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type'],
	credentials: true,
};

// CORS configuration for GET routes (allow any origin)
const corsOptionsForGet = {
	origin: '*',
	methods: ['GET', 'OPTIONS'],
};

// --------------------
// Routes
// --------------------

// POST /saveScore – Only accept if the request comes from ALLOWED_ORIGIN
app.post(
	'/saveScore',
	verifyOrigin,
	cors(corsOptionsForPost),
	validateRequest([
		body('nick')
			.trim()
			.isLength({ min: 3, max: 16 })
			.matches(/^[\p{L}\p{N}_-]+$/u)
			.withMessage('Nickname must be 3-16 characters and may include letters, numbers, underscores, and hyphens'),
		body('score').isInt({ min: 0, max: 9_999_999 }).withMessage('Invalid score value'),
	]),
	async (req, res) => {
		try {
			const { nick, score } = req.body;
			const sanitizedNick = sanitizeHtml(nick);

			// Check for profanity in the sanitized nickname
			if (profanityFilter.isProfane(sanitizedNick)) {
				return res.status(422).json({
					success: false,
					message: 'Nickname contains inappropriate language',
				});
			}

			const scores = db.get('scores') || {};
			const currentScore = scores[sanitizedNick] || 0;

			if (score > currentScore) {
				scores[sanitizedNick] = score;
				db.set('scores', scores);
				return res.json({
					success: true,
					message: 'Score saved successfully',
					newHighScore: true,
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

// GET /getTopPlayers – Open to any origin
app.get('/getTopPlayers', cors(corsOptionsForGet), (req, res) => {
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

// Catch-all for undefined routes (404)
app.use((req, res) => {
	res.status(404).json({
		success: false,
		message: 'Not Found',
	});
});

// Global error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		success: false,
		message: 'An unexpected error occurred',
	});
});

// Start the server
if (process.argv[1] === new URL(import.meta.url).pathname) {
	app.listen(PORT, () => {
		console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
	});
}

export default app;
