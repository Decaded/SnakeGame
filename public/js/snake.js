class GameState {
	constructor() {
		this.canvas = document.getElementById('gameCanvas');
		this.ctx = this.canvas.getContext('2d');
		this.gridSize = 20;
		this.tileCount = Math.floor(this.canvas.width / this.gridSize);
		this.snake = [{ x: 10, y: 10 }];
		this.direction = { x: 0, y: 0 };
		this.lastProcessedDirection = { x: 0, y: 0 };
		this.directionQueue = [];
		this.food = this.randomFoodPosition();
		this.score = 0;
		this.gameOver = false;
		this.modalShown = false;
		this.currentSpeed = 150;
		this.speedIncreaseCounter = 0;
		this.gameLoopTimeout = null;
		this.foodType = 'apple';
		this.comboActive = false;
		this.comboCounter = 0;
		this.currentLevel = 1;
	}

	randomFoodPosition() {
		const types = ['apple', 'cherry'];
		this.foodType = Math.random() < 0.2 ? 'cherry' : 'apple'; // 20% chance for cherry

		return {
			x: Math.floor(Math.random() * this.tileCount),
			y: Math.floor(Math.random() * this.tileCount),
		};
	}
}

class GameCore {
	constructor() {
		this.state = new GameState();
		this.modules = [];
		this.hooks = {
			preUpdate: [],
			postUpdate: [],
			preDraw: [],
			postDraw: [],
		};
	}

	addModule(module) {
		this.modules.push(module);
		module.init?.(this.state, this.hooks);
	}

	startGameLoop() {
		const loop = () => {
			if (!this.state.gameOver) {
				this.runHooks('preUpdate');
				this.update();
				this.runHooks('postUpdate');

				this.runHooks('preDraw');
				this.draw();
				this.runHooks('postDraw');

				this.state.gameLoopTimeout = setTimeout(loop, this.state.currentSpeed);
			}
		};
		loop();
	}

	runHooks(hookName) {
		this.hooks[hookName].forEach(callback => callback(this.state));
	}

	update() {
		if (this.state.gameOver) return;

		const head = {
			x: this.state.snake[0].x + this.state.direction.x,
			y: this.state.snake[0].y + this.state.direction.y,
		};

		this.state.snake.unshift(head);

		if (head.x === this.state.food.x && head.y === this.state.food.y) {
			// Handle power-up effects
			if (this.state.foodType === 'cherry') {
				this.state.comboActive = true;
				this.state.comboCounter = 3;
				showToast('DOUBLE POINTS ACTIVATED!', true);
			}

			// Calculate score with level and combo
			const basePoints = 1;
			const levelMultiplier = this.state.currentLevel;
			const comboMultiplier = this.state.comboActive ? 2 : 1;
			const points = basePoints * levelMultiplier * comboMultiplier;
			this.state.score += points;

			// Update combo counter
			if (this.state.comboActive) {
				this.state.comboCounter--;
				if (this.state.comboCounter <= 0) {
					this.state.comboActive = false;
					showToast('COMBO ENDED', false);
				}
			}

			this.state.speedIncreaseCounter++;
			this.state.food = this.state.randomFoodPosition();
		} else {
			this.state.snake.pop();
		}
	}

	draw() {
		this.state.ctx.fillStyle = '#000';
		this.state.ctx.fillRect(0, 0, this.state.canvas.width, this.state.canvas.height);

		// Snake
		this.state.ctx.fillStyle = '#0f0';
		this.state.snake.forEach(segment => {
			this.state.ctx.fillRect(segment.x * this.state.gridSize, segment.y * this.state.gridSize, this.state.gridSize, this.state.gridSize);
		});

		// Food
		this.state.ctx.fillStyle = '#f00';
		this.state.ctx.fillRect(this.state.food.x * this.state.gridSize, this.state.food.y * this.state.gridSize, this.state.gridSize, this.state.gridSize);

		// Food with different colors
		this.state.ctx.fillStyle = this.state.foodType === 'cherry' ? '#ff69b4' : '#ff0000';
		this.state.ctx.beginPath();
		this.state.ctx.arc(
			this.state.food.x * this.state.gridSize + this.state.gridSize / 2,
			this.state.food.y * this.state.gridSize + this.state.gridSize / 2,
			this.state.gridSize / 2 - 1,
			0,
			Math.PI * 2,
		);
		this.state.ctx.fill();

		// Combo counter
		const comboEl = document.getElementById('comboCounter');
		if (comboEl) {
			comboEl.style.display = this.state.comboActive ? 'block' : 'none';
			comboEl.textContent = `COMBO x2 (${this.state.comboCounter} left)`;
		}

		// Score
		this.state.ctx.fillStyle = '#fff';
		this.state.ctx.fillText(`Score: ${this.state.score}`, 10, 20);
	}

