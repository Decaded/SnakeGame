const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const topPlayersList = document.getElementById('topPlayers');

const gridSize = 20;
const tileCount = Math.floor(canvas.width / gridSize);
const APIurl = 'https://api.decaded.dev/SnakeGame';

// Game state
let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let lastProcessedDirection = { x: 0, y: 0 };
let queuedDirection = null;
let food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
let score = 0;
let gameOver = false;
let currentSpeed = 150;
let speedIncreaseCounter = 0;
let gameLoopTimeout;

// Visual feedback
function updateBorderColor() {
	const minSpeed = 70;
	const maxSpeed = 150;
	const ratio = (currentSpeed - minSpeed) / (maxSpeed - minSpeed);
	const red = Math.floor(255 * (1 - ratio));
	const green = Math.floor(255 * ratio);
	const color = `rgb(${red}, ${green}, 0)`;
	const shadowColor = `rgba(${red}, ${green}, 0, 0.8)`;
	canvas.style.borderColor = color;
	canvas.style.boxShadow = `0 0 20px ${shadowColor}`;
}
updateBorderColor();

// Game loop management
function startGameLoop() {
	function loop() {
		if (!gameOver) {
			update();
			draw();
			gameLoopTimeout = setTimeout(loop, currentSpeed);
		}
	}
	loop();
}

// Input handling
document.addEventListener('keydown', e => {
	const key = e.key;
	let newDirection = null;

	switch (key) {
		case 'ArrowUp':
			if (lastProcessedDirection.y === 0) newDirection = { x: 0, y: -1 };
			break;
		case 'ArrowDown':
			if (lastProcessedDirection.y === 0) newDirection = { x: 0, y: 1 };
			break;
		case 'ArrowLeft':
			if (lastProcessedDirection.x === 0) newDirection = { x: -1, y: 0 };
			break;
		case 'ArrowRight':
			if (lastProcessedDirection.x === 0) newDirection = { x: 1, y: 0 };
			break;
	}

	if (newDirection && !queuedDirection) {
		const isOpposite =
			(lastProcessedDirection.x !== 0 && newDirection.x === -lastProcessedDirection.x) || (lastProcessedDirection.y !== 0 && newDirection.y === -lastProcessedDirection.y);

		if (!isOpposite) {
			queuedDirection = newDirection;
		}
	}
});

// Game logic
function update() {
	// Process queued input
	if (queuedDirection) {
		direction = queuedDirection;
		lastProcessedDirection = queuedDirection;
		queuedDirection = null;
	}

	const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

	// Wall collision
	if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
		gameOver = true;
		endGame();
		return;
	}

	// Self-collision (skip first segment)
	for (let i = 1; i < snake.length; i++) {
		if (snake[i].x === head.x && snake[i].y === head.y) {
			gameOver = true;
			endGame();
			return;
		}
	}

	// Movement and food handling
	snake.unshift(head);
	if (head.x === food.x && head.y === food.y) {
		score++;
		speedIncreaseCounter++;

		if (speedIncreaseCounter >= 5) {
			currentSpeed = Math.max(70, currentSpeed - 10);
			updateBorderColor();
			speedIncreaseCounter = 0;
		}

		food = {
			x: Math.floor(Math.random() * tileCount),
			y: Math.floor(Math.random() * tileCount),
		};
	} else {
		snake.pop();
	}
}

// Rendering
function draw() {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw snake
	ctx.fillStyle = '#0f0';
	snake.forEach(segment => ctx.fillRect(Math.round(segment.x * gridSize), Math.round(segment.y * gridSize), gridSize, gridSize));

	// Draw food
	ctx.fillStyle = '#f00';
	ctx.fillRect(Math.round(food.x * gridSize), Math.round(food.y * gridSize), gridSize, gridSize);

	// Draw score
	ctx.fillStyle = '#fff';
	ctx.fillText(`Score: ${score}`, 10, 20);
}

// Game state management
function endGame() {
	showGameOverModal();
}

function resetGame() {
	snake = [{ x: 10, y: 10 }];
	direction = { x: 0, y: 0 };
	lastProcessedDirection = { x: 0, y: 0 };
	queuedDirection = null;
	score = 0;
	food = {
		x: Math.floor(Math.random() * tileCount),
		y: Math.floor(Math.random() * tileCount),
	};
	gameOver = false;
	currentSpeed = 150;
	speedIncreaseCounter = 0;
	updateBorderColor();

	if (gameLoopTimeout) {
		clearTimeout(gameLoopTimeout);
	}
	startGameLoop();
}

// Leaderboard functions
function fetchTopPlayers() {
	fetch(APIurl + '/getTopPlayers', { credentials: 'include' })
		.then(response => response.json())
		.then(data => {
			topPlayersList.innerHTML = '';
			data.forEach(player => {
				const li = document.createElement('li');
				li.textContent = `${player.nick}: ${player.score}`;
				topPlayersList.appendChild(li);
			});
		})
		.catch(console.error);
}

function saveScore(nick, score) {
	return fetch(APIurl + '/saveScore', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ nick, score }),
		credentials: 'include',
	})
		.then(response => (response.ok ? response.json() : Promise.reject()))
		.then(() => fetchTopPlayers())
		.catch(() => ({ success: false, message: 'Failed to save score' }));
}

// Initial setup
fetchTopPlayers();
startGameLoop();
