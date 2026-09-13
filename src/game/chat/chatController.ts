import type { Dispatch, RefObject, SetStateAction } from "react";
import { multiplayer } from "../../services/multiplayer";
import type { GameState } from "../state/gameState";

export interface ChatMessage {
  username: string;
  text: string;
  timestamp: string;
}

export interface ChatControllerDeps {
  stateRef: RefObject<GameState>;
  showToast: (msg: string) => void;
  setChatInput: (v: string) => void;
  setChatOpen: (v: boolean) => void;
  setActive: (v: boolean) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setCreative: (v: boolean) => void;
  chatTextRef: RefObject<string>;
  chatInputRef: RefObject<HTMLInputElement | null>;
  chatCancelRef: RefObject<boolean>;
  onSetWeather: (w: "clear" | "cloudy" | "overcast") => void;
}

export function createChatController(d: ChatControllerDeps) {
  const {
    stateRef, showToast, setChatInput, setChatOpen, setActive,
    setChatMessages, setCreative, chatTextRef, chatInputRef,
    chatCancelRef, onSetWeather: handleSetWeather,
  } = d;

  const openChat = (initialText: string = "") => {
    const s = stateRef.current;
    if (s.dead || s.chatOpen) return;
    s.chatOpen = true;
    s.active = false;
    s.steering = false;
    s.keys = {};
    setChatInput(initialText);
    chatTextRef.current = initialText;
    setChatOpen(true);
    setActive(false);
    document.exitPointerLock?.();
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.value = initialText;
      }
    }, 30);
  };

  const handleChatCommand = (cmdText: string) => {
    const s = stateRef.current;
    const parts = cmdText.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = (parts[1] || "").toLowerCase();
    const arg2 = (parts[2] || "").toLowerCase();

    // /spawn — teleport back to the world spawn point
    if (cmd === "/spawn") {
      stateRef.current.teleportSpawnFn?.();
      showToast("✨ Teleported to spawn");
      setChatMessages(prev => [
        ...prev.slice(-40),
        { username: "System", text: "Teleported to spawn", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return true;
    }

    // /gamemode <survival | creative | adventure | spectator | 0|1|2|3 | s|c|a|sp>
    if (cmd === "/gamemode" || cmd === "/gm" || cmd === "/gms" || cmd === "/gmc" || cmd === "/gma" || cmd === "/gmsp") {
      let targetMode = arg1;
      if (cmd === "/gms") targetMode = "survival";
      else if (cmd === "/gmc") targetMode = "creative";
      else if (cmd === "/gma") targetMode = "adventure";
      else if (cmd === "/gmsp") targetMode = "spectator";

      if (targetMode === "0" || targetMode === "survival" || targetMode === "s") {
        s.creative = false;
        s.player.fly = false;
        setCreative(false);
        showToast("Set own game mode to Survival Mode");
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "System", text: "Set own game mode to Survival Mode", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        return true;
      } else if (targetMode === "1" || targetMode === "creative" || targetMode === "c") {
        s.creative = true;
        setCreative(true);
        showToast("Set own game mode to Creative Mode");
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "System", text: "Set own game mode to Creative Mode", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        return true;
      } else if (targetMode === "2" || targetMode === "adventure" || targetMode === "a") {
        s.creative = false;
        s.player.fly = false;
        setCreative(false);
        showToast("Set own game mode to Adventure Mode");
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "System", text: "Set own game mode to Adventure Mode", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        return true;
      } else if (targetMode === "3" || targetMode === "spectator" || targetMode === "sp") {
        s.creative = true;
        s.player.fly = true;
        setCreative(true);
        showToast("Set own game mode to Spectator Mode");
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "System", text: "Set own game mode to Spectator Mode", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        return true;
      } else {
        showToast("Usage: /gamemode <survival|creative|adventure|spectator>");
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "System", text: "Usage: /gamemode <survival | creative | adventure | spectator>", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        return true;
      }
    }

    // /weather <clear|cloudy|overcast>
    if (cmd === "/weather") {
      const wm = (stateRef.current as any).weatherMachine;
      if (arg1 === "clear" || arg1 === "sun") {
        handleSetWeather("clear");
        wm?.force("clear");
        return true;
      } else if (arg1 === "cloudy" || arg1 === "clouds") {
        handleSetWeather("cloudy");
        wm?.force("cloudy");
        return true;
      } else if (arg1 === "rain" || arg1 === "overcast") {
        handleSetWeather("overcast");
        wm?.force("rain");
        return true;
      } else if (arg1 === "snow") {
        handleSetWeather("overcast");
        wm?.force("snow");
        return true;
      } else if (arg1 === "thunder" || arg1 === "storm") {
        handleSetWeather("overcast");
        wm?.force("thunder");
        return true;
      } else {
        showToast("Usage: /weather <clear|cloudy|rain|snow|thunder>");
        return true;
      }
    }

    // /time set <day|night|noon|midnight>
    if (cmd === "/time" && arg1 === "set") {
      if (arg2 === "day" || arg2 === "noon") {
        s.time = 6000;
        showToast("Set time to 6000 (Day)");
      } else if (arg2 === "night" || arg2 === "midnight") {
        s.time = 18000;
        showToast("Set time to 18000 (Night)");
      } else if (!isNaN(Number(arg2))) {
        s.time = Number(arg2);
        showToast(`Set time to ${s.time}`);
      }
      setChatMessages(prev => [
        ...prev.slice(-40),
        { username: "System", text: `Set time to ${s.time}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return true;
    }

    // /time add <ticks> — advance the clock, rolling over into a new day
    if (cmd === "/time" && arg1 === "add" && !isNaN(Number(arg2))) {
      const nt = (s.time + Number(arg2)) % 24000;
      if (nt < s.time) s.dayCount = (s.dayCount || 0) + 1;
      s.time = nt;
      showToast(`Set time to ${s.time}`);
      setChatMessages(prev => [
        ...prev.slice(-40),
        { username: "System", text: `Set time to ${s.time}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return true;
    }

    // /time query — report day + daytime
    if (cmd === "/time" && (arg1 === "query" || arg1 === "get" || arg1 === "")) {
      const msg = `Day ${s.dayCount || 0}, time ${Math.floor(s.time)}`;
      showToast(msg);
      setChatMessages(prev => [
        ...prev.slice(-40),
        { username: "System", text: msg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return true;
    }

    // /regenerate — regenerate the surrounding area with the current terrain
    // generator (new village layouts/structures). Player block edits are kept:
    // stored edits are re-applied on top of freshly generated chunks.
    if (cmd === "/regenerate" || cmd === "/regen") {
      s.regenerateCurrentArea?.();
      showToast("🏰 Regenerated surrounding area (new structures)");
      setChatMessages(prev => [
        ...prev.slice(-40),
        { username: "System", text: "Regenerated surrounding area with current terrain generator — block edits kept.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return true;
    }

    return false;
  };

  const closeChat = (send: boolean) => {
    const s = stateRef.current;
    if (!s.chatOpen) return;
    const text = chatTextRef.current.trim().slice(0, 150);
    s.chatOpen = false;
    setChatOpen(false);
    setChatInput("");
    chatTextRef.current = "";
    chatCancelRef.current = false;
    if (chatInputRef.current) chatInputRef.current.blur();
    if (send && text) {
      if (text.startsWith("/")) {
        const handled = handleChatCommand(text);
        if (!handled) {
          showToast(`Unknown command: ${text}`);
          setChatMessages(prev => [
            ...prev.slice(-40),
            { username: "System", text: `Unknown command: ${text}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
        }
      } else if (multiplayer.isConnected()) {
        multiplayer.sendChat(text);
      } else {
        setChatMessages(prev => [
          ...prev.slice(-40),
          { username: "You", text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    }
    if (!s.dead) {
      s.active = true;
      s.steering = true;
      setActive(true);
    }
  };

  return { openChat, handleChatCommand, closeChat };
}
