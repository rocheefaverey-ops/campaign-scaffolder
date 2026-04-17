# Example Unity WebGL Project

## Project Structure

```
MyGame/
├── Assets/
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── LivewallBridge.jslib          ← Copy from Livewall scaffolder
│   ├── Scripts/
│   │   ├── LivewallManager.cs               ← Main integration
│   │   ├── GameManager.cs                   ← Game logic
│   │   └── BootData.cs                      ← Data models
│   ├── Scenes/
│   │   └── Game.unity
│   └── Resources/
│       └── Prefabs/
└── ProjectSettings/
```

## Key C# Scripts

### 1. LivewallManager.cs — Integration Layer

```csharp
using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class LivewallManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SendEventToReact(string eventName, string jsonData);

    [DllImport("__Internal")]
    private static extern string GetBootData();

    [DllImport("__Internal")]
    private static extern int IsMuted();

    [DllImport("__Internal")]
    private static extern void LogToReact(string message);

    public static LivewallManager Instance { get; private set; }

    private BootConfig bootConfig;

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Start()
    {
        // Load boot data sent from React
        string bootDataJson = GetBootData();
        bootConfig = JsonUtility.FromJson<BootConfig>(bootDataJson);

        LogToReact($"Game initialized with config: {bootDataJson}");

        // Apply settings from React
        AudioListener.volume = IsMuted() == 1 ? 0f : 1f;

        // Notify React that game is ready
        SendEventToReact("ready", "{}");

        // Start game logic
        GetComponent<GameManager>().Initialize(bootConfig);
    }

    /// <summary>
    /// Call this when the game ends to send result back to React
    /// </summary>
    public void EndGame(int score, int playTime, int distance, int collectedTokens)
    {
        var result = new GameResult
        {
            score = score,
            playTime = playTime,
            distance = distance,
            collectedTokens = collectedTokens
        };

        string resultJson = JsonUtility.ToJson(result);
        LogToReact($"Game ended: {resultJson}");
        SendEventToReact("end", resultJson);
    }

    public void SendCustomEvent(string eventType, Dictionary<string, object> data)
    {
        var customEvent = new { eventType, data };
        SendEventToReact("sendEvent", JsonUtility.ToJson(customEvent));
    }
}

[System.Serializable]
public class BootConfig
{
    public string environment;
    public bool muted;
    public TranslationMap translations;
    public CustomDataMap custom;
}

[System.Serializable]
public class TranslationMap
{
    public string PLAY;
    public string SCORE;
    public string GAME_OVER;
    // ... more keys as needed
}

[System.Serializable]
public class CustomDataMap
{
    public int lives;
    public string difficulty;
    public int level;
}

[System.Serializable]
public class GameResult
{
    public int score;
    public int playTime;
    public int distance;
    public int collectedTokens;
}
```

### 2. GameManager.cs — Game Logic

```csharp
using UnityEngine;

public class GameManager : MonoBehaviour
{
    private BootConfig config;
    private int score = 0;
    private int playTime = 0;
    private int distance = 0;
    private int collectedTokens = 0;
    private bool gameActive = false;

    public void Initialize(BootConfig bootConfig)
    {
        config = bootConfig;
        gameActive = true;

        // Apply custom data from React
        int livesCount = config.custom.lives;
        string difficulty = config.custom.difficulty;

        Debug.Log($"Game starting with {livesCount} lives on {difficulty} difficulty");
        Debug.Log($"Translations: {config.translations.PLAY}");

        // Setup game based on config
        SetupGame(livesCount, difficulty);

        // Notify React that game has started
        LivewallManager.Instance.SendCustomEvent("game_start", new System.Collections.Generic.Dictionary<string, object>
        {
            { "difficulty", difficulty },
            { "lives", livesCount }
        });
    }

    private void SetupGame(int lives, string difficulty)
    {
        // Game-specific setup
        // ...
    }

    void Update()
    {
        if (!gameActive) return;

        playTime += (int)(Time.deltaTime * 1000); // milliseconds

        // Game logic...
        if (Input.GetKeyDown(KeyCode.Space))
        {
            CollectToken();
        }

        if (Input.GetKeyDown(KeyCode.E))
        {
            EndGameEarly();
        }
    }

    public void CollectToken()
    {
        collectedTokens++;
        score += 10;
        Debug.Log($"Token collected! Score: {score}");
    }

    public void MoveDistance(int amount)
    {
        distance += amount;
    }

    public void EndGameEarly()
    {
        gameActive = false;
        LivewallManager.Instance.EndGame(score, playTime, distance, collectedTokens);
    }

    void OnGUI()
    {
        if (!gameActive) return;

        GUILayout.BeginArea(new Rect(10, 10, 300, 100));
        GUILayout.Label($"Score: {score}");
        GUILayout.Label($"Time: {playTime / 1000}s");
        GUILayout.Label($"Distance: {distance}m");
        GUILayout.Label($"Tokens: {collectedTokens}");
        if (GUILayout.Button("End Game"))
        {
            EndGameEarly();
        }
        GUILayout.EndArea();
    }
}
```

### 3. Setup Instructions

1. **Create new Unity Project** (2022 LTS or newer recommended)

2. **Add WebGL build support** if not already present

3. **Copy files:**
   - Copy `LivewallBridge.jslib` to `Assets/Plugins/WebGL/`
   - Create `Scripts/LivewallManager.cs` from code above
   - Create `Scripts/GameManager.cs` from code above

4. **Setup scene:**
   - Create new scene: `Assets/Scenes/Game.unity`
   - Create empty GameObject: `GameManager`
   - Attach both scripts to the GameObject
   - Set it as the game scene in Build Settings

5. **Build settings:**
   - Go to: File → Build Settings
   - Select WebGL platform
   - Add Scene: `Assets/Scenes/Game.unity`
   - Player Settings → WebGL:
     - Compression Format: Brotli
     - Data Caching: Enabled
     - Data Build Name: `game`
   - Build to: `Build/` folder

6. **Test locally:**
   - Run scaffolder with mock CAPE
   - Upload build files to CDN
   - Game should initialize with React data

## Event Flow Diagram

```
Game starts
    ↓
LivewallManager.Start()
    ↓
GetBootData() from React
    ↓
GameManager.Initialize(config)
    ↓
SendEventToReact("ready", "{}")  ← React shows game canvas
    ↓
User plays...
    ↓
GameManager.EndGameEarly()
    ↓
SendEventToReact("end", resultJson)
    ↓
React navigates to result page
```

## Debug Checklist

- [ ] `LivewallBridge.jslib` is in `Assets/Plugins/WebGL/`
- [ ] `LivewallManager` and `GameManager` scripts attached to same GameObject
- [ ] Scene is in Build Settings at index 0
- [ ] WebGL platform selected in Build Settings
- [ ] Build output has `UnityLoader.js`
- [ ] Console shows `[Livewall Bridge]` logs
- [ ] Game sends "ready" event
- [ ] Game sends "end" event with all result fields
