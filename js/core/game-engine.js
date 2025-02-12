// Use the global version from main.js
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load modules dynamically with versioning
const { Config } = await importVersioned('../config.js');
const { GameState } = await importVersioned('./game-state.js');
const { FoodSystem } = await importVersioned('./food-system.js');
const { InputController } = await importVersioned('../modules/input-controller.js');
const { CollisionSystem } = await importVersioned('../modules/collision-system.js');
const { SpeedManager } = await importVersioned('../modules/speed-manager.js');
const { showToast } = await importVersioned('../utils/helpers.js');

export class GameEngine {
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
			this.state.food = FoodSystem.generate(this.state.tileCount, this.state.snake, this.state.level);
		} else {
			this.state.snake.pop();
		}

		// Effects update
		this.updateEffects();

		this.modules.forEach(module => module.postUpdate?.(this.state));
	}

	isFoodCollision(head) {
		return this.state.food.some(f => head.x === f.position.x && head.y === f.position.y);
	}

	// In game-engine.js, update the handleFoodConsumption method
	handleFoodConsumption() {
		const eatenFoods = this.state.food.filter(f => this.state.snake[0].x === f.position.x && this.state.snake[0].y === f.position.y);

		eatenFoods.forEach(food => {
			if (food.type === 'cherry') {
				const effect = food.effect;
				if (this.state.effects.combo.active) {
					// Add to existing combo
					this.state.effects.combo.remaining += effect.duration;
					showToast(`+${effect.duration} combo! Total: ${this.state.effects.combo.remaining}`);
				} else {
					// Start new combo
					this.applyEffect(effect);
				}
				this.state.score += food.points * this.state.level;
			} else if (food.type === 'apple') {
				let multiplier = this.state.effects.combo.active ? 2 : 1;
				this.state.score += food.points * this.state.level * multiplier;

				// Decrement combo on apple collection
				if (this.state.effects.combo.active) {
					this.state.effects.combo.remaining--;
					if (this.state.effects.combo.remaining <= 0) {
						this.state.effects.combo.active = false;
						showToast('Combo finished!', false);
					}
				}
			} else if (food.type === 'hubrisBerry') {
				const elapsed = (Date.now() - food.spawnTime) / 1000;
				let multiplier = 3 - Config.Food.PROPERTIES.hubrisBerry.decayRate * elapsed;
				multiplier = Math.max(multiplier, -3);

				const rawPoints = food.points * multiplier;
				const points = Math.round(rawPoints);
				this.state.score += points;

				showToast(multiplier > 0 ? `${multiplier.toFixed(1)}x HUBRIS!` : `${Math.abs(multiplier).toFixed(1)}x PENALTY!`, false);
			} else if (food.type === 'goldenApple') {
				if (this.state.effects.combo.active) {
					this.state.score *= 3;
					this.state.effects.combo.active = false;
					this.state.effects.combo.remaining = 0;
					showToast('SCORE TRIPLED!');
				} else {
					this.state.score *= 2;
					showToast('SCORE DOUBLED!');
				}
				this.applyEffect({ ...food.effect, type: 'glow' });
			} else if (food.type === 'glitchBerry') {
				this.activateRGBSnake(food.effect.duration);
				this.playMusic(food.music, food.effect.duration);
				showToast('GLITCH MODE ACTIVATED!');
			}
		});

		this.state.speedCounter++;
		this.state.food = FoodSystem.generate(this.state.tileCount, this.state.snake, this.state.level); // Pass level here
	}

	applyEffect(effect) {
		switch (effect.type) {
			case 'combo':
				if (this.state.effects.combo.active) {
					this.state.effects.combo.remaining += effect.duration;
				} else {
					this.state.effects.combo = {
						active: true,
						remaining: effect.duration,
					};
				}
				showToast(effect.message);
				break;
			case 'glow':
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
		const rgbEffect = this.state.effects.rgbSnake.active;
		let color = Config.UI.COLORS.snake;

		if (rgbEffect) {
			color = this.state.snakeColor; // Use dynamic RGB color
		} else if (glow) {
			color = '#FFD700'; // Golden glow color
			ctx.shadowColor = '#FFD700';
			ctx.shadowBlur = 20;
		}

		ctx.fillStyle = color;
		this.state.snake.forEach(segment => {
			ctx.fillRect(segment.x * this.state.gridSize, segment.y * this.state.gridSize, this.state.gridSize, this.state.gridSize);
		});

		// Reset shadow properties after drawing
		ctx.shadowBlur = 0;
	}

	// The drawFood function supports multiple foods
	drawFood() {
		const ctx = this.state.ctx;

		this.state.food.forEach(food => {
			if (!food) return; // Safety check

			const { position, type, color, graphics, spawnTime } = food;

			// Reset graphics properties
			ctx.shadowBlur = 0;
			ctx.shadowColor = 'transparent';

			// Handle Hubris Berry separately
			if (type === 'hubrisBerry') {
				const elapsed = (Date.now() - spawnTime) / 1000;
				const decayRate = Config.Food.PROPERTIES.hubrisBerry.decayRate;
				const multiplier = 3 - decayRate * elapsed;

				let currentColor;
				if (multiplier >= 1.5) {
					currentColor = '#4B0082'; // Bright indigo
				} else if (multiplier >= 0) {
					currentColor = '#8A2BE2'; // Purple
				} else {
					currentColor = '#2F4F4F'; // Dark slate
				}

				ctx.shadowColor = multiplier >= 0 ? '#4B0082' : '#2F4F4F';
				ctx.shadowBlur = 15 + Math.abs(multiplier * 5);

				ctx.fillStyle = currentColor;
				ctx.beginPath();
				ctx.arc(
					position.x * this.state.gridSize + this.state.gridSize / 2,
					position.y * this.state.gridSize + this.state.gridSize / 2,
					this.state.gridSize / 2 - 1,
					0,
					Math.PI * 2,
				);
				ctx.fill();

				if (multiplier > 0) {
					const pulse = Math.sin(Date.now() / 200) * 2;
					ctx.lineWidth = 2;
					ctx.strokeStyle = `rgba(75, 0, 130, ${0.5 + pulse * 0.2})`;
					ctx.stroke();
				}
			} else {
				// Apply food-specific graphics
				if (graphics) {
					Object.entries(graphics).forEach(([key, value]) => {
						ctx[key] = value;
					});
				}

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(
					position.x * this.state.gridSize + this.state.gridSize / 2,
					position.y * this.state.gridSize + this.state.gridSize / 2,
					this.state.gridSize / 2 - 1,
					0,
					Math.PI * 2,
				);
				ctx.fill();

				if (type === 'goldenApple') {
					ctx.lineWidth = 2;
					ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
					ctx.stroke();
				}
			}

			ctx.shadowBlur = 0;
			ctx.shadowColor = 'transparent';
		});
	}

	drawUI() {
		// Score
		this.state.ctx.fillStyle = Config.UI.COLORS.text;
		this.state.ctx.fillText(`Score: ${this.state.score}`, Config.UI.TEXT.score.x, Config.UI.TEXT.score.y);
	}

	reset() {
		this.modules.forEach(module => module.destroy?.());
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

	triggerGameOver() {
		showToast('Game Over!', false);
		this.modules.forEach(module => module.handleGameOver?.());
	}

	activateRGBSnake(duration) {
		const startTime = Date.now();
		this.state.effects.rgbSnake = { active: true, endTime: startTime + duration };

		// Update snake color over time
		const interval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			if (elapsed >= duration) {
				clearInterval(interval);
				this.state.effects.rgbSnake.active = false;
				this.state.snakeColor = Config.UI.COLORS.snake; // Reset snake color
				return;
			}

			// Smooth RGB transition
			const r = Math.floor(128 + 127 * Math.sin(elapsed / 200));
			const g = Math.floor(128 + 127 * Math.sin(elapsed / 300));
			const b = Math.floor(128 + 127 * Math.sin(elapsed / 400));

			this.state.snakeColor = `rgb(${r}, ${g}, ${b})`;
		}, 50);
	}

	playMusic(url, duration) {
		// Create an audio element
		const audio = new Audio(url); // URL points to local audio file
		audio.currentTime = 0;
		audio.volume = 0.5; // Set volume (0 to 1)
		audio.play();

		// Stop the audio after the effect duration
		setTimeout(() => {
			audio.pause();
			audio.currentTime = 0; // Reset audio
		}, duration);
	}
}
