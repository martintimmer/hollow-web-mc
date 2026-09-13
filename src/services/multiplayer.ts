export interface RemotePlayer {
  userId: string;
  username: string;
  skinColor: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  slotItem?: number;
}

export type BlockUpdateCallback = (data: { x: number; y: number; z: number; blockId: number; dir?: number; userId: string; username: string }) => void;
export type ChestUpdateCallback = (data: { worldId: string; x: number; y: number; z: number; slots: Array<{ id: number; count: number } | null>; userId: string; username: string }) => void;
export type PlayerMoveCallback = (player: RemotePlayer) => void;
export type PlayerJoinCallback = (player: RemotePlayer) => void;
export type PlayerLeaveCallback = (data: { userId: string; username: string }) => void;
export type ChatCallback = (data: { username: string; text: string; timestamp: string }) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private currentWorldId: string | null = null;
  private currentUserId: string | null = null;
  private currentUsername: string = "Player";
  private currentSkin: string = "#e0913a";
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  private onBlockUpdateCallbacks: Set<BlockUpdateCallback> = new Set();
  private onChestUpdateCallbacks: Set<ChestUpdateCallback> = new Set();
  private onPlayerMoveCallbacks: Set<PlayerMoveCallback> = new Set();
  private onPlayerJoinCallbacks: Set<PlayerJoinCallback> = new Set();
  private onPlayerLeaveCallbacks: Set<PlayerLeaveCallback> = new Set();
  private onChatCallbacks: Set<ChatCallback> = new Set();

  public remotePlayers: Map<string, RemotePlayer> = new Map();

  public connect(worldId: string, userId: string, username: string, skinColor = "#e0913a"): void {
    this.currentWorldId = worldId;
    this.currentUserId = userId;
    this.currentUsername = username;
    this.currentSkin = skinColor;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.joinWorld();
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log("[WS Client] Connected to multiplayer server");
        this.joinWorld();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error("[WS Client] Error handling message:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        console.log("[WS Client] Disconnected from multiplayer server. Reconnecting in 3s...");
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (this.currentWorldId && this.currentUserId) {
            this.connect(this.currentWorldId, this.currentUserId, this.currentUsername, this.currentSkin);
          }
        }, 3000);
      };

      this.ws.onerror = (err) => {
        console.warn("[WS Client] WebSocket connection error:", err);
      };
    } catch (e) {
      this.isConnecting = false;
      console.warn("[WS Client] Failed to create WebSocket connection:", e);
    }
  }

  private joinWorld(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "JOIN_WORLD",
      worldId: this.currentWorldId,
      userId: this.currentUserId,
      username: this.currentUsername,
      skinColor: this.currentSkin
    }));
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case "ROOM_PLAYERS": {
        this.remotePlayers.clear();
        for (const p of msg.players || []) {
          if (p.userId !== this.currentUserId) {
            this.remotePlayers.set(p.userId, p);
            this.onPlayerJoinCallbacks.forEach(cb => cb(p));
          }
        }
        break;
      }
      case "PLAYER_JOINED": {
        if (msg.player && msg.player.userId !== this.currentUserId) {
          this.remotePlayers.set(msg.player.userId, msg.player);
          this.onPlayerJoinCallbacks.forEach(cb => cb(msg.player));
        }
        break;
      }
      case "PLAYER_MOVED": {
        if (msg.userId && msg.userId !== this.currentUserId) {
          const existing = this.remotePlayers.get(msg.userId) || {
            userId: msg.userId,
            username: msg.username || "Player",
            skinColor: msg.skinColor || "#e0913a",
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            pitch: msg.pitch,
            slotItem: msg.slotItem || 1
          };
          existing.x = msg.x;
          existing.y = msg.y;
          existing.z = msg.z;
          existing.yaw = msg.yaw;
          existing.pitch = msg.pitch;
          existing.slotItem = msg.slotItem || existing.slotItem;
          this.remotePlayers.set(msg.userId, existing);
          this.onPlayerMoveCallbacks.forEach(cb => cb(existing));
        }
        break;
      }
      case "PLAYER_LEFT": {
        if (msg.userId) {
          this.remotePlayers.delete(msg.userId);
          this.onPlayerLeaveCallbacks.forEach(cb => cb(msg));
        }
        break;
      }
      case "BLOCK_UPDATE": {
        if (msg.userId !== this.currentUserId) {
          this.onBlockUpdateCallbacks.forEach(cb => cb(msg));
        }
        break;
      }
      case "BLOCK_UPDATE_BATCH": {
        if (msg.userId !== this.currentUserId && Array.isArray(msg.edits)) {
          for (const edit of msg.edits) {
            this.onBlockUpdateCallbacks.forEach(cb =>
              cb({
                x: edit.x,
                y: edit.y,
                z: edit.z,
                blockId: edit.blockId,
                dir: edit.dir,
                userId: msg.userId,
                username: msg.username || "Player"
              })
            );
          }
        }
        break;
      }
      case "CHEST_UPDATE": {
        if (msg.userId !== this.currentUserId) {
          this.onChestUpdateCallbacks.forEach(cb => cb(msg));
        }
        break;
      }
      case "CHAT_MESSAGE": {
        this.onChatCallbacks.forEach(cb => cb(msg));
        break;
      }
    }
  }

  public sendMovement(x: number, y: number, z: number, yaw: number, pitch: number, slotItem = 1): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "PLAYER_MOVE",
      x, y, z, yaw, pitch, slotItem
    }));
  }

  public sendChestUpdate(x: number, y: number, z: number, slots: Array<{ id: number; count: number } | null>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "CHEST_UPDATE",
      worldId: this.currentWorldId,
      x, y, z,
      slots
    }));
  }

  public sendBlockEdit(x: number, y: number, z: number, blockId: number, prevBlockId = 0, action = "edit", dir = 0): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "BLOCK_EDIT",
      worldId: this.currentWorldId,
      x, y, z, blockId, prevBlockId, action, dir
    }));
  }

  public sendBlockEditBatch(edits: Array<{ x: number; y: number; z: number; blockId: number; dir?: number; prevBlockId?: number; action?: string }>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !edits.length) return;
    this.ws.send(JSON.stringify({
      type: "BLOCK_EDIT_BATCH",
      worldId: this.currentWorldId,
      edits
    }));
  }

  public sendChat(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !text) return;
    this.ws.send(JSON.stringify({
      type: "CHAT_MSG",
      text
    }));
  }

  public onBlockUpdate(cb: BlockUpdateCallback): () => void {
    this.onBlockUpdateCallbacks.add(cb);
    return () => this.onBlockUpdateCallbacks.delete(cb);
  }

  public onChestUpdate(cb: ChestUpdateCallback): () => void {
    this.onChestUpdateCallbacks.add(cb);
    return () => this.onChestUpdateCallbacks.delete(cb);
  }

  public onPlayerMove(cb: PlayerMoveCallback): () => void {
    this.onPlayerMoveCallbacks.add(cb);
    return () => this.onPlayerMoveCallbacks.delete(cb);
  }

  public onPlayerJoin(cb: PlayerJoinCallback): () => void {
    this.onPlayerJoinCallbacks.add(cb);
    return () => this.onPlayerJoinCallbacks.delete(cb);
  }

  public onPlayerLeave(cb: PlayerLeaveCallback): () => void {
    this.onPlayerLeaveCallbacks.add(cb);
    return () => this.onPlayerLeaveCallbacks.delete(cb);
  }

  public onChat(cb: ChatCallback): () => void {
    this.onChatCallbacks.add(cb);
    return () => this.onChatCallbacks.delete(cb);
  }

  public disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentWorldId = null;
    this.remotePlayers.clear();
  }

  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export const multiplayer = new MultiplayerClient();
