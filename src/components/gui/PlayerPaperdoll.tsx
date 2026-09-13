import React from "react";
import type { EquippedArmorState } from "./InventoryModal";

interface PlayerPaperdollProps {
  equippedArmor: EquippedArmorState;
  skinColor?: string;
}

export const PlayerPaperdoll: React.FC<PlayerPaperdollProps> = ({
  equippedArmor,
  skinColor = "#d69c73"
}) => {
  const hasHelmet = !!equippedArmor.helmet;
  const hasChest = !!equippedArmor.chestplate;
  const hasLegs = !!equippedArmor.leggings;
  const hasBoots = !!equippedArmor.boots;

  return (
    <div className="relative w-24 h-36 flex items-center justify-center select-none pointer-events-none image-pixelated">
      <svg
        viewBox="0 0 48 72"
        className="w-full h-full drop-shadow-md"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Shadow Under Feet */}
        <ellipse cx="24" cy="69" rx="14" ry="3" fill="rgba(0,0,0,0.35)" />

        {/* --- LEGS --- */}
        {/* Left Leg */}
        <rect x="17" y="44" width="6" height="20" fill={hasLegs ? "#33ebcb" : "#2e3b82"} stroke="#111" strokeWidth="0.5" />
        {/* Right Leg */}
        <rect x="25" y="44" width="6" height="20" fill={hasLegs ? "#33ebcb" : "#2e3b82"} stroke="#111" strokeWidth="0.5" />
        
        {/* Boots Layer */}
        {hasBoots && (
          <>
            <rect x="16.5" y="56" width="7" height="9" fill="#29c2a7" stroke="#0a594c" strokeWidth="0.5" />
            <rect x="24.5" y="56" width="7" height="9" fill="#29c2a7" stroke="#0a594c" strokeWidth="0.5" />
          </>
        )}

        {/* --- BODY / TORSO --- */}
        <rect x="16" y="24" width="16" height="20" fill={hasChest ? "#33ebcb" : "#00a8a8"} stroke="#111" strokeWidth="0.5" />
        {/* Belt detail */}
        <rect x="16" y="42" width="16" height="2" fill="#555" />
        {/* Chestplate Armor Detail */}
        {hasChest && (
          <>
            <rect x="17" y="25" width="14" height="16" fill="#4ff2d4" />
            <rect x="20" y="28" width="8" height="10" fill="#26a890" />
          </>
        )}

        {/* --- ARMS --- */}
        {/* Left Arm */}
        <rect x="10" y="24" width="6" height="18" fill={hasChest ? "#33ebcb" : "#00a8a8"} stroke="#111" strokeWidth="0.5" />
        <rect x="10" y="38" width="6" height="5" fill={skinColor} />
        {/* Right Arm */}
        <rect x="32" y="24" width="6" height="18" fill={hasChest ? "#33ebcb" : "#00a8a8"} stroke="#111" strokeWidth="0.5" />
        <rect x="32" y="38" width="6" height="5" fill={skinColor} />

        {/* --- HEAD --- */}
        <rect x="16" y="8" width="16" height="16" fill={skinColor} stroke="#111" strokeWidth="0.5" />
        {/* Hair */}
        <rect x="16" y="8" width="16" height="4" fill="#4a2e18" />
        <rect x="16" y="8" width="3" height="8" fill="#4a2e18" />
        <rect x="29" y="8" width="3" height="8" fill="#4a2e18" />
        {/* Eyes (White + Indigo Pupil) */}
        <rect x="19" y="15" width="3" height="2" fill="#fff" />
        <rect x="20" y="15" width="2" height="2" fill="#2d2db4" />
        <rect x="26" y="15" width="3" height="2" fill="#fff" />
        <rect x="26" y="15" width="2" height="2" fill="#2d2db4" />
        {/* Nose / Mouth detail */}
        <rect x="23" y="18" width="2" height="1" fill="#b07049" />
        <rect x="22" y="20" width="4" height="1.5" fill="#804a29" />

        {/* Helmet Armor Layer */}
        {hasHelmet && (
          <>
            <rect x="15" y="6" width="18" height="10" fill="#33ebcb" stroke="#0a594c" strokeWidth="0.5" />
            <rect x="15" y="14" width="4" height="6" fill="#29c2a7" />
            <rect x="29" y="14" width="4" height="6" fill="#29c2a7" />
            <rect x="21" y="6" width="6" height="4" fill="#6df7df" />
          </>
        )}
      </svg>
    </div>
  );
};
