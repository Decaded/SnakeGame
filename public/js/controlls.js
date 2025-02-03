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
