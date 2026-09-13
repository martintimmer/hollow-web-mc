#!/usr/bin/env python3
import time
import os
import sqlite3
import json
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("WEBMC_DB_PATH", os.path.join(REPO_ROOT, "data", "minecraft.db"))
LOG_FILE = os.path.join(REPO_ROOT, "activity_session.log")
PERF_LOG = os.path.join(REPO_ROOT, "data", "telemetry-perf.jsonl")

def log_event(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    entry = f"[{ts}] {msg}\n"
    print(entry, end="", flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)

def main():
    log_event("=== GAMEPLAY ACTIVITY & PERFORMANCE SESSION MONITOR STARTED ===")
    log_event(f"Monitoring database at: {DB_PATH}")
    log_event(f"Logging session stream to: {LOG_FILE}")
    
    last_audit_id = 0
    last_player_pos = {}
    last_perf_pos = 0

    while True:
        try:
            # 0. Tail client performance telemetry (frame drops, chunk loads, stalls)
            try:
                if os.path.exists(PERF_LOG):
                    size = os.path.getsize(PERF_LOG)
                    if size > last_perf_pos:
                        with open(PERF_LOG, "r", encoding="utf-8") as f:
                            f.seek(last_perf_pos)
                            while True:
                                line = f.readline()
                                if not line:
                                    break
                                try:
                                    rec = json.loads(line)
                                    kind = rec.get("kind", "?")
                                    if kind in ("DROP_START", "DROP_END", "CHUNK_OP_STALL", "EVENT_LOOP_STALL"):
                                        log_event(f"PERF_{kind}: {json.dumps({k: v for k, v in rec.items() if k != 'ctx'}, default=str)[:400]}")
                                    elif kind == "PULSE":
                                        log_event(f"PERF_PULSE: fps={rec.get('fps')} msg_ms={rec.get('frameMsAvg')} chunks={rec.get('ctx', {}).get('chunkCount')} loads={json.dumps(rec.get('chunkLoads', []))[:200]}")
                                except Exception:
                                    pass
                        last_perf_pos = size
            except Exception:
                pass

            if os.path.exists(DB_PATH):
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()

                # 1. Check for new block edits (mines, places, explosions)
                try:
                    cursor.execute("SELECT id, username, world_id, action, block_id, x, y, z, created_at FROM block_edits_log WHERE id > ? ORDER BY id ASC LIMIT 50", (last_audit_id,))
                    rows = cursor.fetchall()
                    for r in rows:
                        last_audit_id = r[0]
                        log_event(f"BLOCK_ACTION [User:{r[1]} World:{r[2]}]: {r[3]} (Block:{r[4]}) at ({r[5]}, {r[6]}, {r[7]})")
                except Exception as e:
                    pass

                # 2. Check player state updates (movement, coordinates, health, inventory)
                try:
                    cursor.execute("SELECT user_id, world_id, pos_x, pos_y, pos_z, yaw, pitch, flying, game_mode, last_online FROM player_state")
                    players = cursor.fetchall()
                    for p in players:
                        uid, wid, x, y, z, yaw, pitch, fly, mode, utime = p
                        prev = last_player_pos.get(uid)
                        current_pos = (round(x, 1), round(y, 1), round(z, 1), round(yaw, 2), bool(fly))
                        if prev != current_pos:
                            last_player_pos[uid] = current_pos
                            mode_str = "Flying" if fly else "Walking/Grounded"
                            log_event(f"PLAYER_MOVE [{uid} in {wid}]: Pos=({x:.1f}, {y:.1f}, {z:.1f}) Yaw={yaw:.1f}° Mode={mode_str} GM={mode} Time={utime}")
                except Exception as e:
                    pass

                conn.close()

        except Exception as e:
            log_event(f"DB_ERROR: {e}")

        time.sleep(1.0)

if __name__ == "__main__":
    main()
