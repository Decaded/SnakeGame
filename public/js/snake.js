// ======================
// Configuration
// ======================
const Config = {
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
			apple: 0.85,
			cherry: 0.1,
			goldenApple: 0.05,
		},
		PROPERTIES: {
			apple: {
				points: 1,
				color: '#ff0000',
			},
			cherry: {
				points: 1,
				color: '#ff69b4',
				effect: {
					type: 'combo',
					duration: 3,
					message: 'DOUBLE POINTS!',
				},
			},
			goldenApple: {
				points: 0,
				color: '#FFD700',
				effect: {
					type: 'doubleScore',
					duration: 2000,
					message: 'SCORE DOUBLED!',
				},
				graphics: {
					shadowColor: '#FFD700',
					shadowBlur: 20,
				},
			},
		},
	},
	UI: {
		COLORS: {
			snake: '#0f0',
			background: '#000',
			text: '#fff',
			speedBoost: '#FFD700',
		},
		TEXT: {
			score: { x: 10, y: 20 },
		},
	},
};

// ======================
// Core Game Structures
// ======================
class GameState {
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

class FoodSystem {
	static generate(tileCount, snake) {
		const type = this.randomType();
		return {
			type: type,
			position: this.randomPosition(tileCount, snake),
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

// ======================
// Main Game Engine
// ======================
class GameEngine {
	constructor() {
		this.state = new GameState();
		this.modules = [];
		this.initCoreModules();
	}

	initCoreModules() {
		this.addModule(new InputController());
		this.addModule(new CollisionSystem());
		this.addModule(new SpeedManager());
	}

	addModule(module) {
		this.modules.push(module);
		module.game = this;
		module.init?.(this.state);
	}

	start() {
		const gameLoop = () => {
			if (this.state.gameOver) return;

			this.update();
			this.render();

			this.state.gameLoopTimeout = setTimeout(gameLoop, this.state.currentSpeed);
		};
		gameLoop();
	}

	update() {
		this.modules.forEach(module => module.preUpdate?.(this.state));

		// Process movement queue before moving
		if (this.state.directionQueue.length > 0 && !(this.state.directionQueue[0].x === -this.state.direction.x && this.state.directionQueue[0].y === -this.state.direction.y)) {
			this.state.direction = this.state.directionQueue.shift();
		}

		// Apply movement
		const head = {
			x: this.state.snake[0].x + this.state.direction.x,
			y: this.state.snake[0].y + this.state.direction.y,
		};
		this.state.snake.unshift(head);

		// Food handling
		if (this.isFoodCollision(head)) {
			this.handleFoodConsumption();
			this.state.food = FoodSystem.generate(this.state.tileCount, this.state.snake);
		} else {
			this.state.snake.pop();
		}

		// Effects update
		this.updateEffects();

		this.modules.forEach(module => module.postUpdate?.(this.state));
	}

	isFoodCollision(head) {
		return head.x === this.state.food.position.x && head.y === this.state.food.position.y;
	}

	handleFoodConsumption() {
		if (this.state.food.type === 'cherry') {
			this.applyEffect(this.state.food.effect);

			this.state.score += this.state.food.points * this.state.level;
		} else if (this.state.food.type === 'apple') {
			let multiplier = 1;
			if (this.state.effects.combo.active) {
				multiplier = 2;
				// Decrement combo counter when apple is consumed.
				this.state.effects.combo.remaining--;
				if (this.state.effects.combo.remaining <= 0) {
					this.state.effects.combo.active = false;
					showToast('COMBO ENDED', false);
				}
			}
			this.state.score += this.state.food.points * this.state.level * multiplier;
		} else if (this.state.food.type === 'goldenApple') {
			this.applyEffect(this.state.food.effect);
		}
		this.state.speedCounter++;
	}

	applyEffect(effect) {
		switch (effect.type) {
			case 'combo':
				this.state.effects.combo = {
					active: true,
					remaining: effect.duration,
				};
				showToast(effect.message);
				break;
			case 'doubleScore':
				this.state.score *= 2;
				this.state.effects.glow = {
					active: true,
					endTime: Date.now() + effect.duration,
				};
				showToast(effect.message);
				break;
		}
	}

	updateEffects() {
		// Update glow effect
		if (this.state.effects.glow.active && Date.now() > this.state.effects.glow.endTime) {
			this.state.effects.glow.active = false;
		}
	}

	render() {
		this.clearCanvas();
		this.drawSnake();
		this.drawFood();
		this.drawUI();
	}

	clearCanvas() {
		this.state.ctx.fillStyle = Config.UI.COLORS.background;
		this.state.ctx.fillRect(0, 0, this.state.canvas.width, this.state.canvas.height);
	}

	drawSnake() {
		const ctx = this.state.ctx;
		const glow = this.state.effects.glow.active;

		if (glow) {
			ctx.fillStyle = '#FFD700';
			ctx.shadowColor = '#FFD700';
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = Config.UI.COLORS.snake;
		}

		this.state.snake.forEach(segment => {
			ctx.fillRect(segment.x * this.state.gridSize, segment.y * this.state.gridSize, this.state.gridSize, this.state.gridSize);
		});

		// Reset shadow properties
		ctx.shadowBlur = 0;
	}

	drawFood() {
		const { position, color, graphics } = this.state.food;
		this.state.ctx.fillStyle = color;

		if (graphics) {
			Object.entries(graphics).forEach(([key, value]) => {
				this.state.ctx[key] = value;
			});
		}

		this.state.ctx.beginPath();
		this.state.ctx.arc(
			position.x * this.state.gridSize + this.state.gridSize / 2,
			position.y * this.state.gridSize + this.state.gridSize / 2,
			this.state.gridSize / 2 - 1,
			0,
			Math.PI * 2,
		);
		this.state.ctx.fill();
		this.state.ctx.shadowBlur = 0;
	}

	drawUI() {
		// Score
		this.state.ctx.fillStyle = Config.UI.COLORS.text;
		this.state.ctx.fillText(`Score: ${this.state.score}`, Config.UI.TEXT.score.x, Config.UI.TEXT.score.y);
	}

	reset() {
		clearTimeout(this.state.gameLoopTimeout);
		this.state.reset();
		this.updateLevelDisplay();
		this.start();
	}

	updateLevelDisplay() {
		const levelBar = document.getElementById('levelBar');
		const levelText = document.getElementById('levelText');
		if (!levelBar || !levelText) return;

		levelBar.style.width = '0%';
		levelText.textContent = 'Level 1';
	}
}

// ======================
// Game Modules
// ======================
class InputController {
	init(state) {
		this.state = state;
		this.pressedKeys = new Set(); // Track pressed keys
		document.addEventListener('keydown', this.handleInput.bind(this));
		document.addEventListener('keyup', this.handleKeyRelease.bind(this));
	}

	handleInput(e) {
		// Prevent handling keys when typing in inputs
		if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
			return;
		}

		const directions = {
			ArrowUp: { x: 0, y: -1 },
			ArrowDown: { x: 0, y: 1 },
			ArrowLeft: { x: -1, y: 0 },
			ArrowRight: { x: 1, y: 0 },
		};

		// Ignore if key is already pressed
		if (this.pressedKeys.has(e.key)) {
			return;
		}

		const newDir = directions[e.key];
		if (newDir && !this.isOpposite(newDir)) {
			this.state.directionQueue.push(newDir);
			this.pressedKeys.add(e.key); // Mark key as processed
		}
	}

	handleKeyRelease(e) {
		this.pressedKeys.delete(e.key); // Allow re-pressing the key
	}

	isOpposite(newDir) {
		const current = this.state.lastDirection;
		return current.x === -newDir.x && current.y === -newDir.y;
	}

	preUpdate(state) {
		if (state.directionQueue.length === 0) return;

		const validDir = state.directionQueue.find(dir => !this.isOpposite(dir));
		if (!validDir) return;

		state.direction = validDir;
		state.lastDirection = validDir;
		state.directionQueue = [];
	}
}

class CollisionSystem {
	init(state) {
		this.state = state;
	}

	postUpdate(state) {
		const head = state.snake[0];

		if (this.isWallCollision(head) || this.isSelfCollision(head)) {
			this.endGame(state);
		}
	}

	isWallCollision(head) {
		return head.x < 0 || head.x >= this.state.tileCount || head.y < 0 || head.y >= this.state.tileCount;
	}

	isSelfCollision(head) {
		return this.state.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
	}

	endGame(state) {
		if (state.modalShown) return;
		state.modalShown = true;
		state.gameOver = true;
		showGameOverModal();
	}
}

class SpeedManager {
	init(state) {
		this.state = state;
	}

	postUpdate(state) {
		// Calculate current speed
		state.currentSpeed = Math.max(Config.Game.MIN_SPEED, state.baseSpeed - state.level * Config.Game.LEVELS.SPEED_STEP);

		// Level progression
		if (state.speedCounter >= Config.Game.SPEED_INTERVAL) {
			state.baseSpeed = Math.max(Config.Game.MIN_SPEED, state.baseSpeed - Config.Game.LEVELS.SPEED_STEP);
			state.level = Math.min(Config.Game.LEVELS.MAX, state.level + 1);
			state.speedCounter = 0;
			this.updateLevelUI(state);
		}
	}

	updateLevelUI(state) {
		const levelBar = document.getElementById('levelBar');
		const levelText = document.getElementById('levelText');
		if (!levelBar || !levelText) return;

		const progress = (Config.Game.BASE_SPEED - state.baseSpeed) / (Config.Game.BASE_SPEED - Config.Game.MIN_SPEED);
		levelBar.style.width = `${Math.min(progress * 100, 100)}%`;
		levelText.textContent = `Level ${state.level}`;
	}
}

// ======================
// Leaderboard Manager
// ======================
class LeaderboardManager {
	constructor() {
		this.API_BASE = 'https://api.decaded.dev/SnakeGame';
		this.topPlayersList = document.getElementById('topPlayers');
		this.fetchInterval = null;
	}

	init() {
		this.setupAutoRefresh();
	}

	setupAutoRefresh() {
		this.fetchTopPlayers();
		this.fetchInterval = setInterval(() => this.fetchTopPlayers(), 30000);
	}

	async fetchTopPlayers() {
		try {
			const response = await fetch(`${this.API_BASE}/getTopPlayers`, {
				credentials: 'include',
			});
			const data = await response.json();
			this.updateDisplay(data);
		} catch (error) {
			console.error('Leaderboard fetch failed:', error);
		}
	}

	updateDisplay(players) {
		this.topPlayersList.innerHTML = players.map(player => `<li>${player.nick}: ${player.score}</li>`).join('');
	}

	async saveScore(nickname, score) {
		try {
			const response = await fetch(`${this.API_BASE}/saveScore`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick: nickname, score }),
				credentials: 'include',
			});
			return await response.json();
		} catch (error) {
			return { success: false, message: 'Failed to save score' };
		}
	}

