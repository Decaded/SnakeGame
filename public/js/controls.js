// Global helper to dispatch a keyboard event, used by the arrow buttons.
function setDirection(dir) {
	const key = dir === 'up' ? 'ArrowUp' : dir === 'down' ? 'ArrowDown' : dir === 'left' ? 'ArrowLeft' : 'ArrowRight';

	const event = new KeyboardEvent('keydown', { key });
	document.dispatchEvent(event);
}

// Global function to show toast notifications.
function showToast(message, isSuccess = true) {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.className = isSuccess ? 'toast success' : 'toast error';
	toast.style.opacity = 1;

	// Automatically hide the toast after 3 seconds.
	setTimeout(() => {
		toast.style.opacity = 0;
	}, 3000);
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

// (Optional) Also add click events to support desktop interactions:
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
