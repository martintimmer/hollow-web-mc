import React from "react";

export interface TitleScreenModalProps {
  isOpen: boolean;
  authUsername: string;
  setAuthUsername: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const TitleScreenModal: React.FC<TitleScreenModalProps> = ({
  isOpen,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authError,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10141a]/95 p-4 backdrop-blur-sm select-none">
      <div className="w-[min(440px,94vw)] mc-window p-6 flex flex-col items-center gap-4 shadow-2xl">
        {/* Title Logo */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFFFA0] mc-text-shadow tracking-wider uppercase">
            Hollowpine
          </h1>
          <div className="text-sm font-bold text-white tracking-widest uppercase mc-text-shadow mt-0.5">
            Minecraft Web Edition
          </div>
        </div>

        {/* Account Login Header */}
        <div className="w-full text-center pb-1 border-b border-[#555555]/30">
          <span className="text-xs font-bold text-[#373737] uppercase tracking-wider">Account Sign In</span>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="w-full space-y-3">
          <div>
            <label className="text-[11px] font-bold text-[#373737] block mb-1">Username:</label>
            <input
              type="text"
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full mc-input px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#373737] block mb-1">Password / Passcode:</label>
            <input
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full mc-input px-3 py-2 text-xs font-mono"
            />
          </div>

          {authError && (
            <div className="text-[11px] font-bold text-[#e63946] bg-red-950/30 p-2 border border-red-800 text-center">
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="w-full mc-button py-2.5 text-xs font-bold uppercase tracking-wider !bg-[#73b84f] !text-black hover:!bg-[#8fcf6a] mt-2"
          >
            Log In & Play
          </button>
        </form>

        <div className="text-[10px] text-[#555555] text-center">
          All block modifications, coordinates, and custom worlds are securely stored in the server database.
        </div>
      </div>
    </div>
  );
};
