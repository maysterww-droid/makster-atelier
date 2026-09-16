"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { MotionContract, ReadyModuleAsset } from "../lib/makster-library";

type Props = {
  frontColor: string;
  topColor: string;
  panelColor: string;
  layout: string;
  led: boolean;
  doorsOpen: boolean;
  drawersOpen: boolean;
  cameraMode: string;
  cloudAsset?: ReadyModuleAsset | null;
  motionContract?: MotionContract | null;
};

export default function DreamKitchenViewer(props: Props) {
  const cloudMode = Boolean(props.cloudAsset);
  return (
    <Canvas shadows camera={{ position: cloudMode ? [1.55, 1.25, 1.7] : [5.8, 4.2, 6.5], fov: cloudMode ? 36 : 40 }}>
      <color attach="background" args={["#111111"]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight intensity={1.1} groundColor="#222222" />
      <directionalLight position={[3, 6, 4]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
      {props.led && <pointLight position={[0, 2.3, 0.1]} intensity={3.4} distance={5} color="#e7c678" />}
      <CameraMode mode={props.cameraMode} cloudMode={cloudMode} />
      <Suspense fallback={<PrototypeKitchen {...props} />}>
        {props.cloudAsset ? <CloudModelBoundary key={props.cloudAsset.glbUrl} fallback={<PrototypeKitchen {...props} />}><CloudMaksterModule {...props} asset={props.cloudAsset} /></CloudModelBoundary> : <PrototypeKitchen {...props} />}
      </Suspense>
      <OrbitControls makeDefault target={cloudMode ? [-0.3, 0.42, -0.26] : [0, 1.25, -0.25]} enableDamping dampingFactor={0.06} maxPolarAngle={Math.PI * 0.48} minDistance={cloudMode ? 0.9 : 4} maxDistance={cloudMode ? 4 : 11} />
      <Environment preset="apartment" />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={cloudMode ? 3 : 10} blur={2.8} far={4} />
    </Canvas>
  );
}

function CameraMode({ mode, cloudMode }: { mode: string; cloudMode: boolean }) {
  const { camera, controls } = useThree() as any;
  useEffect(() => {
    if (cloudMode) {
      if (mode === "front") camera.position.set(-0.3, 0.55, 1.7);
      if (mode === "iso") camera.position.set(1.55, 1.25, 1.7);
      if (mode === "top") camera.position.set(-0.3, 2.45, -0.25);
      controls?.target?.set(-0.3, 0.42, -0.26);
    } else {
      if (mode === "front") camera.position.set(0, 2.4, 6.8);
      if (mode === "iso") camera.position.set(5.8, 4.2, 6.5);
      if (mode === "top") camera.position.set(0, 7.8, 1.1);
      controls?.target?.set(0, 1.25, -0.25);
    }
    controls?.update?.();
  }, [mode, cloudMode, camera, controls]);
  return null;
}

class CloudModelBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){console.error("Makster GLB fallback:",error);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function CloudMaksterModule(props: Props & { asset: ReadyModuleAsset }) {
  const gltf = useGLTF(props.asset.glbUrl) as any;
  const { actions } = useAnimations(gltf.animations, gltf.scene);

  useEffect(() => {
    gltf.scene.traverse((obj: any) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }, [gltf.scene]);

  useEffect(() => {
    const motions = props.motionContract?.motions ?? [];
    for (const motion of motions) {
      const actionName = motion.kind === "ROTATION" ? `${motion.pivot_code}_OPEN` : `${motion.object_code}_OPEN`;
      const action = actions[actionName];
      if (!action) continue;
      const shouldOpen = motion.kind === "ROTATION" ? props.doorsOpen : props.drawersOpen;
      action.enabled = true;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      const duration = action.getClip().duration;
      if (shouldOpen) {
        action.timeScale = 1;
        action.paused = false;
        if (action.time >= duration - 0.001) action.time = 0;
        action.play();
      } else {
        action.timeScale = -1;
        action.paused = false;
        if (action.time <= 0.001) action.time = duration;
        action.play();
      }
    }
  }, [actions, props.motionContract, props.doorsOpen, props.drawersOpen]);

  return <primitive object={gltf.scene} />;
}

function PrototypeKitchen(props: Props) {
  const front = useMemo(() => new THREE.MeshStandardMaterial({ color: props.frontColor, roughness: 0.62 }), [props.frontColor]);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: props.topColor, roughness: 0.38 }), [props.topColor]);
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ color: props.panelColor, roughness: 0.5 }), [props.panelColor]);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.45, metalness: 0.15 }), []);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8d0c7", roughness: 0.78 }), []);
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7f766e", roughness: 0.85 }), []);
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#e7c678" }), []);
  const doors = useRef<any[]>([]);
  const drawers = useRef<any[]>([]);

  useFrame(() => {
    doors.current.forEach((g, i) => {
      const target = props.doorsOpen ? (i % 2 === 0 ? -0.78 : 0.78) : 0;
      g.rotation.y += (target - g.rotation.y) * 0.08;
    });
    drawers.current.forEach(g => {
      const target = props.drawersOpen ? 0.92 : 0.43;
      g.position.z += (target - g.position.z) * 0.08;
    });
  });

  const isIsland = props.layout === "Island";
  const isL = props.layout === "L-shape" || props.layout === "U-shape";
  const isU = props.layout === "U-shape";

  return (
    <group>
      <Box pos={[0,-0.05,0]} size={[9,.08,6.5]} mat={floor}/>
      <Box pos={[0,2.05,-1.55]} size={[9,4.2,.08]} mat={wall}/>
      <Box pos={[-4.45,2.05,0]} size={[.08,4.2,6.5]} mat={wall}/>
      <Box pos={[0,4.1,0]} size={[9,.08,6.5]} mat={wall}/>
      <group position={[0,0,-.9]}>
        <Box pos={[-3.25,1.48,0]} size={[.9,3.05,.62]} mat={front}/>
        <Box pos={[-3.25,1.45,.36]} size={[.56,.96,.08]} mat={dark}/>
        {Array.from({length:5}).map((_,i)=><group key={"d"+i} ref={el=>{ if(el) doors.current[i]=el }} position={[-1.95+i*.85,2.75,.43]}><Box pos={[0,0,0]} size={[.82,.82,.06]} mat={front}/><Box pos={[0,-.32,.045]} size={[.34,.025,.025]} mat={dark}/></group>)}
        {props.led && <Box pos={[.2,2.22,.45]} size={[4.65,.035,.035]} mat={ledMat}/>}<Box pos={[.2,1.75,.34]} size={[4.6,.92,.045]} mat={panel}/><Box pos={[.18,1.18,.05]} size={[4.85,.12,.8]} mat={top}/>
        {Array.from({length:5}).map((_,i)=><group key={"b"+i}><Box pos={[-1.9+i*.85,.65,0]} size={[.82,.9,.62]} mat={front}/><group ref={el=>{ if(el) drawers.current[i]=el }} position={[-1.9+i*.85,.86,.43]}><Box pos={[0,0,0]} size={[.78,.38,.055]} mat={front}/><Box pos={[0,0,.04]} size={[.32,.025,.025]} mat={dark}/></group><Box pos={[-1.9+i*.85,.42,.43]} size={[.78,.42,.055]} mat={front}/></group>)}
        {isL && <><Box pos={[-3.85,.65,1]} size={[.62,.9,2.2]} mat={front}/><Box pos={[-3.85,1.18,1]} size={[.8,.12,2.35]} mat={top}/></>}{isU && <><Box pos={[3.05,.65,1]} size={[.62,.9,2.2]} mat={front}/><Box pos={[3.05,1.18,1]} size={[.8,.12,2.35]} mat={top}/></>}{isIsland && <><Box pos={[.45,.5,2.05]} size={[2.25,.9,1]} mat={front}/><Box pos={[.45,1.02,2.05]} size={[2.45,.12,1.18]} mat={top}/></>}
        <Box pos={[.15,1.27,.34]} size={[.8,.04,.38]} mat={dark}/><Box pos={[1.75,1.27,.34]} size={[.7,.06,.34]} mat={dark}/>
      </group>
    </group>
  );
}

function Box({ pos, size, mat }: any) {
  return <mesh castShadow receiveShadow position={pos}><boxGeometry args={size}/><primitive object={mat} attach="material"/></mesh>;
}
