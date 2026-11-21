export const VISUAL_PRODUCT_VERSION = '2.6.1' as const;

export type VisualContentKind = 'open' | 'shelves' | 'drawers' | 'short_clothes' | 'long_clothes' | 'mixed';
export type VisualResizeEdge = 'left' | 'right' | 'top' | 'bottom';
export type VisualRoomWall = 'left' | 'right' | 'back' | 'front';
export type VisualCadPanelKind = 'side_left' | 'side_right' | 'top' | 'bottom' | 'divider';
export type VisualOpeningKind = 'door' | 'window' | 'niche' | 'passage' | 'other';
export type VisualKitchenModuleType = 'base' | 'wall' | 'tall';
export type VisualKitchenFunction = 'storage' | 'drawers' | 'sink' | 'hob' | 'oven' | 'dishwasher' | 'fridge' | 'hood' | 'microwave' | 'pantry' | 'open';
export type VisualObstacleKind = 'socket' | 'switch' | 'pipe' | 'radiator' | 'vent' | 'window' | 'door' | 'column' | 'duct' | 'boiler' | 'other';

export type VisualEditorCommand =
  | { type: 'create_rect_room'; name?: string; widthMm: number; depthMm: number; heightMm: number }
  | { type: 'set_room_dimensions'; roomIndex?: number; widthMm?: number; depthMm?: number; heightMm?: number }
  | { type: 'set_furniture_dimensions'; furnitureIndex?: number; widthMm?: number; heightMm?: number; depthMm?: number }
  | { type: 'set_furniture_position'; furnitureIndex?: number; xMm?: number; yMm?: number; zMm?: number; rotationZDeg?: 0|90|180|270 }
  | { type: 'resize_furniture_edge'; furnitureIndex?: number; edge: VisualResizeEdge; deltaMm: number }
  | { type: 'duplicate_furniture'; furnitureIndex?: number; offsetXMm?: number; offsetYMm?: number; rotationZDeg?: 0|90|180|270; name?: string }
  | { type: 'remove_furniture'; furnitureIndex?: number }
  | { type: 'set_module_count'; furnitureIndex?: number; count: number }
  | { type: 'set_module_width'; furnitureIndex?: number; moduleIndex: number; widthMm: number }
  | { type: 'move_module_divider'; furnitureIndex?: number; leftModuleIndex: number; deltaMm: number }
  | { type: 'set_shelf_elevation'; furnitureIndex?: number; moduleIndex: number; shelfIndex: number; elevationMm: number }
  | { type: 'set_module_content'; furnitureIndex?: number; moduleIndex: number; kind: VisualContentKind; count?: number }
  | { type: 'add_module'; furnitureIndex?: number; afterModuleIndex?: number; widthMm?: number; kind?: VisualContentKind }
  | { type: 'remove_module'; furnitureIndex?: number; moduleIndex: number }
  | { type: 'equalize_modules'; furnitureIndex?: number }
  | { type: 'set_style_note'; furnitureIndex?: number; colorNote?: string; finishNote?: string }
  | { type: 'set_hinged_fronts'; furnitureIndex?: number; enabled: boolean }
  | { type: 'add_room_opening'; roomIndex?: number; kind: VisualOpeningKind; xMm: number; yMm: number; zMm?: number; widthMm: number; depthMm: number; heightMm: number; hostWallId?: string; note?: string }
  | { type: 'move_room_opening'; roomIndex?: number; openingIndex: number; xMm?: number; yMm?: number; zMm?: number }
  | { type: 'remove_room_opening'; roomIndex?: number; openingIndex: number }
  | { type: 'add_room_obstacle'; roomIndex?: number; kind: VisualObstacleKind; xMm: number; yMm: number; zMm?: number; widthMm: number; depthMm: number; heightMm: number; hostWallId?: string; note?: string }
  | { type: 'move_room_obstacle'; roomIndex?: number; obstacleIndex: number; xMm?: number; yMm?: number; zMm?: number }
  | { type: 'remove_room_obstacle'; roomIndex?: number; obstacleIndex: number }
  | { type: 'set_carcass_thickness'; furnitureIndex?: number; thicknessMm: number }
  | { type: 'set_furniture_wall_clearance'; furnitureIndex?: number; wall: VisualRoomWall; clearanceMm: number }
  | { type: 'align_furniture_to_furniture'; furnitureIndex?: number; targetFurnitureIndex: number; side: 'left' | 'right' | 'back' | 'front'; gapMm?: number }
  | { type: 'create_l_corner_layout'; furnitureIndex?: number; hand: 'left' | 'right'; returnWidthMm?: number; gapMm?: number; name?: string }
  | { type: 'configure_kitchen_run'; furnitureIndex?: number; widthsMm: number[]; moduleType?: VisualKitchenModuleType; heightMm?: number; depthMm?: number; opening?: 'handle'|'profile'|'gola'|'push_to_open'|'none' }
  | { type: 'set_kitchen_module'; furnitureIndex?: number; moduleIndex: number; moduleType?: VisualKitchenModuleType; function?: VisualKitchenFunction; heightMm?: number; depthMm?: number; hasTop?: boolean; hasBottom?: boolean; hasBack?: boolean; opening?: 'handle'|'profile'|'gola'|'push_to_open'|'none'; worktop?: boolean; plinth?: boolean; backPanelMode?: 'overlay'|'groove'|'recessed'|'none'; wallHangerHardwareSelectionId?: string; wallHangerCount?: number }
  | { type: 'set_kitchen_drawers'; furnitureIndex?: number; moduleIndex: number; count: number; runnerHardwareSelectionId: string; frontHeightMm?: number; sideHeightMm?: number; sideThicknessMm?: number; bottomThicknessMm?: number }
  | { type: 'set_kitchen_appliance'; furnitureIndex?: number; moduleIndex: number; kind: 'oven'|'dishwasher'|'fridge'|'hood'|'microwave'|'hob'|'other'; manufacturer?: string; model?: string; installation?: 'cabinet'|'worktop'|'wall'; widthMm: number; heightMm: number; depthMm: number; append?: boolean }
  | { type: 'set_kitchen_wall_trim'; furnitureIndex?: number; moduleIndex: number; enabled: boolean; heightMm?: number; depthMm?: number; materialSelectionId?: string }
  | { type: 'set_kitchen_cutout'; furnitureIndex?: number; moduleIndex: number; kind: 'sink'|'hob'|'custom'; widthMm: number; depthMm: number; offsetXMm?: number; offsetYMm?: number; verifiedForCnc?: boolean }
  | { type: 'set_kitchen_materials'; furnitureIndex?: number; carcassMaterialSelectionId: string; frontMaterialSelectionId?: string; backMaterialSelectionId?: string; edgeMaterialSelectionId?: string; worktopMaterialSelectionId?: string; legHardwareSelectionId?: string }
  | { type: 'set_kitchen_front'; furnitureIndex?: number; moduleIndex: number; mode: 'none'|'single_left'|'single_right'|'double'; materialSelectionId?: string; openingMode?: 'handle'|'profile'|'gola'|'push_to_open'|'none' };

