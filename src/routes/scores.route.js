const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const db = require('../db');
const { validateScore } = require('../middlewares/validation');

router.post('/saveScore', validateScore, async (req, res) => {
	try {
		const { nick, score } = req.body;
		const sanitizedNick = sanitizeHtml(nick);
		const scoresCollection = db.get('scores') || {};

		const currentScore = scoresCollection[sanitizedNick] || 0;

		if (score > currentScore) {
			scoresCollection[sanitizedNick] = score;
			db.set('scores', scoresCollection);
		}

		res.json({
			success: true,
			message: 'Score processed successfully',
			currentScore: Math.max(currentScore, score),
			newHighScore: score > currentScore,
		});
	} catch (error) {
		console.error('Database error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
});

router.get('/getTopPlayers', (req, res) => {
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

module.exports = router;
