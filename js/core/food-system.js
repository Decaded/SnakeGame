// Use the global version from main.js
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load config dynamically with versioning
const { Config } = await importVersioned('../config.js');

export class FoodSystem {
	static generate(tileCount, snake, level) {
		const isFirstFood = snake.length === 1;
		let primaryFood,
			hubrisFood = null;

		// Ensure the first food isn't hubris or goldenApple
		do {
			primaryFood = FoodSystem.randomType();
		} while (isFirstFood && (primaryFood === 'goldenApple' || primaryFood === 'hubrisBerry'));

		// Roll for Hubris Berry, but ONLY if another food was selected first AND level is 5 or above
		const shouldSpawnHubris = level >= 5 && Math.random() < Config.Food.SPAWN_PROBABILITIES.hubrisBerry;
		if (shouldSpawnHubris) {
			hubrisFood = 'hubrisBerry';
		}

		// Always spawn the main food
		const foodItems = [
			{
				type: primaryFood,
				position: FoodSystem.randomPosition(tileCount, snake),
				spawnTime: Date.now(),
				...Config.Food.PROPERTIES[primaryFood],
			},
		];

		// If Hubris Berry should spawn, add it as a second food
		if (hubrisFood) {
			foodItems.push({
				type: hubrisFood,
				position: FoodSystem.randomPosition(tileCount, snake),
				spawnTime: Date.now(),
				...Config.Food.PROPERTIES[hubrisFood],
			});
		}

		return foodItems;
	}

	static randomType() {
		const rand = Math.random();
		let cumulative = 0;

		for (const [type, prob] of Object.entries(Config.Food.SPAWN_PROBABILITIES)) {
			if (type === 'hubrisBerry') continue; // Hubris Berry is handled separately
			cumulative += prob;
			if (rand <= cumulative) return type;
		}
		return 'apple'; // Fallback
	}

	static randomPosition(tileCount, snake) {
		let position;
		do {
			position = {
				x: Math.floor(Math.random() * tileCount),
				y: Math.floor(Math.random() * tileCount),
			};
		} while (snake.some(segment => segment.x === position.x && segment.y === position.y));

		return position;
	}
}
