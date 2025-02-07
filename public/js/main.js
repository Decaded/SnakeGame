// Parse version from the current script tag and store it globally.
const version = new URL(import.meta.url).searchParams.get('v');
window.APP_VERSION = version;

// Versioned dynamic import using the global version.
const importVersioned = path => import(`${path}?v=${window.APP_VERSION}`);

// Load all modules concurrently.
const [{ GameEngine }, { LeaderboardManager }, { UIManager }] = await Promise.all([
	importVersioned('./core/game-engine.js'),
	importVersioned('./utils/leaderboard.js'),
	importVersioned('./modules/ui-manager.js'),
]);

// Initialize game components.
const game = new GameEngine();
const leaderboard = new LeaderboardManager();
const ui = new UIManager(game, leaderboard);

// Connect modules: add the UI module to the game engine.
game.addModule(ui);

// Initialize the leaderboard.
leaderboard.init();

// Start the game.
game.start();

// Clean up on unload.
window.addEventListener('beforeunload', () => leaderboard.destroy());
