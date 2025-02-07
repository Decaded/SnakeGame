export const Config = {
	Game: {
		GRID_SIZE: 20,
		INITIAL_POS: { x: 10, y: 10 },
		BASE_SPEED: 150,
		MIN_SPEED: 70,
		SPEED_INTERVAL: 5,
		LEVELS: {
			MAX: 8,
			SPEED_STEP: 10,
		},
	},
	Food: {
		SPAWN_PROBABILITIES: {
			apple: 0.7,
			cherry: 0.1,
			goldenApple: 0.05,
			hubrisBerry: 0.15,
		},
		PROPERTIES: {
			apple: {
				points: 1,
				color: '#ff0000',
				graphics: { shadowColor: '#ff0000', shadowBlur: 10 },
			},
			cherry: {
				points: 1,
				color: '#ff69b4',
				graphics: { shadowColor: '#ff69b4', shadowBlur: 15 },
				effect: { type: 'combo', duration: 3, message: 'DOUBLE POINTS!' },
			},
			goldenApple: {
				points: 0,
				color: '#FFD700',
				graphics: { shadowColor: '#FFD700', shadowBlur: 20 },
				effect: { type: 'glow', duration: 2000, message: 'GOLDEN GLOW!' },
			},
			hubrisBerry: {
				points: 5, // Base value before multiplier
				color: '#4B0082', // Initial indigo
				graphics: {
					shadowColor: '#4B0082',
					shadowBlur: 15,
				},
				decayRate: 0.5, // Multiplier lost per second
			},
		},
	},
	UI: {
		COLORS: { snake: '#0f0', background: '#000', text: '#fff', speedBoost: '#FFD700' },
		TEXT: { score: { x: 10, y: 20 } },
	},
};
