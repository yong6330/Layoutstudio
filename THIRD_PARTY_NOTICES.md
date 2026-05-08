# Third-Party Notices

Layoutstudio references open-source projects for improving the v0.1.0-alpha prototype.

Layoutstudio version must remain:

- v0.1.0-alpha

## Runtime Libraries

### Fabric.js
- Usage: 2D canvas rendering, furniture selection/movement, layer composition
- License: MIT

### Tesseract.js
- Usage: OCR-assisted dimension candidate detection
- License: Apache-2.0

### Lucide
- Usage: UI icons
- License: ISC

## Priority References

### IndoorJS
- Repository: https://github.com/mudin/indoorjs
- Usage:
  - Fabric.js floorplan reference layer
  - Grid, zoom, and pan behavior
  - Floorplan opacity and non-selectable image handling

### fabric-schematics
- Repository: https://github.com/ajoslin103/fabric-schematics
- Usage:
  - Coordinate-based grid
  - Fabric.js schematic canvas structure
  - Workspace coordinate model reference

### fabricjs-viewport
- Repository: https://github.com/SoftwareBrothers/fabricjs-viewport
- Usage:
  - Fabric.js viewport zoom/pan behavior
  - Keeping object data stable while viewport changes

### OpenSeadragon Fabric Overlay
- Repository: https://github.com/rssaini01/openseadragon-fabric-overlay
- Usage:
  - Image layer and Fabric layer synchronization concept

## Secondary References

### Design Editor
- Repository: https://github.com/roylisto/design-editor
- Usage:
  - Object edit, clone, delete, reorder UX
  - Save/download UX

### react-floorplanner
- Repository: https://github.com/jakeNiemiec/react-floorplanner
- Usage:
  - Furniture catalog
  - Drag/drop object placement

### Arcada
- Repository: https://github.com/mehanix/arcada
- Usage:
  - Floor planner UI/UX
  - Inspector panel
  - Furniture edit flow
  - Save/load behavior

### blueprint3d-modern
- Repository: https://github.com/charmlinn/blueprint3d-modern
- Usage:
  - Long-term 2D/3D floor planner reference

### blueprint3d
- Repository: https://github.com/furnishup/blueprint3d
- Usage:
  - Long-term interior planner item model reference

### floor-planner
- Repository: https://github.com/paulsonnentag/floor-planner
- Usage:
  - Lightweight floor planner reference

### homemaker
- Repository: https://github.com/bayllama/homemaker
- Usage:
  - Floor plan upload and tracing idea

## Quarantine / No Direct Copy

The following projects must not be copied directly unless license compatibility is explicitly confirmed.

### appartment-planner
- Repository: https://github.com/marvinvr/appartment-planner
- Usage:
  - Calibration flow reference only
  - Furniture library structure reference only

### react-fabricjs-demo
- Repository: https://github.com/xtrinch/react-fabricjs-demo
- Usage:
  - Fabric.js floor planner behavior reference only

### quickfloorplanner
- Repository: https://github.com/cicampemu/quickfloorplanner
- Usage:
  - High-level UX reference only
  - Do not copy GPL code into Layoutstudio

### floorplan-canvas
- Repository: https://github.com/iancometa/floorplan-canvas
- Usage:
  - Structure reference only

## Rule

When code is adapted from permissive open-source projects, preserve the original license and copyright notices.

Do not copy code from projects without a clear license.

Do not copy GPL code into Layoutstudio unless the project intentionally accepts GPL obligations.
