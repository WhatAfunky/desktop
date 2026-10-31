# Roadmap: a Flash-like 2D prototyping editor

Goal: keep Scratch's drawing tools and block coding, add the tooling that makes prototyping a 2D game fast. Features should work well and be intuitive; they don't need to be polished. Personal fork, so the project format and the editor can diverge from upstream TurboWarp.

Most work happens in the forks `../scratch-gui` (editor UI) and `../scratch-vm` (runtime), not in this repository. New editor code goes under `scratch-gui/src/engine/` where possible. Extra project data is stored in an `engine` section of project.json.

Reuse extensions from https://github.com/TurboWarp/extensions where they fit.

## Stages

- [x] **0. Foundation** – local forks of scratch-gui and scratch-vm, webpack builds from them, watch + reload loop works.
- [x] **1. Block search + prototyping kit**
  - Tab (outside text fields and dialogs) opens the "Insert blocks by name" popup at the mouse, or in the middle of the code area; Enter places the block attached to the cursor. Inside the popup Tab still autocompletes. (`scratch-gui/src/addons/addons/middle-click-popup/userscript.js`)
  - Debugger addon on by default (logs, breakpoints, step, threads, FPS graph).
  - Built-in "Game" extension, always in the palette (`scratch-vm/src/extensions/engine_game/`): `when action pressed`, `action down / just pressed / just released`, `axis horizontal/vertical`, `bind action to keys`, `key just pressed / released`, `delta time`. Default actions: left, right, up, down, jump, action — arrows, WASD and gamepad. Bindings made with blocks are not saved in the project yet (planned for the Inspector).
  - Tween extension auto-loaded (`scratch-gui/src/engine/prototyping-kit.js`).
  - Follow-up idea: block search lists every key of a key dropdown (`key a just pressed`, `key b…`); could collapse those into one result.
- [x] **2. Editor layout** – kept Scratch's arrangement (chosen over code-centered and viewport-centered layouts), made resizable:
  - Divider between the editor and the stage column sets the stage width; the stage keeps its aspect ratio and the width is remembered (`scratch-gui/src/engine/stage-splitter.jsx`, `dynamicWidth` in `reducers/stage-size.js`). Stage header now offers small and normal sizes only.
  - Under the stage: Hierarchy (Stage row + one-line sprite rows, still drag-to-reorder, right-click menu, add-sprite button) | Inspector (name, x, y, size, direction, rotation style, visible), with a remembered divider (`engine/panel-split.jsx`, `engine/inspector.jsx`). When the column is too narrow (small stage) they stack vertically.
  - Backdrops are added from the Backdrops tab (the stage row has no add button).
