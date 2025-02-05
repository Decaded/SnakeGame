import { Config } from '../config.js';

export class SpeedManager {
	init(state) {
		this.state = state;
	}

	postUpdate(state) {
		state.currentSpeed = Math.max(Config.Game.MIN_SPEED, state.baseSpeed - state.level * Config.Game.LEVELS.SPEED_STEP);

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
