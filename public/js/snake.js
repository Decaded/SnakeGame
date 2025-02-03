class GameState {
	constructor() {
		this.canvas = document.getElementById('gameCanvas');
		this.ctx = this.canvas.getContext('2d');
		this.gridSize = 20;
		this.tileCount = Math.floor(this.canvas.width / this.gridSize);

		this.snake = [{ x: 10, y: 10 }];
		this.direction = { x: 0, y: 0 };
		this.lastProcessedDirection = { x: 0, y: 0 };
		this.queuedDirection = null;
		this.food = this.randomFoodPosition();
		this.score = 0;
		this.gameOver = false;
		this.currentSpeed = 150;
		this.speedIncreaseCounter = 0;
		this.gameLoopTimeout = null;
	}

	randomFoodPosition() {
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

		if (this.state.queuedDirection) {
			this.state.direction = this.state.queuedDirection;
			this.state.lastProcessedDirection = this.state.queuedDirection;
			this.state.queuedDirection = null;
		}

		const head = {
			x: this.state.snake[0].x + this.state.direction.x,
			y: this.state.snake[0].y + this.state.direction.y,
		};

		this.state.snake.unshift(head);

		if (head.x === this.state.food.x && head.y === this.state.food.y) {
			this.state.score++;
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

		// Score
		this.state.ctx.fillStyle = '#fff';
		this.state.ctx.fillText(`Score: ${this.state.score}`, 10, 20);
	}

	resetGame() {
		this.state = new GameState();
		this.modules.forEach(module => module.reset?.());
		if (this.state.gameLoopTimeout) {
			clearTimeout(this.state.gameLoopTimeout);
		}
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

		if (newDirection && !this.state.queuedDirection) {
			const isOpposite =
				(this.state.lastProcessedDirection.x !== 0 && newDirection.x === -this.state.lastProcessedDirection.x) ||
				(this.state.lastProcessedDirection.y !== 0 && newDirection.y === -this.state.lastProcessedDirection.y);

			if (!isOpposite) {
				this.state.queuedDirection = newDirection;
			}
		}
	}

	processInput(state) {
		if (state.queuedDirection) {
			state.direction = state.queuedDirection;
			state.lastProcessedDirection = state.queuedDirection;
			state.queuedDirection = null;
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
		state.gameOver = true;
		showGameOverModal();
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
		// Calculate fill ratio: at 150ms (start) the bar is 0%; at 70ms it's 100%
		const minSpeed = 70;
		const maxSpeed = 150;
		const ratio = (maxSpeed - state.currentSpeed) / (maxSpeed - minSpeed);
		const levelBar = document.getElementById('levelBar');
		if (levelBar) {
			levelBar.style.width = `${ratio * 100}%`;
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
		if (!nick) {
			alert('Please enter a nickname');
			return;
		}

		const result = await leaderboard.saveScore(nick, game.state.score);
		alert(result.message);
		this.hideGameOverModal();
		// Restart the game after submitting score.
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
