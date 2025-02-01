require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting
const { body, validationResult } = require('express-validator'); // Input validation
const xss = require('xss-clean'); // Prevent XSS attacks
const sanitizeHtml = require('sanitize-html'); // Sanitize HTML input
const NyaDB = require('@decaded/nyadb');

const app = express();
const port = process.env.PORT;

// Initialize NyaDB
const nyadb = new NyaDB();
nyadb.create('scores'); // Create a database for scores (initializes as {})

// Security Middleware
app.use(helmet()); // Sets secure headers
app.use(xss()); // Prevents XSS attacks

// CORS Config
app.use(
	cors({
		origin: 'https://decaded.dev', // Allow requests from your website
		methods: ['GET', 'POST'], // Allow only necessary methods
		allowedHeaders: ['Content-Type'], // Explicitly allow necessary headers
		credentials: true, // Allow credentials (cookies, authorization headers, etc.)
	}),
);

// Rate Limiting (10 requests per minute per IP)
const apiLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // Limit each IP to 10 requests per window
	message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use(apiLimiter); // Apply globally

app.use(bodyParser.json());
app.use(express.static('public'));

// Save Score Endpoint (with Validation and Sanitization)
app.post(
	'/saveScore',
	[
		body('nick')
			.trim()
			.isLength({ min: 3, max: 16 })
			.matches(/^[a-zA-Z0-9_]+$/)
			.withMessage('Nick must be 3-16 characters and contain only letters, numbers, and underscores.'),
		body('score').isInt({ min: 0, max: 9999999 }).withMessage('Score must be an integer between 0 and 9999999.'),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: errors.array()[0].msg });
		}

		const nick = req.body.nick; // Already sanitized by express-validator
		const score = req.body.score;

		// Get existing scores (default to {} if no scores exist)
		const scores = nyadb.get('scores') || {};

		// Check if the player already exists
		if (scores[nick]) {
			if (score > scores[nick]) {
				scores[nick] = score; // Update score if it's higher
				res.json({ success: true, message: 'Score updated successfully' });
			} else {
				res.json({ success: false, message: 'You did not beat your previous score' });
			}
		} else {
			scores[nick] = score; // Add new player
			res.json({ success: true, message: 'Score saved successfully' });
		}

		// Save the updated scores
		nyadb.set('scores', scores);
	},
);

// Get Top 10 Players Endpoint (with Output Sanitization)
app.get('/getTopPlayers', (req, res) => {
	const scores = nyadb.get('scores') || {};

	// Convert scores object to an array of { nick, score } objects
	const scoresArray = Object.keys(scores).map(nick => ({
		nick: sanitizeHtml(nick), // Sanitize nick for output
		score: scores[nick],
	}));

	// Sort by score (descending) and get the top 10
	const topPlayers = scoresArray.sort((a, b) => b.score - a.score).slice(0, 10);

	res.json(topPlayers);
});

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
