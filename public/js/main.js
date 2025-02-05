import { GameEngine } from './core/game-engine.js';
import { LeaderboardManager } from './utils/leaderboard.js';
import { UIManager } from './modules/ui-manager.js';

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
