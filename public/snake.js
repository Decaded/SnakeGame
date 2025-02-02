const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const topPlayersList = document.getElementById('topPlayers');

const gridSize = 20;
const tileCount = Math.floor(canvas.width / gridSize);

let snake = [{ x: 10, y: 10 }]; // Initial snake position
let direction = { x: 0, y: 0 }; // Initial direction (not moving)
let food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
let score = 0;
let gameOver = false; // Track if the game is over

const APIurl = 'https://api.decaded.dev/SnakeGame';

function startGameLoop() {
	setInterval(() => {
		if (!gameOver) {
			update();
			draw();
		}
	}, 90);
}

function update() {
	const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

	// Check for collision with walls
	if (head.x < 0 || head.x > tileCount - 1 || head.y < 0 || head.y > tileCount - 1) {
		gameOver = true;
		endGame();
		return;
	}

	// Check for collision with itself
	for (let i = 1; i < snake.length; i++) {
		if (snake[i].x === head.x && snake[i].y === head.y) {
			gameOver = true;
			endGame();
			return;
		}
	}

	snake.unshift(head);

	// Check if snake eats food
	if (head.x === food.x && head.y === food.y) {
		score++;
		food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
	} else {
		snake.pop();
	}
}

function draw() {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = '#0f0';
	snake.forEach(segment => ctx.fillRect(Math.round(segment.x * gridSize), Math.round(segment.y * gridSize), gridSize, gridSize));

	ctx.fillStyle = '#f00';
	ctx.fillRect(Math.round(food.x * gridSize), Math.round(food.y * gridSize), gridSize, gridSize);

	ctx.fillStyle = '#fff';
	ctx.fillText(`Score: ${score}`, 10, 20);
}

function endGame() {
	showGameOverModal();
}

function resetGame() {
	snake = [{ x: 10, y: 10 }]; // Reset snake position
	direction = { x: 0, y: 0 }; // Reset direction
	score = 0; // Reset score
	food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) }; // New food position
	gameOver = false; // Reset game over flag
}

document.addEventListener('keydown', e => {
	switch (e.key) {
		case 'ArrowUp':
			if (direction.y === 0) direction = { x: 0, y: -1 }; // Prevent reversing direction
			break;
		case 'ArrowDown':
			if (direction.y === 0) direction = { x: 0, y: 1 }; // Prevent reversing direction
			break;
		case 'ArrowLeft':
			if (direction.x === 0) direction = { x: -1, y: 0 }; // Prevent reversing direction
			break;
		case 'ArrowRight':
			if (direction.x === 0) direction = { x: 1, y: 0 }; // Prevent reversing direction
			break;
	}
});

function fetchTopPlayers() {
	fetch(APIurl + '/getTopPlayers', { credentials: 'include' })
		.then(response => response.json())
		.then(data => {
			topPlayersList.innerHTML = ''; // Clear the list
			data.forEach((player, index) => {
				const li = document.createElement('li');
				li.textContent = `${player.nick}: ${player.score}`;
				topPlayersList.appendChild(li);
			});
		})
		.catch(error => console.error('Error fetching top players:', error));
}

function saveScore(nick, score) {
	return fetch(APIurl + '/saveScore', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ nick, score }),
		credentials: 'include',
	})
		.then(response => {
			if (!response.ok) {
				// Log the server's response for debugging
				return response.json().then(err => {
					console.error('Server error:', err);
					throw new Error(err.message || 'Network response was not ok');
				});
			}
			return response.json();
		})
		.then(data => {
			console.log('Server response:', data);
			fetchTopPlayers(); // Refresh the leaderboard after saving the score
			return data; // Return the server response
		})
		.catch(error => {
			console.error('Error saving score:', error);
			return { success: false, message: 'Failed to save score' };
		});
}

// Initial fetch of top players
fetchTopPlayers();

// Start the game loop
startGameLoop();