export interface VisualSceneModule {
  id: string;
  index: number;
  name: string;
  kind: string;
  xMm: number;
  widthMm: number;
  contentKind: VisualContentKind;
  contentCount: number;
  shelfElevationsMm?: number[];
  kitchen?: { moduleType: VisualKitchenModuleType; function: VisualKitchenFunction; heightMm: number; depthMm: number; opening?: string; worktop: boolean; plinth: boolean; appliance?: string };
}

export interface VisualCadPanel {
  id: string;
  kind: VisualCadPanelKind;
  moduleIndex?: number;
  xMm: number;
  zMm: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  editableBy: 'resize' | 'divider' | 'thickness';
}

export interface VisualClearancesMm {
  left: number;
  right: number;
  back: number;
  front: number;
}

export interface VisualSceneFurniture {
  id: string;
  index: number;
  name: string;
  kind: string;
  xMm: number;
  yMm: number;
  zMm: number;
  rotationZDeg: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  modules: VisualSceneModule[];
  cadPanels: VisualCadPanel[];
  moduleDimensionChainMm: number[];
  clearancesMm?: VisualClearancesMm;
  carcassThicknessMm: number;
  layoutGroupId?: string;
  layoutKind?: 'l_corner';
  layoutRole?: 'main' | 'return';
  layoutHand?: 'left' | 'right';
  colorNote?: string;
  finishNote?: string;
}

export interface VisualSceneRoomFeature {
  id: string;
  index: number;
  kind: string;
  xMm: number;
  yMm: number;
  zMm: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  hostWallId?: string;
  note?: string;
}

export interface VisualSceneRoom {
  id: string;
  index: number;
  name: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  openings: VisualSceneRoomFeature[];
  obstacles: VisualSceneRoomFeature[];
}

export interface VisualScene {
  visualVersion: typeof VISUAL_PRODUCT_VERSION;
  projectId: string;
  revision: number;
  room: VisualSceneRoom | null;
  furniture: VisualSceneFurniture[];
  warnings: string[];
}
