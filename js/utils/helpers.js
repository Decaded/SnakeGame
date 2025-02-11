export const showToast = (message, isSuccess = true) => {
	const container = document.getElementById('messageContainer');
	if (!container) return;
	const messageEl = document.createElement('div');
	messageEl.className = `game-message ${isSuccess ? 'success' : 'error'}`;
	messageEl.textContent = message;
	container.appendChild(messageEl);
	setTimeout(() => messageEl.remove(), 3000);
};

export const validateNickname = nickname => {
	return /^[\p{L}\p{N}_-]{3,16}$/u.test(nickname);
};
