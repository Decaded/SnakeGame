// Parse version from current script tag
const version = new URL(import.meta.url).searchParams.get('v');

// Version-aware config loader
const loadConfig = async () => {
	const { Config } = await import(`./config.js?v=${version}`);
	return Config;
};

// Versioned dynamic imports
const importVersioned = path => import(`${path}?v=${version}`);

// Main flow
const Config = await loadConfig();

const { GameEngine } = await importVersioned('./core/game-engine.js');
const { LeaderboardManager } = await importVersioned('./utils/leaderboard.js');
const { UIManager } = await importVersioned('./modules/ui-manager.js');

const game = new GameEngine();
const leaderboard = new LeaderboardManager();
const ui = new UIManager(game, leaderboard);

// Initialize core modules
game.addModule(ui);

// Initialize leaderboard
leaderboard.init();

// Start the game
game.start();

window.addEventListener('beforeunload', () => leaderboard.destroy());
