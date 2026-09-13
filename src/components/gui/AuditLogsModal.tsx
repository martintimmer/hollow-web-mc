import React from "react";
import type { BlockLogEntry } from "../../services/api";
import { BLOCK_MAP } from "../../game/blocks";

export interface AuditLogsModalProps {
  isOpen: boolean;
  auditLogs: BlockLogEntry[];
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  auditLogs,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-[min(640px,94vw)] max-h-[85vh] mc-window p-4 flex flex-col gap-3 shadow-2xl">
        <div className="flex justify-between items-center pb-2 border-b">
          <h2 className="text-sm font-bold text-[#373737] uppercase tracking-wider">
            📋 Block Modification Audit Ledger
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-0.5 text-xs mc-button font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[55vh] mc-slot p-2 space-y-1 bg-[#1a1a1a]">
          {auditLogs.map(log => (
            <div key={log.seqId} className="p-1.5 text-[10px] font-mono border-b border-[#333333] flex justify-between items-center text-white/90">
              <div>
                <span className="text-[#FFFFA0] font-bold">#{log.seqId}</span> ·{" "}
                <span className="text-[#55FF55]">{log.userId}</span>{" "}
                <span className={log.action === "mine" ? "text-[#e63946]" : "text-[#73b84f]"}>
                  [{log.action.toUpperCase()}]
                </span>{" "}
                {BLOCK_MAP.get(log.newBlockId)?.name || `ID:${log.newBlockId}`} at ({log.x}, {log.y}, {log.z})
              </div>
              <div className="text-[#888888] text-[9px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <div className="text-center py-6 text-xs text-white/50">
              No block edits recorded in this world yet.
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mc-button py-2 text-xs font-bold uppercase"
        >
          Done / Close
        </button>
      </div>
    </div>
  );
};