	destroy() {
		clearInterval(this.fetchInterval);
	}
}

// ======================
// UI Manager
// ======================
class UIManager {
	constructor(game) {
		this.game = game;
		this.elements = {
			gameOverModal: document.getElementById('gameOverModal'),
			nicknameInput: document.getElementById('nicknameInput'),
			submitButton: document.getElementById('submitScoreButton'),
			comboCounter: document.getElementById('comboCounter'),
			levelBar: document.getElementById('levelBar'),
			levelText: document.getElementById('levelText'),
		};
	}

	init(state) {
		this.state = state;
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Score submission
		this.elements.submitButton.addEventListener('click', () => this.handleScoreSubmission());
		this.elements.nicknameInput.addEventListener('keydown', e => {
			if (e.key === 'Enter') this.handleScoreSubmission();
		});

		// Mobile controls
		document.querySelectorAll('.control-btn').forEach(btn => {
			btn.addEventListener('touchstart', e => {
				e.preventDefault();
				const direction = btn.id.replace('Btn', '');
				this.handleMobileInput(direction);
			});
		});
	}

	handleMobileInput(direction) {
		const directions = {
			up: { x: 0, y: -1 },
			down: { x: 0, y: 1 },
			left: { x: -1, y: 0 },
			right: { x: 1, y: 0 },
		};

		if (directions[direction]) {
			const event = new KeyboardEvent('keydown', { key: `Arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}` });
			document.dispatchEvent(event);
		}
	}

