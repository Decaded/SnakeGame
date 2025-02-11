// Use the global version from main.js
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load modules dynamically with versioning
const { Config } = await importVersioned('../config.js');
const { showToast } = await importVersioned('../utils/helpers.js');

export class UIManager {
	constructor(game, leaderboard) {
		this.game = game;
		this.leaderboard = leaderboard;
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

		// Mobile controls - translate touch events to keyboard events
		document.querySelectorAll('.control-btn').forEach(btn => {
			// Map button IDs to keyboard keys
			const keyMap = {
				upBtn: 'ArrowUp',
				downBtn: 'ArrowDown',
				leftBtn: 'ArrowLeft',
				rightBtn: 'ArrowRight',
			};

			const key = keyMap[btn.id];
			if (!key) return;

			// Simulate keydown on touch start
			btn.addEventListener('touchstart', e => {
				e.preventDefault();
				this.simulateKeyEvent('keydown', key);
				btn.classList.add('active');
			});

			// Simulate keyup on touch end
			btn.addEventListener('touchend', e => {
				e.preventDefault();
				this.simulateKeyEvent('keyup', key);
				btn.classList.remove('active');
			});

			// Prevent context menu on long press
			btn.addEventListener('contextmenu', e => e.preventDefault());
		});
	}

	simulateKeyEvent(type, key) {
		const event = new KeyboardEvent(type, {
			key: key,
			code: key,
			bubbles: true,
			cancelable: true,
		});

		// Dispatch to document to leverage existing keyboard handling
		document.dispatchEvent(event);
	}

	async handleScoreSubmission() {
		const nickname = this.elements.nicknameInput.value.trim();

		if (!nickname) {
			showToast('No nickname entered', false);
			this.toggleModal(false);
			this.game.reset();
			return;
		}

		const result = await this.leaderboard.saveScore(nickname, this.game.state.score);
		showToast(result.message, result.success);
		this.toggleModal(false);
		this.game.reset();
	}

	handleGameOver() {
		this.toggleModal(true);
	}

	toggleModal(show = true) {
		this.elements.gameOverModal.style.display = show ? 'block' : 'none';
		if (show) {
			this.elements.nicknameInput.focus();
		} else {
			this.game.reset();
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
