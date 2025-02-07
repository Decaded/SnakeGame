require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss-clean');
const sanitizeHtml = require('sanitize-html');
const NyaDB = require('@decaded/nyadb');
const morgan = require('morgan');

const app = express();

const PORT = process.env.PORT;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://decaded.dev';

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
	// For non-GET, ensure the Origin header matches our allowed domain.
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
	origin: function (origin, callback) {
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

// We'll be using a profanity filter in our /saveScore route.
// Since bad-words is an ES module, we’ll load it dynamically and store it globally.
global.profanityFilter = null;

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

			// Ensure that our profanity filter has been initialized.
			if (!global.profanityFilter) {
				return res.status(500).json({
					success: false,
					message: 'Profanity filter not initialized',
				});
			}

			if (global.profanityFilter.isProfane(sanitizedNick)) {
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

// Dynamically import the ES module "bad-words" and initialize our profanity filter.
// Once it's ready, start the server.
import('bad-words')
	.then(module => {
		const Filter = module.default;
		global.profanityFilter = new Filter();
		global.profanityFilter.addWords('hitler', 'cojones');

		app.listen(PORT, () => {
			console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
		});
	})
	.catch(error => {
		console.error('Error importing bad-words module:', error);
		process.exit(1);
	});
