# Snake Game

A classic Snake Game built with HTML, CSS, and JavaScript. The game features a leaderboard that stores the top 10 players' scores using a lightweight file-based database ([NyaDB](https://github.com/Decaded/NyaDB)).


## Features

- **Classic Snake Gameplay**: Move the snake around the grid, eat food to grow, and avoid collisions with walls or yourself.
- **Leaderboard**: Track the top 10 players' scores.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: [NyaDB](https://github.com/Decaded/NyaDB) (file-based database)
- **Deployment**: Hosted on [Decaded.dev](https://decaded.dev)

## How to Play

1. Use the **arrow keys** to control the snake:
   - **Up Arrow**: Move up
   - **Down Arrow**: Move down
   - **Left Arrow**: Move left
   - **Right Arrow**: Move right
2. Eat the **red food** to grow the snake and increase your score.
3. Avoid colliding with the walls or yourself, or the game will end.
4. When the game ends, enter your nickname to save your score to the leaderboard.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/snake-game.git
   cd snake-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

4. **Open the game**:
   - Open your browser and navigate to `http://localhost:3000` (or the port specified in your `.env` file).

## Project Structure

```
snake-game/
├── public/              # Static files (HTML, CSS, JS)
│   ├── index.html       # Main game interface
│   ├── snake.js         # Game logic and API calls
├── server.js            # Backend server and API endpoints
├── package.json         # Node.js dependencies and scripts
├── README.md            # Project documentation
├── .env                 # Environment variables (e.g., PORT)
```

## API Endpoints

- **Save Score**: `POST /saveScore`
  - Request Body: `{ nick: string, score: number }`
  - Response: `{ success: boolean, message: string }`

- **Get Top Players**: `GET /getTopPlayers`
  - Response: `Array<{ nick: string, score: number }>`

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and push to your fork.
4. Submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

---

## Like what I do?

If you find this project helpful or fun to use, consider supporting me on Ko-fi! Your support helps me keep creating and improving.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L3L02XV6J)
