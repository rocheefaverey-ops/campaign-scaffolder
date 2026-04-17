mergeInto(LibraryManager.library, {
  /**
   * LivewallBridge.jslib — Drop into Assets/Plugins/WebGL/LivewallBridge.jslib
   *
   * C# Usage:
   *   [DllImport("__Internal")] private static extern void SendEventToReact(string eventName, string jsonData);
   *
   *   // Dispatch events to React
   *   SendEventToReact("ready", "{}");
   *   SendEventToReact("start", "{}");
   *   SendEventToReact("end", JSON.stringify(new { score = 150, playTime = 45000 }));
   *   SendEventToReact("sendEvent", JSON.stringify(customData));
   */

  SendEventToReact: function (eventName, jsonData) {
    var eventNameStr = Pointer_stringify(eventName);
    var jsonStr = jsonData ? Pointer_stringify(jsonData) : "{}";

    try {
      var data = JSON.parse(jsonStr);
      console.log("[Livewall Bridge] SendEventToReact:", eventNameStr, data);

      if (window.unityEventMap && typeof window.unityEventMap.dispatchToGame === "function") {
        window.unityEventMap.dispatchToGame(eventNameStr, data);
      } else {
        console.warn("[Livewall Bridge] window.unityEventMap.dispatchToGame not available");
      }
    } catch (error) {
      console.error("[Livewall Bridge] JSON parse error:", error, "Raw:", jsonStr);
    }
  },

  /**
   * Optional: Get boot data sent from React (if needed by Unity)
   * C# Usage:
   *   string bootData = GetBootData();
   *   BootConfig config = JsonUtility.FromJson<BootConfig>(bootData);
   */
  GetBootData: function () {
    if (window.__unityBootData) {
      return allocateUTF8(JSON.stringify(window.__unityBootData));
    }
    return allocateUTF8("{}");
  },

  /**
   * Optional: Log from C# directly to React console (helps debugging)
   * C# Usage:
   *   LogToReact("My debug message from Unity");
   */
  LogToReact: function (message) {
    var messageStr = Pointer_stringify(message);
    console.log("[Unity]", messageStr);
  },

  /**
   * Optional: Get current muted state from React
   * C# Usage:
   *   bool isMuted = IsMuted() == 1;
   */
  IsMuted: function () {
    if (window.__unityBootData && window.__unityBootData.muted) {
      return 1;
    }
    return 0;
  },
});