	async handleScoreSubmission() {
		const nickname = this.elements.nicknameInput.value.trim();

		if (!nickname) {
			showToast('No nickname entered', false);
			this.toggleModal(false);
			this.game.reset();
			return;
		}

		const result = await leaderboard.saveScore(nickname, this.game.state.score);
		showToast(result.message, result.success);

		this.toggleModal(false);
		this.game.reset();
	}

	toggleModal(show = true) {
		this.elements.gameOverModal.style.display = show ? 'block' : 'none';
		if (show) {
			this.elements.nicknameInput.focus();
		}
	}

	toggleModal(show = true) {
		this.elements.gameOverModal.style.display = show ? 'block' : 'none';
		if (show) {
			this.elements.nicknameInput.focus();
		} else {
			this.game.reset(); // Reset game state when modal is closed
		}
	}

	updateComboDisplay() {
		const container = document.getElementById('messageContainer');

		// Clear previous status messages
		const existingStatus = container.querySelectorAll('.status-message');
		existingStatus.forEach(el => el.remove());

		// Add persistent status messages
		const { combo, glow } = this.state.effects;

		if (combo.active) {
			const message = document.createElement('div');
			message.className = 'game-message status-message';
			message.textContent = `COMBO x2 (${combo.remaining} left)`;
			container.appendChild(message);
		}

		if (glow.active) {
			const remaining = Math.ceil((glow.endTime - Date.now()) / 1000);
			const message = document.createElement('div');
			message.className = 'game-message status-message';
			message.textContent = `GOLDEN GLOW: ${remaining}s`;
			container.appendChild(message);
		}
	}

	updateLevelDisplay() {
		const progress = (Config.Game.BASE_SPEED - this.state.baseSpeed) / (Config.Game.BASE_SPEED - Config.Game.MIN_SPEED);
		this.elements.levelBar.style.width = `${Math.min(progress * 100, 100)}%`;
		this.elements.levelText.textContent = this.state.baseSpeed === Config.Game.MIN_SPEED ? 'MAX LEVEL!' : `Level ${this.state.level}`;
	}

	postUpdate() {
		this.updateComboDisplay();
		this.updateLevelDisplay();
	}

	postDraw() {
		if (this.state.gameOver && !this.state.modalShown) {
			this.state.modalShown = true;
			this.toggleModal(true);
		}
	}
}

function showGameOverModal() {
	ui.toggleModal(true);
}

// ======================
// Initialization
// ======================
const game = new GameEngine();
const leaderboard = new LeaderboardManager();
const ui = new UIManager(game);

leaderboard.init();

game.addModule(ui);
game.start();

window.addEventListener('beforeunload', () => {
	leaderboard.destroy();
});
