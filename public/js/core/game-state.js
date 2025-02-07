// Use the global version from main.js
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load modules dynamically with versioning
const { Config } = await importVersioned('../config.js');
const { FoodSystem } = await importVersioned('./food-system.js');

export class GameState {
	constructor() {
		this.canvas = document.getElementById('gameCanvas');
		this.ctx = this.canvas.getContext('2d');
		this.gridSize = Config.Game.GRID_SIZE;
		this.tileCount = Math.floor(this.canvas.width / this.gridSize);
		this.reset();
	}

	reset() {
		this.snake = [Config.Game.INITIAL_POS];
		this.direction = { x: 0, y: 0 };
		this.lastDirection = { x: 0, y: 0 };
		this.directionQueue = [];
		this.score = 0;
		this.level = 1;
		this.baseSpeed = Config.Game.BASE_SPEED;
		this.currentSpeed = Config.Game.BASE_SPEED;
		this.speedCounter = 0;
		this.food = FoodSystem.generate(this.tileCount, this.snake);
		this.effects = {
			combo: { active: false, remaining: 0 },
			glow: { active: false, endTime: 0 },
		};
		this.gameOver = false;
		this.modalShown = false;
	}
}
