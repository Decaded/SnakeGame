const express = require('express');
const router = express.Router();
const db = require('../db');
const sanitizeHtml = require('sanitize-html');

const generateSimpleToken = () => {
	const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	return Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
};

router.post('/claimNick', async (req, res) => {
	try {
		const { nick } = req.body;
		const sanitizedNick = sanitizeHtml(nick);
		const scores = db.get('scores') || {};

		if (scores[sanitizedNick]) {
			return res.status(409).json({
				success: false,
				error: 'Nickname already claimed',
			});
		}

		const token = generateSimpleToken();
		scores[sanitizedNick] = { score: 0, token };
		db.set('scores', scores);

		res.json({
			success: true,
			token,
			warning: 'SAVE THIS TOKEN - IT WONT BE SHOWN AGAIN',
		});
	} catch (error) {
		console.error('Claim error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to claim nickname',
		});
	}
});

module.exports = router;
