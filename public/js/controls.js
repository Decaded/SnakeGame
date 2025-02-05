// Global helper to dispatch a keyboard event, used by the arrow buttons.
function setDirection(dir) {
	const key = dir === 'up' ? 'ArrowUp' : dir === 'down' ? 'ArrowDown' : dir === 'left' ? 'ArrowLeft' : 'ArrowRight';

	const event = new KeyboardEvent('keydown', { key });
	document.dispatchEvent(event);
}

// Global function to show toast notifications.
function showToast(message, isSuccess = true) {
	const container = document.getElementById('messageContainer');
	const messageEl = document.createElement('div');
	messageEl.className = `game-message ${isSuccess ? 'success' : 'error'}`;
	messageEl.textContent = message;

	container.appendChild(messageEl);
	setTimeout(() => messageEl.remove(), 3000);
}

// Mobile control event listeners (supporting touch)
document.getElementById('upBtn').addEventListener('touchstart', e => {
	e.preventDefault(); // Prevents ghost clicks
	setDirection('up');
});
document.getElementById('downBtn').addEventListener('touchstart', e => {
	e.preventDefault();
	setDirection('down');
});
document.getElementById('leftBtn').addEventListener('touchstart', e => {
	e.preventDefault();
	setDirection('left');
});
document.getElementById('rightBtn').addEventListener('touchstart', e => {
	e.preventDefault();
	setDirection('right');
});

const toggleLegendButton = document.getElementById('toggleLegendButton');
const legend = document.getElementById('legendAndLinks');

if (toggleLegendButton && legend) {
  toggleLegendButton.addEventListener('click', function() {
    const isHidden = legend.style.display === 'none';
    legend.style.display = isHidden ? 'block' : 'none';
    this.textContent = isHidden ? 'Hide How to Play' : 'Show How to Play';
  });
  
  // Hide legend initially on mobile
  if (window.innerWidth <= 600) {
    legend.style.display = 'none';
  }
}

// Click events to support desktop interactions:
document.getElementById('upBtn').addEventListener('click', () => setDirection('up'));
document.getElementById('downBtn').addEventListener('click', () => setDirection('down'));
document.getElementById('leftBtn').addEventListener('click', () => setDirection('left'));
document.getElementById('rightBtn').addEventListener('click', () => setDirection('right'));

// Leaderboard Toggle Button functionality
document.getElementById('toggleLeaderboardButton').addEventListener('click', function () {
	const leaderboardEl = document.getElementById('leaderboard');
	if (leaderboardEl.style.display === 'none' || leaderboardEl.style.display === '') {
		leaderboardEl.style.display = 'block';
		this.textContent = 'Hide Leaderboard';
	} else {
		leaderboardEl.style.display = 'none';
		this.textContent = 'Show Leaderboard';
	}
});

function isMobileDevice() {
	return /Mobi|Android/i.test(navigator.userAgent);
}

if (isMobileDevice()) {
	document.body.classList.add('mobile-device');
	// Arbitrary threshold to decide if it's a tablet vs a phone
	if (window.innerWidth > 800) {
		document.body.classList.add('tablet-device');
	}
} else {
	document.body.classList.add('desktop-device');
}
