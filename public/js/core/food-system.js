// Use the global version from main.js
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load config dynamically with versioning
const { Config } = await importVersioned('../config.js');

export class FoodSystem {
	static generate(tileCount, snake) {
		const isFirstFood = snake.length === 1;
		let type;

		if (isFirstFood) {
			do {
				type = this.randomType();
			} while (type === 'goldenApple' || type === 'hubrisBerry');
		} else {
			type = this.randomType();
		}

		return {
			type: type,
			position: this.randomPosition(tileCount, snake),
			spawnTime: Date.now(),
			...Config.Food.PROPERTIES[type],
		};
	}

	static randomType() {
		const rand = Math.random();
		let cumulative = 0;

		for (const [type, prob] of Object.entries(Config.Food.SPAWN_PROBABILITIES)) {
			cumulative += prob;
			if (rand <= cumulative) return type;
		}
		return 'apple';
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
