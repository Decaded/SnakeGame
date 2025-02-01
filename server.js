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

const app = express();
const port = process.env.PORT;

// Initialize NyaDB
const nyadb = new NyaDB();
nyadb.create('scores');

// Security Middleware
app.use(helmet());
app.use(xss());

// CORS Config
app.use(
	cors({
		origin: 'https://decaded.dev',
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type'],
		credentials: true,
	}),
);

// Rate Limiting (10 requests per minute per IP)
const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use(apiLimiter);
app.use(bodyParser.json());
app.use(express.static('public'));

// Save Score Endpoint
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

		const nick = req.body.nick;
		const score = req.body.score;

		const scores = nyadb.get('scores') || {};

		if (scores[nick]) {
			if (score > scores[nick]) {
				scores[nick] = score;
				res.json({ success: true, message: 'Score updated successfully' });
			} else {
				res.json({ success: false, message: 'You did not beat your previous score' });
			}
		} else {
			scores[nick] = score;
			res.json({ success: true, message: 'Score saved successfully' });
		}

		nyadb.set('scores', scores);
	},
);

// Get Top 10 Players Endpoint
app.get('/getTopPlayers', (req, res) => {
	const scores = nyadb.get('scores') || {};

	const scoresArray = Object.keys(scores).map(nick => ({
		nick: sanitizeHtml(nick),
		score: scores[nick],
	}));

	const topPlayers = scoresArray.sort((a, b) => b.score - a.score).slice(0, 10);

	res.json(topPlayers);
});

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
