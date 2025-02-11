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
			apple: 0.799, // ~79.9% (the rest)
			cherry: 0.15, // 15% (common)
			goldenApple: 0.01, // 1% (rare)
			hubrisBerry: 0.04, // 4% (rare)
			glitchBerry: 0.001, // 0.1% (extremely rare)
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
			glitchBerry: {
				points: 10,
				color: '#00FFFF', // Starting as cyan before going full RGB
				graphics: { shadowColor: '#9400D3', shadowBlur: 30 },
				effect: { type: 'rgbSnake', duration: 10000 }, // Effect lasts for 10 sec
				music: 'music/NyanCat_cut.mp3',
			},
		},
	},
	UI: {
		COLORS: { snake: '#0f0', background: '#000', text: '#fff', speedBoost: '#FFD700' },
		TEXT: { score: { x: 10, y: 20 } },
	},
};
