# Snake Game - Backend

Node.js server handling game logic and leaderboard storage.

## Features

- REST API endpoints
- Token-based authentication
- Rate limiting
- File-based storage with [NyaDB](https://github.com/Decaded/NyaDB)

## API Reference

### Save Score

```text
POST /SnakeGame/saveScore Content-Type: application/json
{
   "nick": "string", // Player nickname (3-16 chars)
   "score": number, // Player score (0-9,999,999)
   "token": "string" // Player token (4-6 chars)
}
```

```text
Response:
{
   "success": boolean,
   "message": "string",
   "token": "string" // Only for new claims
}
```

### Get Top Players

```text
GET /SnakeGame/getTopPlayers
```

```text
Response:
[
   {
      "nick": "string", // Player nickname
      "score": number // Player score
   }
]
```

### Claim Nickname

```text
POST /SnakeGame/claimNick Content-Type: application/json
{
   "nick": "string" // Desired nickname (3-16 chars)
}
```

```text
Response:
{
   "success": boolean,
   "token": "string", // New token for nickname
   "message": "string"
}
```

## Setup

1. Install dependencies: `npm install`
2. Configure .env file (see [.env.example](.env.example))
3. Start server: `node run start`

## License

MIT License. See [LICENSE](LICENSE.md).

## Support

Create GitHub Issues for assistance.

## Contributing

PRs welcome. Follow standard workflow.

---

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L3L02XV6J)
