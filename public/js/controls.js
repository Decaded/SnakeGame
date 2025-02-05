// Constants and Configuration
const DIRECTION_MAP = {
	up: 'ArrowUp',
	down: 'ArrowDown',
	left: 'ArrowLeft',
	right: 'ArrowRight',
	w: 'up',
	s: 'down',
	a: 'left',
	d: 'right',
};

const ELEMENTS = {
	messageContainer: '#messageContainer',
	legend: '#legendAndLinks',
	leaderboard: '#leaderboard',
	buttons: {
		up: '#upBtn',
		down: '#downBtn',
		left: '#leftBtn',
		right: '#rightBtn',
		toggleLegend: '#toggleLegendButton',
		toggleLeaderboard: '#toggleLeaderboardButton',
	},
};

// Helper Functions
const setDirection = dir => {
	const key = DIRECTION_MAP[dir];
	if (!key) return;

	const event = new KeyboardEvent('keydown', { key });
	document.dispatchEvent(event);
};

const showToast = (message, isSuccess = true) => {
	const container = document.querySelector(ELEMENTS.messageContainer);
	const messageEl = document.createElement('div');

	messageEl.className = `game-message ${isSuccess ? 'success' : 'error'}`;
	messageEl.textContent = message;

	container.appendChild(messageEl);
	setTimeout(() => messageEl.remove(), 3000);
};

const createToggleHandler = (buttonId, targetId, labels) => {
	const button = document.querySelector(buttonId);
	const target = document.querySelector(targetId);

	if (!button || !target) return;

	button.addEventListener('click', () => {
		const isHidden = target.style.display === 'none';
		target.style.display = isHidden ? 'block' : 'none';
		button.textContent = labels[isHidden ? 0 : 1];
	});

	return { button, target };
};

// Event Handlers
const setupDirectionControls = () => {
	const handleDirectionEvent = (direction, event) => {
		if (event.type === 'touchstart') event.preventDefault();
		setDirection(direction);
	};

	Object.entries(DIRECTION_MAP).forEach(([input, direction]) => {
		if (!['w', 's', 'a', 'd', 'up', 'down', 'left', 'right'].includes(input)) return;

		const button = document.querySelector(ELEMENTS.buttons[direction.toLowerCase()]);
		if (!button) return;

		['touchstart', 'click'].forEach(eventType => {
			button.addEventListener(eventType, e => {
				handleDirectionEvent(input, e);
			});
		});
	});
};

const pressedKeys = new Set();

const setupKeyboardControls = () => {
	document.addEventListener('keydown', e => {
		// Prevent handling keys when typing in inputs
		if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
			return;
		}

		const key = e.key.toLowerCase();
		if (DIRECTION_MAP[key] && !pressedKeys.has(key)) {
			e.preventDefault();
			pressedKeys.add(key);
			setDirection(key);
		}
	});

	document.addEventListener('keyup', e => {
		const key = e.key.toLowerCase();
		pressedKeys.delete(key); // Allow the key to be pressed again after release
	});
};

const initializeToggles = () => {
	// Legend toggle
	const legendToggle = createToggleHandler(ELEMENTS.buttons.toggleLegend, ELEMENTS.legend, ['Hide How to Play', 'Show How to Play']);

	// Leaderboard toggle
	createToggleHandler(ELEMENTS.buttons.toggleLeaderboard, ELEMENTS.leaderboard, ['Hide Leaderboard', 'Show Leaderboard']);

	// Initial mobile legend state
	if (legendToggle?.target && window.innerWidth <= 600) {
		legendToggle.target.style.display = 'none';
	}
};

// Device Detection and Initialization
const detectDeviceType = () => {
	const isMobile = /Mobi|Android/i.test(navigator.userAgent);
	const deviceClass = isMobile ? 'mobile-device' : 'desktop-device';

	document.body.classList.add(deviceClass);
	if (isMobile && window.innerWidth > 800) {
		document.body.classList.add('tablet-device');
	}
};

// Initial Setup
const initialize = () => {
	detectDeviceType();
	setupDirectionControls();
	setupKeyboardControls();
	initializeToggles();
};

// Start the application
initialize();
