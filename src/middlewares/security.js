const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Cloudflare IP ranges (https://www.cloudflare.com/ips/)
const CLOUDFLARE_IPS = [
	'173.245.48.0/20',
	'103.21.244.0/22',
	'103.22.200.0/22',
	'103.31.4.0/22',
	'141.101.64.0/18',
	'108.162.192.0/18',
	'190.93.240.0/20',
	'188.114.96.0/20',
	'197.234.240.0/22',
	'198.41.128.0/17',
	'162.158.0.0/15',
	'104.16.0.0/13',
	'104.24.0.0/14',
	'172.64.0.0/13',
	'131.0.72.0/22',
	'2400:cb00::/32',
	'2606:4700::/32',
	'2803:f800::/32',
	'2405:b500::/32',
	'2405:8100::/32',
	'2a06:98c0::/29',
	'2c0f:f248::/32',
];

// Strict security configuration
module.exports = [
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'none'"],
				scriptSrc: ["'self'", 'https://decaded.dev'],
				styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles if needed
				imgSrc: ["'self'", 'data:'],
				connectSrc: ["'self'", 'https://api.decaded.dev'],
				fontSrc: ["'self'"],
				frameSrc: ["'none'"],
				formAction: ["'none'"],
			},
		},
	}),
	cors({
		origin: 'https://decaded.dev',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type'],
		exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
	}),
	rateLimit({
		...config.rateLimit,
		validate: { trustProxy: true }, // Trust X-Forwarded-For
		skip: req => CLOUDFLARE_IPS.some(ip => req.ip.startsWith(ip)), // Skip CF IPs
	}),
];
