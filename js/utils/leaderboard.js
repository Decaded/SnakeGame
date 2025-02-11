export class LeaderboardManager {
	constructor() {
		this.API_BASE = 'https://api.decaded.dev/SnakeGame';
		this.topPlayersList = document.getElementById('topPlayers');
		this.fetchInterval = null;
		this.isServerOffline = false;
		this.tokenAttempts = 0;
		this.MAX_ATTEMPTS = 3;
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
			const storedToken = localStorage.getItem(`snakeToken_${nickname}`);
			let token = storedToken || '';
			let isNewClaim = false;

			// Only attempt claim if no token exists
			if (!storedToken) {
				const claimResponse = await this.handleNicknameClaim(nickname);
				if (!claimResponse.success) return claimResponse;

				token = claimResponse.token;
				isNewClaim = true;
			}

			const saveResponse = await fetch(`${this.API_BASE}/saveScore`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick: nickname, score, token }),
			});

			if (saveResponse.status === 403) {
				return this.handleInvalidToken(nickname);
			}

			if (!saveResponse.ok) throw new Error('Save failed');

			// Store token only after successful save
			if (isNewClaim) {
				localStorage.setItem(`snakeToken_${nickname}`, token);
			}

			return {
				success: true,
				message: 'Score saved successfully',
				token: isNewClaim ? token : undefined,
			};
		} catch (error) {
			console.error('Save error:', error);
			return {
				success: false,
				message: 'Failed to save score',
			};
		}
	}

	async handleNicknameClaim(nickname) {
		try {
			const response = await fetch(`${this.API_BASE}/claimNick`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nick: nickname }),
			});

			if (response.status === 409) {
				return {
					success: false,
					message: 'Nickname already exists. Please enter your token.',
				};
			}

			if (!response.ok) throw new Error('Claim failed');

			const { token } = await response.json();
			return { success: true, token };
		} catch (error) {
			console.error('Claim error:', error);
			return {
				success: false,
				message: 'Failed to claim nickname. Server might be offline',
			};
		}
	}

	async handleInvalidToken(nickname) {
		localStorage.removeItem(`snakeToken_${nickname}`);
		this.tokenAttempts++;

		// Auto-retry claim if server might have been reset
		if (this.tokenAttempts === 1) {
			const claimResult = await this.handleNicknameClaim(nickname);
			if (claimResult.success) {
				return this.saveScore(nickname, score); // Recursive retry
			}
		}

		if (this.tokenAttempts >= this.MAX_ATTEMPTS) {
			return {
				success: false,
				message: 'Too many failed attempts. Score not saved',
			};
		}

		const userToken = prompt(`Invalid token for "${nickname}". Attempt ${this.tokenAttempts}/${this.MAX_ATTEMPTS}\nEnter correct token or leave blank for new claim:`);

		if (!userToken) {
			return this.handleNicknameClaim(nickname); // Initiate new claim
		}

		localStorage.setItem(`snakeToken_${nickname}`, userToken);
		return this.saveScore(nickname, score);
	}

	handleSuccessResponse(nickname, token, response) {
		if (!localStorage.getItem(`snakeToken_${nickname}`)) {
			localStorage.setItem(`snakeToken_${nickname}`, token);
		}
		this.tokenAttempts = 0;
		return response;
	}

	handleSaveError(error) {
		console.error('Save error:', error);
		this.isServerOffline = true;
		return {
			success: false,
			message: 'Failed to save score - server offline',
		};
	}

	handleOfflineState() {
		return {
			success: false,
			message: 'Server offline - score not saved',
		};
	}

	destroy() {
		clearInterval(this.fetchInterval);
	}
}