	resetGame() {
		// Cancel the previous game loop timeout, if any.
		if (this.state.gameLoopTimeout) {
			clearTimeout(this.state.gameLoopTimeout);
			this.state.gameLoopTimeout = null;
		}
		ui.hideGameOverModal();

		// Reset properties on the same game state.
		this.state.snake = [{ x: 10, y: 10 }];
		this.state.direction = { x: 0, y: 0 };
		this.state.lastProcessedDirection = { x: 0, y: 0 };
		this.state.directionQueue = []; // Reset directionQueue
		this.state.food = this.state.randomFoodPosition();
		this.state.score = 0;
		this.state.gameOver = false;
		this.state.modalShown = false;
		this.state.currentSpeed = 150;
		this.state.speedIncreaseCounter = 0;

		// Reset combo bonuses
		this.state.currentLevel = 1;
		this.state.comboActive = false;
		this.state.comboCounter = 0;

		// Reset canvas border and level bar
		this.state.canvas.style.borderColor = '#00ff00';
		this.state.canvas.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
		const levelBar = document.getElementById('levelBar');
		const levelText = document.getElementById('levelText');
		if (levelBar) {
			levelBar.style.width = '0%';
			levelText.textContent = 'Level 1';
		}

		// Start the new game loop.
		this.startGameLoop();
	}
}

// Input Module
class InputHandler {
	init(state, hooks) {
		this.state = state;
		document.addEventListener('keydown', this.handleKeyDown.bind(this));
		hooks.preUpdate.push(this.processInput.bind(this));
	}

	handleKeyDown(e) {
		const key = e.key;
		let newDirection = null;

		switch (key) {
			case 'ArrowUp':
				if (this.state.lastProcessedDirection.y === 0) newDirection = { x: 0, y: -1 };
				break;
			case 'ArrowDown':
				if (this.state.lastProcessedDirection.y === 0) newDirection = { x: 0, y: 1 };
				break;
			case 'ArrowLeft':
				if (this.state.lastProcessedDirection.x === 0) newDirection = { x: -1, y: 0 };
				break;
			case 'ArrowRight':
				if (this.state.lastProcessedDirection.x === 0) newDirection = { x: 1, y: 0 };
				break;
		}

		if (newDirection) {
			this.state.directionQueue.push(newDirection);
		}
	}

	processInput(state) {
		if (state.directionQueue.length === 0) return;

		let selectedIndex = -1;
		for (let i = 0; i < state.directionQueue.length; i++) {
			const dir = state.directionQueue[i];
			const isOpposite =
				(state.lastProcessedDirection.x !== 0 && dir.x === -state.lastProcessedDirection.x) || (state.lastProcessedDirection.y !== 0 && dir.y === -state.lastProcessedDirection.y);

			if (!isOpposite) {
				selectedIndex = i;
				break;
			}
		}

		if (selectedIndex >= 0) {
			const selectedDir = state.directionQueue[selectedIndex];
			state.direction = selectedDir;
			state.lastProcessedDirection = selectedDir;
			state.directionQueue.splice(0, selectedIndex + 1);
		}
	}
}

// Collision Module
class CollisionDetector {
	init(state, hooks) {
		hooks.postUpdate.push(this.checkCollisions.bind(this, state));
	}

	checkCollisions(state) {
		const head = state.snake[0];

		// Wall collision
		if (head.x < 0 || head.x >= state.tileCount || head.y < 0 || head.y >= state.tileCount) {
			this.endGame(state);
			return;
		}

		// Self-collision
		for (let i = 1; i < state.snake.length; i++) {
			if (state.snake[i].x === head.x && state.snake[i].y === head.y) {
				this.endGame(state);
				return;
			}
		}
	}

	endGame(state) {
		if (!state.modalShown) {
			state.modalShown = true;
			state.gameOver = true;
			showGameOverModal();
		}
	}
}

// Speed Module
class SpeedController {
	init(state, hooks) {
		hooks.postUpdate.push(this.updateSpeed.bind(this, state));
	}

