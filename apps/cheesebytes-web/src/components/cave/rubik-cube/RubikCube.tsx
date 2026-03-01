/**
 * RubikCube.tsx
 *
 * Interactive NxNxN Rubik's Cube in Three.js.
 *
 * Visual: dark plastic body + separate sticker meshes (PlaneGeometry)
 * on each exposed face, slightly raised above the surface.
 *
 * Controls (click the canvas to focus):
 *   Arrow L/R    – orbit to adjacent corner view (discrete snap + animation)
 *   Arrow U/D    – change elevation between 3 levels
 *   Scroll       – zoom
 *   F B R L U D  – face move (clockwise) · +Shift → counter-clockwise
 *   Space        – toggle flat cross (stickers peel off) ↔ 3-D
 */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// ── Visual constants ──────────────────────────────────────────────────────────

const CUBIE_SIZE = 0.92; // plastic size
const STICKER_SZ = 0.74; // sticker is slightly smaller → dark gap
const STICKER_LIFT = CUBIE_SIZE / 2 + 0.004; // sit above the plastic face
const GAP = 0.9; // centre-to-centre distance between cubies
const MOVE_DURATION = 0.28; // seconds per face rotate

const CUBIE_ROUND_RADIUS = 0.085;

// Camera (slightly telephoto, subtle perspective)
const FOV = 20;
const CAMERA_BIAS_RIGHT = 0.3;
const CAMERA_BIAS_UP = 0.3;

// Requested scheme:
// front=yellow, back=white, up=blue, down=green, right=orange, left=red
const STICKER_COLOR: Record<string, number> = {
  U: 0x0033cc,
  D: 0x00aa00,
  F: 0xffff00,
  B: 0xdddddd,
  R: 0xff6600,
  L: 0xcc0000,
};

// ── Face definitions (axis / direction / slice index) ─────────────────────────

function buildFaceDef(size: number) {
  const max = size - 1;
  return {
    F: { axis: new THREE.Vector3(0, 0, 1), sign: -1, slice: max },
    B: { axis: new THREE.Vector3(0, 0, 1), sign: 1, slice: 0 },
    R: { axis: new THREE.Vector3(1, 0, 0), sign: -1, slice: max },
    L: { axis: new THREE.Vector3(1, 0, 0), sign: 1, slice: 0 },
    U: { axis: new THREE.Vector3(0, 1, 0), sign: -1, slice: max },
    D: { axis: new THREE.Vector3(0, 1, 0), sign: 1, slice: 0 },
  } as Record<string, { axis: THREE.Vector3; sign: number; slice: number }>;
}

// ── Cubie factory ─────────────────────────────────────────────────────────────

type StickerMesh = THREE.Mesh & {
  userData: {
    face: string;
    parentCubie: THREE.Mesh;
    // saved world-space transform when starting an unfold
    savedWorldPos: THREE.Vector3;
    savedWorldQuat: THREE.Quaternion;
  };
};

function makeCubie(gx: number, gy: number, gz: number, size: number) {
  const max = size - 1;
  const half = (size - 1) / 2;

  // Dark-gray rounded plastic body
  const geo = new RoundedBoxGeometry(
    CUBIE_SIZE,
    CUBIE_SIZE,
    CUBIE_SIZE,
    4,
    CUBIE_ROUND_RADIUS,
  );
  const body = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.82,
    //metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, body);
  mesh.position.set((gx - half) * GAP, (gy - half) * GAP, (gz - half) * GAP);
  mesh.userData.gx = gx;
  mesh.userData.gy = gy;
  mesh.userData.gz = gz;

  // Sticker planes on each exposed face
  const faceSetup: Array<{
    cond: boolean;
    face: string;
    pos: [number, number, number];
    rot: [number, number, number];
  }> = [
    {
      cond: gx === max,
      face: "R",
      pos: [STICKER_LIFT, 0, 0],
      rot: [0, Math.PI / 2, 0],
    },
    {
      cond: gx === 0,
      face: "L",
      pos: [-STICKER_LIFT, 0, 0],
      rot: [0, -Math.PI / 2, 0],
    },
    {
      cond: gy === max,
      face: "U",
      pos: [0, STICKER_LIFT, 0],
      rot: [-Math.PI / 2, 0, 0],
    },
    {
      cond: gy === 0,
      face: "D",
      pos: [0, -STICKER_LIFT, 0],
      rot: [Math.PI / 2, 0, 0],
    },
    { cond: gz === max, face: "F", pos: [0, 0, STICKER_LIFT], rot: [0, 0, 0] },
    {
      cond: gz === 0,
      face: "B",
      pos: [0, 0, -STICKER_LIFT],
      rot: [0, Math.PI, 0],
    },
  ];

  const stickers: StickerMesh[] = [];
  for (const s of faceSetup) {
    if (!s.cond) continue;
    const sg = new THREE.PlaneGeometry(STICKER_SZ, STICKER_SZ);
    const mat = new THREE.MeshBasicMaterial({
      color: STICKER_COLOR[s.face],
    });
    const sticker = new THREE.Mesh(sg, mat) as unknown as StickerMesh;
    sticker.position.set(...s.pos);
    sticker.rotation.set(...s.rot);
    sticker.userData.face = s.face;
    sticker.userData.parentCubie = mesh;
    sticker.userData.savedWorldPos = new THREE.Vector3();
    sticker.userData.savedWorldQuat = new THREE.Quaternion();
    mesh.add(sticker);
    stickers.push(sticker);
  }

  return { mesh, stickers };
}

