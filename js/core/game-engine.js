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
				this.state.effects.combo.remaining--;
				if (this.state.effects.combo.remaining <= 0) {
					this.state.effects.combo.active = false;
					showToast('COMBO ENDED', false);
				}
			}
			this.state.score += this.state.food.points * this.state.level * multiplier;
		} else if (this.state.food.type === 'hubrisBerry') {
			const elapsed = (Date.now() - this.state.food.spawnTime) / 1000;
			let multiplier = 3 - Config.Food.PROPERTIES.hubrisBerry.decayRate * elapsed;
			multiplier = Math.max(multiplier, -3); // Cap at -3x

			// Calculate points and round to avoid decimals in the score
			const rawPoints = this.state.food.points * multiplier;
			const points = Math.round(rawPoints);
			this.state.score += points;

			// Visual feedback with correct string interpolation
			if (multiplier > 0) {
				showToast(`${multiplier.toFixed(1)}x HUBRIS!`);
			} else {
				showToast(`${Math.abs(multiplier).toFixed(1)}x PENALTY!`, false);
			}
		} else if (this.state.food.type === 'goldenApple') {
			if (this.state.effects.combo.active) {
				this.state.score *= 3;
				this.state.effects.combo.active = false;
				this.state.effects.combo.remaining = 0;
				showToast('SCORE TRIPLED!');
			} else {
				this.state.score *= 2;
				showToast('SCORE DOUBLED!');
			}
			this.applyEffect({
				...this.state.food.effect,
				type: 'glow',
			});
		}
		this.state.speedCounter++;
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

	// game-engine.js
	drawFood() {
		const { position, type, color, graphics, spawnTime } = this.state.food;
		const ctx = this.state.ctx;

		// Reset graphics properties
		ctx.shadowBlur = 0;
		ctx.shadowColor = 'transparent';

		// Handle Hubris Berry separately
		if (type === 'hubrisBerry') {
			const elapsed = (Date.now() - spawnTime) / 1000;
			const decayRate = Config.Food.PROPERTIES.hubrisBerry.decayRate;
			const multiplier = 3 - decayRate * elapsed;

			// Color progression: Indigo → Purple → Black
			let currentColor;
			if (multiplier >= 1.5) {
				currentColor = '#4B0082'; // Bright indigo
			} else if (multiplier >= 0) {
				currentColor = '#8A2BE2'; // Purple
			} else {
				currentColor = '#2F4F4F'; // Dark slate
			}

			// Shadow effects
			ctx.shadowColor = multiplier >= 0 ? '#4B0082' : '#2F4F4F';
			ctx.shadowBlur = 15 + Math.abs(multiplier * 5);

			// Draw the berry
			ctx.fillStyle = currentColor;
			ctx.beginPath();
			ctx.arc(position.x * this.state.gridSize + this.state.gridSize / 2, position.y * this.state.gridSize + this.state.gridSize / 2, this.state.gridSize / 2 - 1, 0, Math.PI * 2);
			ctx.fill();

			// Add pulsing effect for positive multiplier
			if (multiplier > 0) {
				const pulse = Math.sin(Date.now() / 200) * 2;
				ctx.lineWidth = 2;
				ctx.strokeStyle = `rgba(75, 0, 130, ${0.5 + pulse * 0.2})`;
				ctx.stroke();
			}
		}
		// Handle other food types
		else {
			// Apply food-specific graphics
			if (graphics) {
				Object.entries(graphics).forEach(([key, value]) => {
					ctx[key] = value;
				});
			}

			// Draw the food
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(position.x * this.state.gridSize + this.state.gridSize / 2, position.y * this.state.gridSize + this.state.gridSize / 2, this.state.gridSize / 2 - 1, 0, Math.PI * 2);
			ctx.fill();

			// Special effects for golden apple
			if (type === 'goldenApple') {
				ctx.lineWidth = 2;
				ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
				ctx.stroke();
			}
		}

		// Reset shadow properties
		ctx.shadowBlur = 0;
		ctx.shadowColor = 'transparent';
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

	triggerGameOver() {
		showToast('Game Over!', false);
		this.modules.forEach(module => module.handleGameOver?.());
	}
}
