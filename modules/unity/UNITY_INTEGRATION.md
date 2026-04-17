# Unity WebGL Integration Guide

## Quick Start

1. **Copy LivewallBridge.jslib** to your Unity project:
   ```
   Assets/Plugins/WebGL/LivewallBridge.jslib
   ```

2. **Create a C# script** to communicate with React:
   ```csharp
   using UnityEngine;
   using System.Runtime.InteropServices;

   public class LivewallManager : MonoBehaviour
   {
     [DllImport("__Internal")]
     private static extern void SendEventToReact(string eventName, string jsonData);

     void Start()
     {
       // Tell React the game is ready
       SendEventToReact("ready", "{}");
     }

     void OnGameStart()
     {
       SendEventToReact("start", "{}");
     }

     void OnGameEnd(int score, int playTime)
     {
       var result = new { score, playTime };
       SendEventToReact("end", JsonUtility.ToJson(result));
     }
   }
   ```

## Event Format

### React → Unity (via SendMessage)

React calls `SendMessage(gameObjectName, methodName, jsonData)`:

```json
{
  "environment": "production",
  "muted": false,
  "translations": {
    "PLAY": "Play",
    "SCORE": "Score"
  },
  "custom": {
    "lives": 3,
    "difficulty": "hard"
  }
}
```

### Unity → React (via SendEventToReact)

**ready** — Game is initialized and ready
```json
{}
```

**start** — Game play has started
```json
{}
```

**end** — Game has ended (REQUIRED)
```json
{
  "score": 150,
  "playTime": 45000,
  "collectedTokens": 5
}
```

**sendEvent** — Custom event (analytics, tracking, etc.)
```json
{
  "eventType": "level_complete",
  "level": 3,
  "time": 25000
}
```

## Build Requirements

### WebGL Build Settings

1. **Player Settings** → **WebGL**:
   - Compression Format: `Brotli` (for faster loading)
   - Data Caching: Enabled
   - Name of data build: `game.data`

2. **Build Output**:
   ```
   Build/
     game.data
     game.framework.js.br
     game.wasm.br
     game.json
     game.symbols.json
     UnityLoader.js    ← Critical
   ```

3. **StreamingAssets** (optional):
   - Place any game assets in `StreamingAssets/`
   - Served at `{CDN_URL}/StreamingAssets/`

### Environment Variables (set by React)

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_UNITY_BASE_URL` | `https://lw-game-cdn.lwcf.nl` | CDN root for build files |
| `NEXT_PUBLIC_UNITY_GAME_NAME` | `GameManager` | GameObject name to SendMessage to |
| `NEXT_PUBLIC_UNITY_VERSION` | `V2` | Build version identifier |
| `NEXT_PUBLIC_UNITY_COMPRESSION` | `br` | Compression format (`br`, `gzip`, `none`) |
| `NEXT_PUBLIC_UNITY_NO_CACHE` | `true` | Disable caching (dev) |
| `NEXT_PUBLIC_UNITY_MIN_DPR` | `1.5` | Minimum device pixel ratio |
| `NEXT_PUBLIC_UNITY_MAX_DPR` | `3` | Maximum device pixel ratio |

## End Result Format (CRITICAL)

The `end` event MUST include ALL fields defined in `games/{gameId}/game.json`:

Example from game registry:
```json
{
  "events": {
    "end": {
      "score": "number",
      "playTime": "number",
      "distance": "number",
      "collectedTokens": "number"
    }
  }
}
```

Your Unity `end` event MUST include all 4 fields:
```csharp
var result = new {
  score = 150,
  playTime = 45000,
  distance = 500,
  collectedTokens = 12
};
SendEventToReact("end", JsonUtility.ToJson(result));
```

## Testing

1. Open DevTools → Console
2. Look for `[Livewall Bridge]` logs
3. Verify events are dispatched: `[Unity Event] end: { score: 150, ... }`
4. Check that game result is stored in GameContext
