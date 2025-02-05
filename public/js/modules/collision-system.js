import { showToast } from '../utils/helpers.js';

export class CollisionSystem {
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
		this.game.triggerGameOver();
	}
}