- [x] **3. Scene view + Play mode**
  - Scene view over the stage in the editor (`scratch-gui/src/engine/scene-view.jsx`): wheel zooms at the cursor; middle/right-drag or Space+drag pans; toolbar with zoom, Fit and grid (Off/8/16/32/64, hold Ctrl/Cmd to ignore). The game area is a dashed frame with the outside dimmed. Implemented by swapping the renderer's projection matrix only (Scratch's stage size, pen layer and picking are untouched).
  - Click selects (and opens the sprite's code), Shift+click adds/removes, drag on empty space for a marquee. Drag to move, corner handles scale (Shift = 10% steps), top handle rotates (Shift = 15° steps).
  - Keys while the scene view has focus: arrows nudge (Shift = 10), Delete removes (Edit → Restore Sprite brings it back), Ctrl/Cmd+D duplicates with an offset, Ctrl/Cmd+Z / Shift+Z / Y undo and redo moves, Ctrl/Cmd+A selects all, Esc clears, F frames the selection, 0 or Home resets the view.
  - Fencing is off by default (`runtime.js`, `reducers/tw.js`), so sprites can live outside the game area.
  - Play mode (`engine/play-mode.js`): the green flag remembers the editor layout; Stop restores positions, direction, size, visibility, costume, rotation style, effects, layer order, backdrop and all variables/lists. The flag while playing restarts from the editor layout. Saving while playing saves the editor layout. A teal outline shows play mode.
  - Known limits: variable monitors and extension overlays stay in game-area coordinates when the view is zoomed or panned; vector sprites can look soft when zoomed in a lot; selection boxes are axis-aligned; clicking sprites in the editor selects them instead of running "when this sprite clicked" (that works while playing).
- [x] **3b. Scene view fixes** – the rotate handle turns relative to where it was grabbed; handles stretch freely (corners both axes, edges one axis) and Shift keeps proportions. Sprites have a real per-sprite stretch (`stretchX`/`stretchY` in scratch-vm `rendered-target.js`), saved as `stretch` in project.json, copied to clones, shown in the Inspector.
- [x] **4. Instances + Tags**
  - Instances are permanent clones placed in the editor (scratch-vm `createInstance`/`deleteInstance`/`renameInstance`): they share the sprite's scripts and costumes, have their own name, transform, costume, variables and tags, run "when flag clicked" like the sprite, are not removed by Stop, and are saved inside their sprite (`instances` in project.json, with layer order). `touching [Wall]?` covers every instance of Wall.
  - Ctrl/Cmd+D in the scene view and "+ instance" in the hierarchy place instances; the hierarchy lists them under their sprite (collapsible); the Inspector edits the selected instance ("Instance of Wall"); Delete + Edit → Restore Instance. Selection is shared between scene view, hierarchy and Inspector (`scratch-gui/src/engine/selection.js`).
  - Tags: set on a sprite (apply to all its instances and clones) or on one instance; edited in the Inspector; clones inherit them.
  - "Instances" blocks (scratch-vm `extensions/engine_instances`): `my name`, `I have tag`, `add/remove tag`, `touching tag`, `nearest`, `distance to nearest`, `point towards nearest`, `number of`, `name of [tag] number (n)`, `[property or variable] of [name]`, `set [variable] of [name] to`, `broadcast [message] to [name] / to tag [tag] with [data]` (received by the normal "when I receive" hat), `received data`. Names are instance names, or the sprite name for the sprite itself; clones keep the name of what they were cloned from.
  - Play mode also restores instances: ones deleted while playing (e.g. `delete this clone` on a collected coin) come back on Stop.
  - Not done yet (planned for the Inspector in stage 6): editing an instance's variable values in the editor; until then use `set [variable] of [name] to` or the sprite's own scripts.
- [x] **5. Collision**
  - Hitboxes: each sprite has one hitbox shared by its instances and clones, either the costume's box (default, follows costume changes), a rectangle or a circle. They scale with size and stretch, flip with left-right rotation, and turn with the sprite (unless its rotation style is left-right or don't rotate). Stored as `hitbox` on the sprite in project.json (scratch-vm `getHitbox`/`getLocalHitbox`/`getCostumeBox` in `rendered-target.js`, `vm.setSpriteHitbox`).
  - Editing: Inspector "Hitbox" section (shape, offset, width/height or radius); in the scene view the "Edit hitbox" tool (H) drags the selected sprite's hitbox and its handles, with undo. "Hitboxes" shows them all (dashed = costume box).
  - "Collision" blocks (scratch-vm `extensions/engine_collision`): `move x [] y [] stopping at [solid]` (x then y, exact contact for upright rectangles, turned rectangles handled with separating-axis tests, no tunnelling through thin walls, never stuck inside something it already overlaps), `on ground?`, `blocked [below/above/left/right]?` (against the last solid moved against), `hit something [sideways/up or down/at all] in last move?`, `name of object hit`, `hitbox touching [solid]?`, `name of [solid] touching me`, `push out of [solid]`. A solid is a tag, an object name or a sprite name. Hidden objects don't collide; ghosted ones do (like Scratch's `touching`).
  - Play-mode tools (toolbar at the bottom of the stage while playing): Pause/Resume (shared with the pause addon and Alt+X), Step (runs exactly one frame while paused; `delta time` reports one normal frame), Hitboxes over the running game, Objects (live list of every sprite, instance and clone with position and variables, filter by name or tag, hover highlights its hitbox). Leaving play mode unpauses (`scratch-gui/src/engine/pause.js`, `engine/objects-panel.jsx`).
  - Fixed along the way: block inputs written as `(NAME)` in block text weren't inputs at all; `name of [tag] number [INDEX]` from stage 4 now has its number input.
  - Known limits: no slope walking (a turned wall stops movement like any other wall, so a player doesn't slide up or down it); `name of object hit` reports the last hit (the vertical one when both axes hit).
- [ ] **6. Hierarchy + Inspector** – instance tree with folders and tags; Inspector edits transform, costume, tags, variables. Sort layers (Background / World / UI) and Y-sorting.
- [ ] **7. Scenes** – scene list; `go to scene`, `when scene starts`, `current scene`.
- [ ] **8. Animation** – named clips, `play animation [clip] at (fps)`, a costume timeline strip, sprite sheet import and slicing.
- [ ] **9. Behaviors** – global custom blocks; attachable behaviors with a starter library (Platformer, Top-down, Follow mouse, Bounce, Destroy offscreen).
- [ ] **10. Text/HUD objects** – text placed in the scene, optionally bound to a variable.
- [ ] **11. Camera (optional)** – start from an existing camera extension; camera frame shown in the scene view.

## Later (once the tooling is done)

Onion skin, hot-reloading external images, project-wide find and rename, autosave history, particles and screen shake.

Not planned: tilemaps.