// ── State string (U L F R B D, Z-scan per face) ───────────────────────────────

const FACE_ORDER_STR = ["U", "L", "F", "R", "B", "D"] as const;

const STICKER_CHAR: Record<number, string> = {
  0x0033cc: "B", // Blue
  0x00aa00: "G", // Green
  0xffff00: "Y", // Yellow
  0xdddddd: "W", // White
  0xff6600: "O", // Orange
  0xcc0000: "R", // Red
};

// also handle the 0xffffff variant just in case
(STICKER_CHAR as Record<number, string>)[0xffffff] = "W";

const CHAR_COLOR: Record<string, number> = {
  B: 0x0033cc,
  G: 0x00aa00,
  Y: 0xffff00,
  W: 0xdddddd,
  O: 0xff6600,
  R: 0xcc0000,
};

const FACE_WORLD_NORMAL: Record<string, THREE.Vector3> = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
};

/**
 * For each face, return the list of cubie grid positions [gx,gy,gz] in Z-scan
 * order (TL→TR then BL→BR, i.e. top-left of the face viewed head-on first).
 */
function buildFaceScan(
  size: number,
): Record<string, [number, number, number][]> {
  const max = size - 1;
  const out: Record<string, [number, number, number][]> = {
    U: [],
    D: [],
    F: [],
    B: [],
    R: [],
    L: [],
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      out.U.push([c, max, r]); // viewed from top:   row=z(0=back→front), col=x
      out.D.push([c, 0, max - r]); // viewed from bottom: row=z(max=front→back)
      out.F.push([c, max - r, max]); // viewed from front: row=y(top→bot), col=x
      out.B.push([max - c, max - r, 0]); // viewed from back:  col mirrored
      out.R.push([max, max - r, max - c]); // viewed from right: col=z(front→back)
      out.L.push([0, max - r, c]); // viewed from left:  col=z(back→front)
    }
  }
  return out;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function easeIO(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function neg(v: THREE.Vector3) {
  return v.clone().multiplyScalar(-1);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RubikCube({
  width = 1080,
  height = 600,
  size = 2,
  showStateEditor = false,
}: {
  width?: number;
  height?: number;
  /** Cubies per edge: 2 = pocket, 3 = classic. */
  size?: number;
  /** Show the string-representation editor overlay. */
  showStateEditor?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const showHelpRef = useRef(true);
  showHelpRef.current = showHelp;

  // ── State-editor React state + imperative-bridge refs ──────────────────────
  const [stateString, setStateString] = useState("");
  const [hoveredStrIdx, setHoveredStrIdx] = useState(-1);
  const stateInputRef = useRef<HTMLInputElement>(null);
  // Refs so imperative Three.js callbacks can trigger React updates
  const setStateStringRef = useRef<(s: string) => void>(() => {});
  const setHoveredIdxRef = useRef<(i: number) => void>(() => {});
  const applyStringRef = useRef<(s: string) => void>(() => {});
  setStateStringRef.current = setStateString;
  setHoveredIdxRef.current = setHoveredStrIdx;

  useEffect(() => {
    if (!showStateEditor || hoveredStrIdx < 0) return;
    const input = stateInputRef.current;
    if (!input) return;
    input.focus();
    const start = Math.min(hoveredStrIdx, input.value.length);
    const end = Math.min(start + 1, input.value.length);
    input.setSelectionRange(start, end);
  }, [showStateEditor, hoveredStrIdx, stateString]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const faceDef = buildFaceDef(size);
    const half = (size - 1) / 2;
    const spacing = size * GAP; // face-to-face gap in the unfolded cross

    // ── Renderer ─────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(
        "WebGL is not available. Try this page in a regular browser tab.",
      );
      return;
    }
    const gl = renderer;
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(width, height);
    gl.setClearColor(0x000000, 0);
    gl.shadowMap.enabled = false;
    mount.appendChild(gl.domElement);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const ambLight = new THREE.AmbientLight(0xffffff, 0.62);
    scene.add(ambLight);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x40404a, 0.45);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.42);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8aa0ff, 0.2);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 300);
    const cubeExtent = (size - 1) * GAP + CUBIE_SIZE;
    const baseDist = (cubeExtent / Math.tan(((FOV / 2) * Math.PI) / 180)) * 0.9;
    let cameraRadius = baseDist;

    const WORLD_FACE_VEC = {
      F: new THREE.Vector3(0, 0, 1),
      B: new THREE.Vector3(0, 0, -1),
      U: new THREE.Vector3(0, 1, 0),
      D: new THREE.Vector3(0, -1, 0),
      R: new THREE.Vector3(1, 0, 0),
      L: new THREE.Vector3(-1, 0, 0),
    } as const;

    const currentFront = WORLD_FACE_VEC.F.clone();
    const currentUp = WORLD_FACE_VEC.U.clone();

    function getRight(front: THREE.Vector3, up: THREE.Vector3) {
      return up.clone().cross(front).normalize();
    }

    function cameraPose(
      front: THREE.Vector3,
      up: THREE.Vector3,
      radius: number,
    ) {
      const right = getRight(front, up);
      const dir = front
        .clone()
        .add(right.multiplyScalar(CAMERA_BIAS_RIGHT))
        .add(up.clone().multiplyScalar(CAMERA_BIAS_UP))
        .normalize();
      return {
        position: dir.multiplyScalar(radius),
        up: up.clone().normalize(),
      };
    }

    function applyView(
      front: THREE.Vector3,
      up: THREE.Vector3,
      radius: number,
    ) {
      const pose = cameraPose(front, up, radius);
      camera.position.copy(pose.position);
      camera.up.copy(pose.up);
      camera.lookAt(0, 0, 0);
    }

    function worldFaceFromVec(
      v: THREE.Vector3,
    ): "F" | "B" | "U" | "D" | "R" | "L" {
      const x = Math.round(v.x);
      const y = Math.round(v.y);
      const z = Math.round(v.z);
      if (z === 1) return "F";
      if (z === -1) return "B";
      if (y === 1) return "U";
      if (y === -1) return "D";
      if (x === 1) return "R";
      return "L";
    }

    applyView(currentFront, currentUp, cameraRadius);

    // ── Cubies + stickers ─────────────────────────────────────────────────────
    const cubies: THREE.Mesh[] = [];
    const stickers: StickerMesh[] = [];

    for (let x = 0; x < size; x++)
      for (let y = 0; y < size; y++)
        for (let z = 0; z < size; z++) {
          const { mesh, stickers: cs } = makeCubie(x, y, z, size);
          scene.add(mesh);
          cubies.push(mesh);
          stickers.push(...cs);
        }

    // ── State-editor helpers ──────────────────────────────────────────────────

    const faceScan = buildFaceScan(size);
    let stateStringSnapshot = "";
    let stateIndexMap = new Map<StickerMesh, number>();

    /** Returns the 24-char string AND a Map<sticker → string index>. */
    function computeStickerMap(): {
      str: string;
      indexMap: Map<StickerMesh, number>;
    } {
      let str = "";
      const indexMap = new Map<StickerMesh, number>();

      for (const face of FACE_ORDER_STR) {
        const targetNormal = FACE_WORLD_NORMAL[face];
        for (const [gx, gy, gz] of faceScan[face]) {
          const idx = str.length;
          const cubie = cubies.find(
            (c) =>
              c.userData.gx === gx &&
              c.userData.gy === gy &&
              c.userData.gz === gz,
          );
          if (!cubie) {
            str += "?";
            continue;
          }

          let bestSticker: StickerMesh | null = null;
          let bestDot = -Infinity;
          const wqTmp = new THREE.Quaternion();
          const nTmp = new THREE.Vector3();
          for (const s of stickers) {
            if (s.userData.parentCubie !== cubie) continue;
            s.getWorldQuaternion(wqTmp);
            nTmp.set(0, 0, 1).applyQuaternion(wqTmp).normalize();
            const dot = nTmp.dot(targetNormal);
            if (dot > bestDot) {
              bestDot = dot;
              bestSticker = s;
            }
          }

          if (!bestSticker) {
            str += "?";
            continue;
          }
          indexMap.set(bestSticker, idx);
          const hex = (
            bestSticker.material as THREE.MeshBasicMaterial
          ).color.getHex();
          str += STICKER_CHAR[hex] ?? "?";
        }
      }
      return { str, indexMap };
    }

    /** Create a canvas texture showing a sticker index number. */
    function makeLabelTexture(index: number): THREE.CanvasTexture {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 52px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index), 64, 64);
      return new THREE.CanvasTexture(c);
    }

    /**
     * Label sprites: added to the SCENE (not parented to stickers) so they
     * always face the camera and never appear upside-down.  We reposition
     * them every time the unfold finishes.
     */
    const labelSprites: THREE.Sprite[] = [];
    if (showStateEditor) {
      for (const _s of stickers) {
        const mat = new THREE.SpriteMaterial({
          map: makeLabelTexture(0),
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const sp = new THREE.Sprite(mat);
        sp.scale.setScalar(STICKER_SZ * 0.55);
        sp.visible = false;
        scene.add(sp);
        labelSprites.push(sp);
      }
    }

    /** Refresh label textures + positions from the cached sticker→index map. */
    function refreshLabelsFromCache() {
      if (!showStateEditor) return;
      const wp = new THREE.Vector3();
      stickers.forEach((s, i) => {
        const idx = stateIndexMap.get(s) ?? i;
        const sp = labelSprites[i];
        if (!sp) return;
        const mat = sp.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.map = makeLabelTexture(idx);
        mat.needsUpdate = true;
        // Position the sprite slightly in front of the sticker
        s.getWorldPosition(wp);
        sp.position.copy(wp);
      });
    }

    /** Recompute state from current cube orientation (only valid while folded). */
    function updateStateDisplay() {
      const { str, indexMap } = computeStickerMap();
      stateStringSnapshot = str;
      stateIndexMap = indexMap;
      setStateStringRef.current(str);
      refreshLabelsFromCache();
    }

    /** Parse an editor string and recolor matching stickers. */
    function applyStringFromEditor(s: string) {
      const total = 6 * size * size;
      const raw = s.toUpperCase();

      // Enforce strict format: exactly N chars, color alphabet only.
      if (raw.length !== total || /[^BGYWOR]/.test(raw)) {
        setStateStringRef.current(stateStringSnapshot);
        return;
      }
      const reverseMap = new Map<number, StickerMesh>();
      stateIndexMap.forEach((idx, sticker) => reverseMap.set(idx, sticker));
      for (let i = 0; i < total; i++) {
        const color = CHAR_COLOR[raw[i]];
        if (color === undefined) continue;
        const sticker = reverseMap.get(i);
        if (!sticker) continue;
        (sticker.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
      stateStringSnapshot = raw;
      setStateStringRef.current(raw);
    }

    applyStringRef.current = applyStringFromEditor;

    if (showStateEditor) updateStateDisplay();

    // ── Animation queue ───────────────────────────────────────────────────────
    type TickFn = (dt: number) => void;
    const animCallbacks: TickFn[] = [];

    function addAnim(
      duration: number,
      onTick: (t: number, e: number) => void,
      onDone?: () => void,
    ) {
      let elapsed = 0;
      const fn: TickFn = (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / duration, 1);
        onTick(t, easeIO(t));
        if (t >= 1) {
          onDone?.();
          animCallbacks.splice(animCallbacks.indexOf(fn), 1);
        }
      };
      animCallbacks.push(fn);
      return fn;
    }

    // ── Mutable state ─────────────────────────────────────────────────────────
    let isUnfolded = false;
    let isAnimating = false; // serialises face/orbit/unfold actions

    // ── Slice selection ───────────────────────────────────────────────────────
    function getSlice(face: string): THREE.Mesh[] {
      const def = faceDef[face];
      return cubies.filter((c) => {
        const g =
          def.axis.x !== 0
            ? c.userData.gx
            : def.axis.y !== 0
              ? c.userData.gy
              : c.userData.gz;
        return g === def.slice;
      });
    }

    // ── Camera snap animation ─────────────────────────────────────────────────
    function snapCameraTo(front: THREE.Vector3, up: THREE.Vector3) {
      if (isAnimating) return;
      isAnimating = true;
      const fromPos = camera.position.clone();
      const fromUp = camera.up.clone();
      const target = cameraPose(front, up, cameraRadius);
      const fromDir = fromPos.clone().normalize();
      const toDir = target.position.clone().normalize();

      addAnim(
        0.45,
        (_, e) => {
          const dir = fromDir.clone().lerp(toDir, e).normalize();
          camera.position.copy(dir.multiplyScalar(cameraRadius));
          camera.up.lerpVectors(fromUp, target.up, e).normalize();
          camera.lookAt(0, 0, 0);
        },
        () => {
          currentFront.copy(front);
          currentUp.copy(up);
          applyView(currentFront, currentUp, cameraRadius);
          isAnimating = false;
        },
      );
    }

    // ── Face rotation ─────────────────────────────────────────────────────────
    function animateFaceMove(face: string, cw: boolean) {
      if (isAnimating || isUnfolded) return;
      isAnimating = true;

      const def = faceDef[face];
      const angle = (Math.PI / 2) * (cw ? def.sign : -def.sign);
      const slice = getSlice(face);

      const pivot = new THREE.Object3D();
      scene.add(pivot);
      slice.forEach((c) => pivot.attach(c));

      const startQ = pivot.quaternion.clone();
      const endQ = new THREE.Quaternion()
        .setFromAxisAngle(def.axis, angle)
        .multiply(startQ);

      addAnim(
        MOVE_DURATION,
        (_, e) => pivot.quaternion.slerpQuaternions(startQ, endQ, e),
        () => {
          slice.forEach((c) => {
            scene.attach(c);
            const gx = Math.round(c.position.x / GAP + half);
            const gy = Math.round(c.position.y / GAP + half);
            const gz = Math.round(c.position.z / GAP + half);
            c.position.set(
              (gx - half) * GAP,
              (gy - half) * GAP,
              (gz - half) * GAP,
            );
            c.userData.gx = gx;
            c.userData.gy = gy;
            c.userData.gz = gz;
          });
          scene.remove(pivot);
          isAnimating = false;
          updateStateDisplay();
        },
      );
    }

    // ── Unfold / fold ─────────────────────────────────────────────────────────
    //
    // On unfold: sticker meshes peel off their cubie and fly to cross positions.
    // On fold:   stickers fly back and re-attach to their parent cubies.

    // Cross layout (in CURRENT VIEW coordinates):
    //          [U]
    //    [L]  [F]  [R]  [B]
    //          [D]

    function classifyStickerFace(
      stickerNormalWorld: THREE.Vector3,
      viewFront: THREE.Vector3,
      viewUp: THREE.Vector3,
      viewRight: THREE.Vector3,
    ): "F" | "B" | "U" | "D" | "R" | "L" {
      const candidates: Array<
        ["F" | "B" | "U" | "D" | "R" | "L", THREE.Vector3]
      > = [
        ["F", viewFront],
        ["B", neg(viewFront)],
        ["U", viewUp],
        ["D", neg(viewUp)],
        ["R", viewRight],
        ["L", neg(viewRight)],
      ];

      let bestFace: "F" | "B" | "U" | "D" | "R" | "L" = "F";
      let bestDot = -Infinity;
      for (const [face, normal] of candidates) {
        const dot = stickerNormalWorld.dot(normal);
        if (dot > bestDot) {
          bestDot = dot;
          bestFace = face;
        }
      }
      return bestFace;
    }

    function toggleUnfold() {
      if (isAnimating) return;
      isAnimating = true;
      const DURATION = 0.65;

      if (!isUnfolded) {
        // ── Unfold ──────────────────────────────────────────────────────────

        const viewFront = currentFront.clone().normalize();
        const viewUp = currentUp.clone().normalize();
        const viewRight = getRight(viewFront, viewUp);

        const planeX = viewRight;
        const planeY = viewUp;
        const planeN = viewFront;

        const crossCenter = planeN.clone().multiplyScalar(cubeExtent * 0.7);
        const crossCenters: Record<
          "F" | "B" | "U" | "D" | "R" | "L",
          THREE.Vector3
        > = {
          F: crossCenter.clone(),
          U: crossCenter.clone().add(planeY.clone().multiplyScalar(spacing)),
          D: crossCenter.clone().add(planeY.clone().multiplyScalar(-spacing)),
          L: crossCenter.clone().add(planeX.clone().multiplyScalar(-spacing)),
          R: crossCenter.clone().add(planeX.clone().multiplyScalar(spacing)),
          B: crossCenter
            .clone()
            .add(planeX.clone().multiplyScalar(2 * spacing)),
        };

        const faceAxes: Record<
          "F" | "B" | "U" | "D" | "R" | "L",
          { x: THREE.Vector3; y: THREE.Vector3 }
        > = {
          F: { x: planeX.clone(), y: planeY.clone() },
          B: { x: neg(planeX), y: planeY.clone() },
          R: { x: neg(planeN), y: planeY.clone() },
          L: { x: planeN.clone(), y: planeY.clone() },
          U: { x: planeX.clone(), y: neg(planeN) },
          D: { x: planeX.clone(), y: planeN.clone() },
        };

        // 1. Snapshot sticker world transforms and detach
        const stickerFrom: THREE.Vector3[] = [];
        const stickerFromQ: THREE.Quaternion[] = [];
        const stickerTargetQ: THREE.Quaternion[] = [];
        const stickerMid: THREE.Vector3[] = [];
        const stickerTo: THREE.Vector3[] = [];

        for (const s of stickers) {
          const wp = new THREE.Vector3();
          const wq = new THREE.Quaternion();
          s.getWorldPosition(wp);
          s.getWorldQuaternion(wq);
          const normalWorld = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(wq)
            .normalize();
          const face = classifyStickerFace(
            normalWorld,
            viewFront,
            viewUp,
            viewRight,
          );
          const axes = faceAxes[face];
          const center = crossCenters[face];

          const valX = wp.dot(axes.x);
          const valY = wp.dot(axes.y);
          const ix = Math.round(valX / GAP + half);
          const iy = Math.round(valY / GAP + half);
          const lx = (ix - half) * GAP;
          const ly = (iy - half) * GAP;

          // Per-sticker target quat: rotate normal to face camera,
          // but preserve the current spin around the normal (no undo of F moves etc.)
          const faceToCamera = new THREE.Quaternion().setFromUnitVectors(
            normalWorld,
            planeN,
          );
          const targetQ = faceToCamera.clone().multiply(wq);

          s.userData.savedWorldPos.copy(wp);
          s.userData.savedWorldQuat.copy(wq);
          stickerFrom.push(wp.clone());
          stickerFromQ.push(wq.clone());
          stickerTargetQ.push(targetQ);
          stickerMid.push(
            wp.clone().add(planeN.clone().multiplyScalar(cubeExtent * 0.3)),
          );
          stickerTo.push(
            center
              .clone()
              .add(planeX.clone().multiplyScalar(lx))
              .add(planeY.clone().multiplyScalar(ly)),
          );
          scene.attach(s); // detach from cubie, keep world transform
        }

        // 2. Compute cross camera position
        const crossW = 4 * spacing + CUBIE_SIZE;
        const crossH = 3 * spacing + CUBIE_SIZE;
        const aspect = width / height;
        const halfFov = (FOV / 2) * (Math.PI / 180);
        const camZh = (crossH / 2 + 0.5) / Math.tan(halfFov);
        const camZw = (crossW / 2 + 0.5) / (Math.tan(halfFov) * aspect);
        const camZ = Math.max(camZh, camZw) * 1.12;

        const crossCX = spacing / 2;
        const crossCenterInWorld = crossCenter
          .clone()
          .add(planeX.clone().multiplyScalar(crossCX));
        const camStart = camera.position.clone();
        const camTarget = crossCenterInWorld
          .clone()
          .add(planeN.clone().multiplyScalar(camZ));
        const lookStart = new THREE.Vector3(0, 0, 0);
        const lookEnd = crossCenterInWorld.clone();
        const lookTmp = new THREE.Vector3();

        const SHRINK_PHASE = 0.34;

        addAnim(
          DURATION,
          (t, e) => {
            if (t <= SHRINK_PHASE) {
              const p = t / SHRINK_PHASE;
              const pe = easeIO(p);
              cubies.forEach((c) => c.scale.setScalar(1 - pe * 0.97));
              stickers.forEach((s, i) => {
                s.position.lerpVectors(stickerFrom[i], stickerMid[i], pe);
              });
            } else {
              const p = (t - SHRINK_PHASE) / (1 - SHRINK_PHASE);
              const pe = easeIO(p);
              cubies.forEach((c) => c.scale.setScalar(0.03));
              stickers.forEach((s, i) => {
                s.position.lerpVectors(stickerMid[i], stickerTo[i], pe);
              });
            }

            // Rotation: smooth slerp to face camera, preserving spin
            stickers.forEach((s, i) => {
              s.quaternion.slerpQuaternions(
                stickerFromQ[i],
                stickerTargetQ[i],
                e,
              );
            });

            // Camera
            camera.position.lerpVectors(camStart, camTarget, e);
            lookTmp.lerpVectors(lookStart, lookEnd, e);
            camera.up.lerpVectors(currentUp, planeY, e).normalize();
            camera.lookAt(lookTmp);
          },
          () => {
            cubies.forEach((c) => (c.visible = false));
            if (showStateEditor) {
              refreshLabelsFromCache();
              labelSprites.forEach((sp) => {
                const mat = sp.material as THREE.SpriteMaterial;
                mat.opacity = 1;
                mat.needsUpdate = true;
                sp.visible = true;
              });
            }
            isAnimating = false;
            isUnfolded = true;
          },
        );
      } else {
        // ── Fold ────────────────────────────────────────────────────────────

        const stickerCurrent: THREE.Vector3[] = [];
        const stickerCurrentQ: THREE.Quaternion[] = [];
        const stickerHome: THREE.Vector3[] = [];
        const stickerHomeQ: THREE.Quaternion[] = [];

        for (const s of stickers) {
          stickerCurrent.push(s.position.clone());
          stickerCurrentQ.push(s.quaternion.clone());
          stickerHome.push(s.userData.savedWorldPos.clone());
          stickerHomeQ.push(s.userData.savedWorldQuat.clone());
        }

        // Show cubies immediately (they'll scale up)
        cubies.forEach((c) => {
          c.visible = true;
          c.scale.setScalar(0.01);
        });

        const camStart = camera.position.clone();
        const camTarget = cameraPose(
          currentFront,
          currentUp,
          cameraRadius,
        ).position;
        const viewFront = currentFront.clone().normalize();
        const viewUp = currentUp.clone().normalize();
        const viewRight = getRight(viewFront, viewUp);
        const crossCX = spacing / 2;
        const lookStart = viewFront
          .clone()
          .multiplyScalar(cubeExtent * 0.7)
          .add(viewRight.clone().multiplyScalar(crossCX));
        const lookEnd = new THREE.Vector3(0, 0, 0);
        const lookTmp = new THREE.Vector3();

        const LABEL_FADE_OUT_FRACTION = 0.12;

        addAnim(
          DURATION,
          (t, e) => {
            if (showStateEditor) {
              const fade = Math.min(t / LABEL_FADE_OUT_FRACTION, 1);
              const opacity = 1 - fade;
              labelSprites.forEach((sp) => {
                const mat = sp.material as THREE.SpriteMaterial;
                mat.opacity = opacity;
                mat.needsUpdate = true;
                sp.visible = opacity > 0.001;
              });
            }

            stickers.forEach((s, i) => {
              s.position.lerpVectors(stickerCurrent[i], stickerHome[i], e);
              s.quaternion.slerpQuaternions(
                stickerCurrentQ[i],
                stickerHomeQ[i],
                e,
              );
            });
            cubies.forEach((c) => c.scale.setScalar(0.01 + e * 0.99));
            camera.position.lerpVectors(camStart, camTarget, e);
            lookTmp.lerpVectors(lookStart, lookEnd, e);
            camera.up.lerpVectors(viewUp, currentUp, e).normalize();
            camera.lookAt(lookTmp);
          },
          () => {
            // Re-attach stickers to their cubies (Three.js preserves world pos)
            stickers.forEach((s) => s.userData.parentCubie.attach(s));
            cubies.forEach((c) => c.scale.setScalar(1));
            labelSprites.forEach((sp) => {
              const mat = sp.material as THREE.SpriteMaterial;
              mat.opacity = 0;
              mat.needsUpdate = true;
              sp.visible = false;
            });
            applyView(currentFront, currentUp, cameraRadius);
            isAnimating = false;
            isUnfolded = false;
          },
        );
      }
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      e.stopPropagation();

      if (e.key === "h" || e.key === "H") {
        setShowHelp(!showHelpRef.current);
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        toggleUnfold();
        return;
      }

      if (isAnimating || isUnfolded) return;

      // Arrow keys: discrete camera snap, always face-to-face
      const right = getRight(currentFront, currentUp);
      if (e.code === "ArrowLeft") {
        snapCameraTo(neg(right), currentUp.clone());
        return;
      }
      if (e.code === "ArrowRight") {
        snapCameraTo(right, currentUp.clone());
        return;
      }
      if (e.code === "ArrowUp") {
        // up face becomes front
        snapCameraTo(currentUp.clone(), neg(currentFront));
        return;
      }
      if (e.code === "ArrowDown") {
        // down face becomes front
        snapCameraTo(neg(currentUp), currentFront.clone());
        return;
      }

      // [ ] — roll around front axis (Z rotation of the view)
      if (e.key === "[") {
        // CCW roll: up moves to the left
        const newUp = right.clone();
        snapCameraTo(currentFront.clone(), newUp);
        return;
      }
      if (e.key === "]") {
        // CW roll: up moves to the right
        const newUp = neg(right);
        snapCameraTo(currentFront.clone(), newUp);
        return;
      }

      const logicalFace = e.key.toUpperCase();
      if (logicalFace in faceDef) {
        const relativeFaceVec: Record<string, THREE.Vector3> = {
          F: currentFront.clone(),
          B: neg(currentFront),
          U: currentUp.clone(),
          D: neg(currentUp),
          R: right.clone(),
          L: neg(right),
        };
        const worldFace = worldFaceFromVec(relativeFaceVec[logicalFace]);
        animateFaceMove(worldFace, !e.shiftKey);
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      cameraRadius = Math.max(2, Math.min(40, cameraRadius + e.deltaY * 0.005));
      applyView(currentFront, currentUp, cameraRadius);
    }

    // ── Render loop ───────────────────────────────────────────────────────────

    const clock = new THREE.Clock();
    let rafId: number;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      [...animCallbacks].forEach((fn) => fn(dt));
      gl.render(scene, camera);
    }
    animate();

    // ── Attach events ─────────────────────────────────────────────────────────

    mount.addEventListener("keydown", onKeyDown);
    mount.addEventListener("wheel", onWheel, { passive: false });

    // ── Raycast hover for state editor ────────────────────────────────────────
    const raycaster = showStateEditor ? new THREE.Raycaster() : null;
    function onMouseMove(e: MouseEvent) {
      if (!raycaster) return;
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(
        stickers as unknown as THREE.Object3D[],
        false,
      );
      if (hits.length > 0) {
        const s = hits[0].object as StickerMesh;
        setHoveredIdxRef.current(stateIndexMap.get(s) ?? -1);
      } else {
        setHoveredIdxRef.current(-1);
      }
    }
    if (showStateEditor) mount.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("keydown", onKeyDown);
      mount.removeEventListener("wheel", onWheel);
      if (showStateEditor) mount.removeEventListener("mousemove", onMouseMove);
      gl.dispose();
      if (mount.contains(gl.domElement)) mount.removeChild(gl.domElement);
    };
  }, [width, height, size, showStateEditor]);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width, height }}>
        {webglError ? (
          <div
            style={{
              width,
              height,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              gap: "0.75rem",
              textAlign: "center",
              padding: "2rem",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <span>{webglError}</span>
          </div>
        ) : (
          <>
            <div
              ref={mountRef}
              tabIndex={0}
              style={{ width, height, outline: "none", cursor: "grab" }}
            />
            {/* ── State-editor overlay ─────────────────────────────────── */}
            {showStateEditor && stateString.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0,
                  padding: "10px 0 8px",
                  background: "rgba(0,0,0,0.45)",
                }}
              >
                {/* Editable text input */}
                <input
                  ref={stateInputRef}
                  type="text"
                  value={stateString}
                  maxLength={6 * size * size}
                  spellCheck={false}
                  onChange={(e) => applyStringRef.current(e.target.value)}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    letterSpacing: "0.12em",
                    background: "rgba(0,0,0,0.6)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 4,
                    padding: "4px 10px",
                    outline: "none",
                    textAlign: "center",
                    width: Math.min(width - 40, size * size * 6 * 12 + 80),
                  }}
                />
              </div>
            )}
            {showHelp && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "rgba(148,163,184,0.8)",
                  fontFamily: "monospace",
                  fontSize: "0.62rem",
                  lineHeight: 1.8,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Click</span>{" "}
                to focus ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  Arrows
                </span>{" "}
                orbit ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>[ ]</span>{" "}
                roll ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  Scroll
                </span>{" "}
                zoom ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  F B R L U D
                </span>{" "}
                move ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  +Shift
                </span>{" "}
                inverse ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Space</span>{" "}
                unfold ·{" "}
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>H</span>{" "}
                hide help
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
