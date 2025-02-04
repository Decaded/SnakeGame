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
			apple: 0.7,
			cherry: 0.2,
			goldenApple: 0.1,
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
		this.food = FoodSystem.generate(this.tileCount);
		this.effects = {
			combo: { active: false, remaining: 0 },
			glow: { active: false, endTime: 0 },
		};
		this.gameOver = false;
		this.modalShown = false;
	}
}

class FoodSystem {
	static generate(tileCount) {
		const type = this.randomType();
		return {
			type: type,
			position: this.randomPosition(tileCount),
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

	static randomPosition(tileCount) {
		return {
			x: Math.floor(Math.random() * tileCount),
			y: Math.floor(Math.random() * tileCount),
		};
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

		// Snake movement
		const head = {
			x: this.state.snake[0].x + this.state.direction.x,
			y: this.state.snake[0].y + this.state.direction.y,
		};
		this.state.snake.unshift(head);

		// Food handling
		if (this.isFoodCollision(head)) {
			this.handleFoodConsumption();
			this.state.food = FoodSystem.generate(this.state.tileCount);
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
				break;
			case 'doubleScore':
				this.state.score *= 2;
				this.state.effects.glow = {
					active: true,
					endTime: Date.now() + effect.duration,
				};
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
		document.addEventListener('keydown', this.handleInput.bind(this));
	}

	handleInput(e) {
		const directions = {
			ArrowUp: { x: 0, y: -1 },
			ArrowDown: { x: 0, y: 1 },
			ArrowLeft: { x: -1, y: 0 },
			ArrowRight: { x: 1, y: 0 },
		};

		const newDir = directions[e.key];
		if (newDir && !this.isOpposite(newDir)) {
			this.state.directionQueue.push(newDir);
		}
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
		this.config = {
			API_BASE: 'https://api.decaded.dev/SnakeGame',
			REFRESH_INTERVAL: 30000,
			MAX_RETRIES: 3,
		};
		this.topPlayersList = document.getElementById('topPlayers');
		this.fetchInterval = null;
		this.isAvailable = true;
		this.cachedData = [];
	}

	init(state) {
		this.state = state;
		this.checkAvailability().then(() => {
			this.setupAutoRefresh();
		});
	}

	async checkAvailability() {
		try {
			const response = await fetch(this.config.API_BASE, { method: 'HEAD' });
			this.isAvailable = response.ok;
		} catch (error) {
			this.isAvailable = false;
			console.warn('Leaderboard unavailable, using offline mode');
		}
	}

	setupAutoRefresh() {
		if (!this.isAvailable) return;
		this.fetchTopPlayers().finally(() => {
			this.fetchInterval = setInterval(() => this.fetchTopPlayers(), this.config.REFRESH_INTERVAL);
		});
	}

	async fetchTopPlayers(retryCount = 0) {
		if (!this.isAvailable) return;

		try {
			const response = await fetch(`${this.config.API_BASE}/getTopPlayers`, {
				credentials: 'include',
			});

			if (!response.ok) throw new Error('Bad response');

			const data = await response.json();
			this.cachedData = data;
			this.updateDisplay(data);
		} catch (error) {
			console.error('Leaderboard fetch failed:', error);
			if (retryCount < this.config.MAX_RETRIES) {
				setTimeout(() => this.fetchTopPlayers(retryCount + 1), 2000);
			} else {
				this.showCachedData();
				showToast('Leaderboard unavailable - showing cached results', false);
			}
		}
	}

	showCachedData() {
		if (this.cachedData.length > 0) {
			this.updateDisplay(this.cachedData);
			showToast('Showing cached leaderboard data', false);
		}
	}

	async saveScore(nickname, score) {
		if (!this.isAvailable) {
			return {
				success: false,
				message: 'Leaderboard unavailable - score not saved',
				localScore: score,
			};
		}

		try {
			const response = await fetch(`${this.config.API_BASE}/saveScore`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick: nickname, score: score }),
				credentials: 'include',
			});

			if (!response.ok) throw new Error('Save failed');

			await this.fetchTopPlayers();
			return { success: true, message: 'Score saved!' };
		} catch (error) {
			console.error('Score save failed:', error);
			return {
				success: false,
				message: 'Failed to save score - retrying...',
				localScore: score,
			};
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
	constructor() {
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
		this.toggleModal(false);

		if (!nickname) {
			showToast('No nickname entered - score not saved', false);
			this.state.game.reset();
			return;
		}

		const result = await this.state.leaderboard.saveScore(nickname, this.state.score);
		showToast(result.message, result.success);
		this.state.game.reset();
	}

	toggleModal(show = true) {
		this.elements.gameOverModal.style.display = show ? 'block' : 'none';
		if (!show) {
			// Modal is closing—restart the game.
			game.reset();
		} else {
			this.elements.nicknameInput.focus();
		}
	}

	updateComboDisplay() {
		const { combo } = this.state.effects;
		this.elements.comboCounter.style.display = combo.active ? 'block' : 'none';
		this.elements.comboCounter.textContent = `COMBO x2 (${combo.remaining} left)`;
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
const ui = new UIManager();

game.addModule(leaderboard);
game.addModule(ui);

// Start the game loop!
game.start();

window.addEventListener('beforeunload', () => {
	leaderboard.destroy();
});
