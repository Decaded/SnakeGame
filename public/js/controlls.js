// Global helper to dispatch a keyboard event, used by the arrow buttons.
function setDirection(dir) {
	const key = dir === 'up' ? 'ArrowUp' : dir === 'down' ? 'ArrowDown' : dir === 'left' ? 'ArrowLeft' : 'ArrowRight';

	const event = new KeyboardEvent('keydown', { key });
	document.dispatchEvent(event);
}
