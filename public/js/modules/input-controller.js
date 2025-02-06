const DIRECTION_MAP = {
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 },
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
	w: { x: 0, y: -1 },
	s: { x: 0, y: 1 },
	a: { x: -1, y: 0 },
	d: { x: 1, y: 0 },
};

export class InputController {
	init(state) {
		this.state = state;
		this.pressedKeys = new Set(); // Track pressed keys
		document.addEventListener('keydown', this.handleInput.bind(this));
		document.addEventListener('keyup', this.handleKeyRelease.bind(this));
	}

	handleInput(e) {
		if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

		const newDir = DIRECTION_MAP[e.key];
		if (!newDir) return;

		// Allow sustained key presses
		if (this.pressedKeys.has(e.key)) return;

		this.pressedKeys.add(e.key);
		if (!this.isOpposite(newDir)) {
			this.state.directionQueue.push(newDir);
		}
	}

	handleKeyRelease(e) {
		const key = e.key;
		if (DIRECTION_MAP[key]) {
			this.pressedKeys.delete(key);
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

export function setupKeyboardControls(game) {
	document.addEventListener('keydown', e => {
		if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
		const newDir = DIRECTION_MAP[e.key];
		if (newDir) {
			e.preventDefault();
			const lastDir = game.state.directionQueue.length ? game.state.directionQueue[game.state.directionQueue.length - 1] : game.state.direction;
			if (!(newDir.x === -lastDir.x && newDir.y === -lastDir.y)) {
				game.state.directionQueue.push(newDir);
			}
		}
	});
}

export function setupTouchControls(game) {
	document.querySelectorAll('.control-btn').forEach(btn => {
		btn.addEventListener('touchstart', e => {
			e.preventDefault();
			const dir = btn.id.replace('Btn', '');
			if (!DIRECTION_MAP[dir]) return;
			const newDir = DIRECTION_MAP[dir];
			if (newDir) {
				const lastDir = game.state.directionQueue.length ? game.state.directionQueue[game.state.directionQueue.length - 1] : game.state.direction;
				if (!(newDir.x === -lastDir.x && newDir.y === -lastDir.y)) {
					game.state.directionQueue.push(newDir);
				}
			}
		});
	});
}
