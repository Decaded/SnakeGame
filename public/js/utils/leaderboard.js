export class LeaderboardManager {
	constructor() {
		this.API_BASE = 'https://api.decaded.dev/SnakeGame';
		this.topPlayersList = document.getElementById('topPlayers');
		this.fetchInterval = null;
		this.isServerOffline = false;
	}

	init() {
		this.setupAutoRefresh();
	}

	setupAutoRefresh() {
		this.fetchTopPlayers();
		this.fetchInterval = setInterval(() => this.fetchTopPlayers(), 30000);
	}

	async fetchTopPlayers() {
		try {
			const response = await fetch(`${this.API_BASE}/getTopPlayers`);

			if (!response.ok) throw new Error('Server error');

			const data = await response.json();
			this.isServerOffline = false;
			this.updateDisplay(data);
		} catch (error) {
			console.error('Leaderboard fetch failed:', error);
			this.isServerOffline = true;
			this.showErrorMessage();
		}
	}

	updateDisplay(players) {
		this.topPlayersList.innerHTML = players.map(player => `<li>${player.nick}: ${player.score}</li>`).join('');
	}

	showErrorMessage() {
		this.topPlayersList.innerHTML = `
      <div class="leaderboard-error">
        <p>⚠️ Server offline</p>
        <p>Leaderboards disabled</p>
        <p>Your score will not be saved</p>
      </div>
    `;
	}

	async saveScore(nickname, score) {
		if (this.isServerOffline) {
			return {
				success: false,
				message: 'Score not saved - server offline',
			};
		}

		try {
			const response = await fetch(`${this.API_BASE}/saveScore`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick: nickname, score }),
				credentials: 'include',
			});

			if (!response.ok) throw new Error('Save failed');

			return await response.json();
		} catch (error) {
			this.isServerOffline = true;
			return {
				success: false,
				message: 'Failed to save score - server offline',
			};
		}
	}

	destroy() {
		clearInterval(this.fetchInterval);
	}
}
