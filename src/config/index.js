module.exports = {
	port: process.env.PORT,
	cors: {
		origin: process.env.CORS_ORIGIN?.split(','),
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type'],
		credentials: true,
	},
	rateLimit: {
		windowMs: 15 * 60 * 1000,
		max: 100,
		standardHeaders: true,
		legacyHeaders: false,
	},
};
