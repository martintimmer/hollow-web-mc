/**
 * @file src/game/vehicles/wheelKit.ts
 * Parameterized wheel builder — 4 SA-flavored presets sharing one tire/hub
 * material set. makeWheelBuilder(mats, style) returns a (x, z, name) => Group
 * factory each car file calls at its own track/wheelbase positions.
 *
 * Every wheel gets: tire w/ blocky tread (visible rotation read, not a smooth
 * cylinder) + a style-specific rim. Open-spoke styles (alloy/wire) also show a
 * brake rotor behind the spokes; alloy adds a colored caliper accent.
 */

import * as THREE from "three";
import type { CarMaterials } from "./carMaterials";

export type WheelStyle = "chromeDish" | "alloy5spoke" | "wireSpoke" | "povertyCap";

type WheelFn = (x: number, z: number, name: string) => THREE.Group;

const rotorMat = new THREE.MeshStandardMaterial({ color: 0x8a8d93, metalness: 0.6, roughness: 0.45 });
const caliperMat = new THREE.MeshStandardMaterial({ color: 0xd4232b, roughness: 0.4, metalness: 0.2 });

/** shared tire w/ blocky tread + a static (non-spinning-looking, since it's still a wheel child) rotor disc */
function baseWheel(mats: CarMaterials, radius: number, withRotor: boolean): THREE.Group {
  const w = new THREE.Group();
  w.rotation.order = "YXZ";
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.30, 20), mats.tire);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  w.add(tire);
  // blocky tread — small radial blocks around the contact face so rotation reads clearly, not a smooth drum
  const blockCount = 16;
  for (let i = 0; i < blockCount; i++) {
    const ang = (i / blockCount) * Math.PI * 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.31, radius * 0.13, 0.04), mats.tire);
    block.position.set(0, Math.cos(ang) * (radius - 0.015), Math.sin(ang) * (radius - 0.015));
    block.rotation.x = ang;
    w.add(block);
  }
  if (withRotor) {
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, 0.05, 20), rotorMat);
    rotor.rotation.z = Math.PI / 2;
    w.add(rotor);
  }
  return w;
}

/** classic chrome dish — deep concave rim + lug nuts (solid cover, no visible rotor) */
function chromeDish(mats: CarMaterials, radius: number): WheelFn {
  return (x, z, name) => {
    const w = baseWheel(mats, radius, false);
    w.name = name;
    // dished profile: an outer lip ring + a recessed inner disc (offset along the axle)
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.05, 14), mats.hub);
    lip.rotation.z = Math.PI / 2;
    lip.position.x = 0.13;
    w.add(lip);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.26, 14), mats.hub);
    dish.rotation.z = Math.PI / 2;
    w.add(dish);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8), mats.hubDark);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.hub);
    cap.rotation.z = -Math.PI / 2;
    cap.position.x = 0.165;
    w.add(cap);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), mats.hubDark);
      lug.position.set(0.14, Math.cos(ang) * 0.11, Math.sin(ang) * 0.11);
      w.add(lug);
    }
    const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 16), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 }));
    sidewall.rotation.y = Math.PI / 2;
    sidewall.position.set(0.14, 0, 0);
    w.add(sidewall.clone());
    const sidewall2 = sidewall.clone();
    sidewall2.position.set(-0.14, 0, 0);
    w.add(sidewall2);
    w.position.set(x, radius, z);
    return w;
  };
}

/** 5-spoke sport alloy — open flat spokes + visible rotor & caliper accent (Cheetah/Sabre) */
function alloy5spoke(mats: CarMaterials, radius: number): WheelFn {
  return (x, z, name) => {
    const w = baseWheel(mats, radius, true);
    w.name = name;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 10), mats.hubDark);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.14, 0.045), mats.hub);
      spoke.position.set(0, Math.cos(ang) * 0.13, Math.sin(ang) * 0.13);
      spoke.rotation.x = ang;
      w.add(spoke);
    }
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 16), mats.hub);
    outerRing.rotation.y = Math.PI / 2;
    w.add(outerRing);
    // brake caliper accent glimpsed through the spokes (static angle, doesn't need to counter-spin for a mockup)
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.09), caliperMat);
    caliper.position.set(0, radius * 0.4, radius * 0.3);
    w.add(caliper);
    w.position.set(x, radius, z);
    return w;
  };
}

/** wire spokes + chrome knock-off spinner — lowrider signature look */
function wireSpoke(mats: CarMaterials, radius: number): WheelFn {
  return (x, z, name) => {
    const w = baseWheel(mats, radius, true);
    w.name = name;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.33, 10), mats.hub);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    const spokeCount = 14;
    for (let i = 0; i < spokeCount; i++) {
      const ang = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 4), mats.hub);
      spoke.position.set(0, Math.cos(ang) * 0.12, Math.sin(ang) * 0.12);
      spoke.rotation.x = ang;
      w.add(spoke);
    }
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 20), mats.hub);
    rimRing.rotation.y = Math.PI / 2;
    w.add(rimRing);
    // chrome knock-off spinner cap (protrudes outward, classic lowrider hub)
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), mats.hub);
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.set(0.19, 0, 0);
    w.add(spinner);
    const spinner2 = spinner.clone();
    spinner2.rotation.z = Math.PI / 2;
    spinner2.position.set(-0.19, 0, 0);
    w.add(spinner2);
    w.position.set(x, radius, z);
    return w;
  };
}

/** steel poverty cap — plain flat disc, fully covers the hub (no lugs, no rotor visible) */
function povertyCap(mats: CarMaterials, radius: number): WheelFn {
  const capMat = new THREE.MeshStandardMaterial({ color: 0xaeb2ba, metalness: 0.55, roughness: 0.5 });
  return (x, z, name) => {
    const w = baseWheel(mats, radius, false);
    w.name = name;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 16), capMat);
    cap.rotation.z = Math.PI / 2;
    w.add(cap);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    dome.rotation.z = -Math.PI / 2;
    dome.position.set(0.16, 0, 0);
    w.add(dome);
    const dome2 = dome.clone();
    dome2.rotation.z = Math.PI / 2;
    dome2.position.set(-0.16, 0, 0);
    w.add(dome2);
    w.position.set(x, radius, z);
    return w;
  };
}

const BUILDERS: Record<WheelStyle, (mats: CarMaterials, radius: number) => WheelFn> = {
  chromeDish, alloy5spoke, wireSpoke, povertyCap
};

/** Returns a (x, z, name) => Group wheel factory for the given style + tire radius. */
export function makeWheelBuilder(mats: CarMaterials, style: WheelStyle, radius = 0.36): WheelFn {
  return BUILDERS[style](mats, radius);
}