	updateSpeed(state) {
		if (state.speedIncreaseCounter >= 5) {
			state.currentSpeed = Math.max(70, state.currentSpeed - 10);
			state.speedIncreaseCounter = 0;
			this.updateBorderColor(state);
			this.updateLevelBar(state);
		}
	}

	updateBorderColor(state) {
		const minSpeed = 70;
		const maxSpeed = 150;
		const ratio = (state.currentSpeed - minSpeed) / (maxSpeed - minSpeed);
		const red = Math.floor(255 * (1 - ratio));
		const green = Math.floor(255 * ratio);

		state.canvas.style.borderColor = `rgb(${red}, ${green}, 0)`;
		state.canvas.style.boxShadow = `0 0 20px rgba(${red}, ${green}, 0, 0.8)`;
	}

	updateLevelBar(state) {
		const minSpeed = 70;
		const maxSpeed = 150;
		const maxLevel = 8;

		// Calculate current level and progress
		const rawLevel = (maxSpeed - state.currentSpeed) / 10 + 1;
		const level = Math.min(rawLevel, maxLevel);
		state.currentLevel = Math.floor(level);
		const progress = (maxSpeed - state.currentSpeed) / (maxSpeed - minSpeed);

		const levelBar = document.getElementById('levelBar');
		const levelText = document.getElementById('levelText');

		if (levelBar && levelText) {
			levelBar.style.width = `${Math.min(progress * 100, 100)}%`;

			if (state.currentSpeed === minSpeed) {
				levelText.textContent = 'MAX LEVEL!';
			} else {
				levelText.textContent = `Level ${Math.floor(level)}`;
			}
		}
	}
}

// Leaderboard Module
class LeaderboardManager {
	constructor() {
		this.APIurl = 'https://api.decaded.dev/SnakeGame';
		this.topPlayersList = document.getElementById('topPlayers');
	}

	init() {
		this.fetchTopPlayers();
	}

	async fetchTopPlayers() {
		try {
			const response = await fetch(`${this.APIurl}/getTopPlayers`, { credentials: 'include' });
			const data = await response.json();
			this.updateLeaderboardDisplay(data);
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
		}
	}

	updateLeaderboardDisplay(players) {
		this.topPlayersList.innerHTML = '';
		players.forEach(player => {
			const li = document.createElement('li');
			li.textContent = `${player.nick}: ${player.score}`;
			this.topPlayersList.appendChild(li);
		});
	}

	async saveScore(nick, score) {
		try {
			const response = await fetch(`${this.APIurl}/saveScore`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick, score }),
				credentials: 'include',
			});
			if (response.ok) this.fetchTopPlayers();
			return await response.json();
		} catch (error) {
			return { success: false, message: 'Failed to save score' };
		}
	}
}

// UI Module
class UIManager {
	constructor() {
		this.gameOverModal = document.getElementById('gameOverModal');
		this.nicknameInput = document.getElementById('nicknameInput');
		this.submitScoreButton = document.getElementById('submitScoreButton');
		this.setupEventListeners();
	}

	setupEventListeners() {
		this.submitScoreButton.addEventListener('click', () => {
			this.submitScore();
		});
		this.nicknameInput.addEventListener('keydown', e => {
			if (e.key === 'Enter') {
				this.submitScore();
			}
		});
	}

	showGameOverModal() {
		this.gameOverModal.style.display = 'block';
		this.nicknameInput.focus();
	}

	hideGameOverModal() {
		this.gameOverModal.style.display = 'none';
		this.nicknameInput.value = '';
	}

	async submitScore() {
		const nick = this.nicknameInput.value.trim();

		this.hideGameOverModal();

		if (!nick) {
			showToast('No nick provided, restarting game.', false);
			// Always reset game even if no nickname is provided.
			game.resetGame();
			return;
		}

		const result = await leaderboard.saveScore(nick, game.state.score);
		showToast(result.message, result.success);
		// Always reset game regardless of the result.
		game.resetGame();
	}
}

// Initialize Game
const game = new GameCore();
const input = new InputHandler();
const collision = new CollisionDetector();
const speed = new SpeedController();
const leaderboard = new LeaderboardManager();
const ui = new UIManager();

game.addModule(input);
game.addModule(collision);
game.addModule(speed);

// Expose global functions
window.resetGame = () => game.resetGame();
window.showGameOverModal = () => ui.showGameOverModal();

// Start game
game.startGameLoop();
leaderboard.init();
