// NextGenEngine: Robust 3D+2D Framework with ECS and Error Boundaries

class NextGenEngine {
  constructor(cfg = {}) {
    this.cfg = cfg;
    this._error = null;

    // --- Babylon.js 3D setup ---
    try {
      this.babylonCanvas = document.getElementById(cfg.canvasId || 'babylon-canvas');
      if (!this.babylonCanvas) throw new Error('Babylon canvas not found');
      this.babylonEngine = new BABYLON.Engine(this.babylonCanvas, true, { preserveDrawingBuffer: true, stencil: true });
      this.babylonScene = new BABYLON.Scene(this.babylonEngine);
      this.babylonScene.clearColor = new BABYLON.Color4(0.2, 0.8, 0.2, 1.0);
      this.babylonCamera = new BABYLON.ArcRotateCamera(
        "cam", -Math.PI/2, Math.PI/2.2, 8, new BABYLON.Vector3(0,1,0), this.babylonScene
      );
      this.babylonCamera.attachControl(this.babylonCanvas, true);
      new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1,1,0), this.babylonScene);
    } catch (err) {
      this._onFatalError("BabylonJS failed to initialize: " + err.message);
    }

    // --- Phaser 2D overlay setup ---
    try {
      const engine = this;
      this._pendingTexts = [];
      this.phaserGame = new Phaser.Game({
        type: Phaser.CANVAS,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: cfg.uiParent || 'phaser-ui',
        transparent: true,
        scene: {
          create: function() {
            if (engine._pendingTexts) {
              for (const args of engine._pendingTexts) {
                this.add.text(...args);
              }
              engine._pendingTexts = [];
            }
            // For changeScene demo
            if(engine._pendingSceneLabels) {
              for(const args of engine._pendingSceneLabels) {
                this.add.text(...args);
              }
              engine._pendingSceneLabels = [];
            }
          }
        }
      });
    } catch (err) {
      this._onFatalError("Phaser failed to initialize: " + err.message);
    }

    // ECS: Entities, Components, Systems
    this.entities = [];
    this.components = {};
    this.systems = [];
    this.lastFrame = performance.now();

    // For scene management
    this.currentScene = "main";
    this._pendingSceneLabels = [];
    this._currentSceneObjects = [];

    window.addEventListener('resize', () => this._onResize());
  }

  _onFatalError(msg) {
    this._error = msg;
    let overlay = document.getElementById('fatal-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fatal-error-overlay';
      overlay.style.position = 'fixed';
      overlay.style.zIndex = 9999;
      overlay.style.left = 0;
      overlay.style.top = 0;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.background = 'rgba(32,16,16,0.92)';
      overlay.style.color = '#fff';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.font = 'bold 2rem monospace';
      overlay.innerHTML = `FATAL ERROR:<br>${msg}`;
      document.body.appendChild(overlay);
    }
    console.error(msg);
  }

  // ECS methods
  registerComponent(name, CompClass) {
    this.components[name] = CompClass;
  }
  createEntity(name='Entity') {
    const ent = { name, comps: {} };
    this.entities.push(ent);
    return ent;
  }
  addComponent(entity, compName, config) {
    const Comp = this.components[compName];
    if (!Comp) throw new Error(`Component ${compName} not registered`);
    const inst = new Comp(this, config);
    entity.comps[compName] = inst;
    return inst;
  }
  registerSystem(fn) {
    this.systems.push(fn);
  }

  // 3D mesh factory
  addBabylonMesh(type, opts = {}) {
    try {
      if (type === "box" && (opts.width || opts.height || opts.depth)) {
        const mesh = BABYLON.MeshBuilder.CreateBox("box", {
          width: opts.width || 1,
          height: opts.height || 1,
          depth: opts.depth || 1,
          size: opts.size || undefined,
        }, this.babylonScene);
        mesh.position = new BABYLON.Vector3(...(opts.position || [0, 0, 0]));
        mesh.material = new BABYLON.StandardMaterial("bbmat", this.babylonScene);
        mesh.material.diffuseColor = new BABYLON.Color3(
          ...(opts.color || [1, 1, 1])
        );
        return mesh;
      }
      if (type === "box") {
        const mesh = BABYLON.MeshBuilder.CreateBox("box", {size: opts.size || 2}, this.babylonScene);
        mesh.position = new BABYLON.Vector3(...(opts.position || [0, 1, 0]));
        mesh.material = new BABYLON.StandardMaterial("mat", this.babylonScene);
        mesh.material.diffuseColor = new BABYLON.Color3(
          ...(opts.color || [0.3, 0.5, 1.0])
        );
        return mesh;
      }
      if (type === "ground") {
        const mesh = BABYLON.MeshBuilder.CreateGround("ground", {width: opts.width || 10, height: opts.height || 10}, this.babylonScene);
        mesh.position = new BABYLON.Vector3(...(opts.position || [0, 0, 0]));
        mesh.material = new BABYLON.StandardMaterial("gmat", this.babylonScene);
        mesh.material.diffuseColor = new BABYLON.Color3(
          ...(opts.color || [0.2, 0.8, 0.2])
        );
        return mesh;
      }
      if (type === "torus") {
        const mesh = BABYLON.MeshBuilder.CreateTorus("torus", {diameter: opts.diameter || 1.2, thickness: opts.thickness || 0.1}, this.babylonScene);
        mesh.position = new BABYLON.Vector3(...(opts.position || [0, 3, 4.5]));
        mesh.material = new BABYLON.StandardMaterial("rimmat", this.babylonScene);
        mesh.material.diffuseColor = new BABYLON.Color3(
          ...(opts.color || [1, 0.5, 0])
        );
        return mesh;
      }
      if (type === "sphere") {
        const mesh = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: opts.diameter || 0.5}, this.babylonScene);
        mesh.position = new BABYLON.Vector3(...(opts.position || [0, 1, 0]));
        mesh.material = new BABYLON.StandardMaterial("ballmat", this.babylonScene);
        mesh.material.diffuseColor = new BABYLON.Color3(
          ...(opts.color || [1, 0.5, 0])
        );
        return mesh;
      }
      throw new Error("Unknown 3D mesh type: " + type);
    } catch (err) {
      this._onFatalError("Babylon mesh error: " + err.message);
    }
  }

  // Phaser overlay
  addPhaserText(text, x = 30, y = 60, style = { font: '24px Arial', fill: '#6ff' }) {
    try {
      const scene = this.phaserGame.scene.scenes[0];
      if (scene && scene.add) {
        scene.add.text(x, y, text, style);
      } else {
        this._pendingTexts.push([x, y, text, style]);
      }
    } catch (err) {
      this._onFatalError("Phaser UI error: " + err.message);
    }
  }

  // Scene/state management
  changeScene(name) {
    // Remove all Babylon meshes except camera and light.
    for (let i = this.babylonScene.meshes.length - 1; i >= 0; --i) {
      const mesh = this.babylonScene.meshes[i];
      if (!(mesh instanceof BABYLON.Camera) && !(mesh instanceof BABYLON.Light)) {
        mesh.dispose();
      }
    }
    // Remove Phaser UI overlays for the scene
    const scene = this.phaserGame.scene.scenes[0];
    if (scene && scene.children) {
      scene.children.removeAll();
    } else {
      this._pendingSceneLabels = [];
    }
    // Add a new label for the new scene (for demo)
    this.addPhaserText(`Scene: ${name}`, 50, 40, { font: '28px Arial', fill: '#ff0' });
    this.currentScene = name;
  }

  start() {
    const loop = () => {
      if (this._error) return;
      try {
        const now = performance.now();
        const dt = (now - this.lastFrame) / 1000;
        this.lastFrame = now;
        for (let sys of this.systems) {
          try {
            sys(dt, this);
          } catch (err) {
            this._onFatalError("System error: " + err.message);
            break;
          }
        }
        this.babylonEngine.resize();
        this.babylonScene.render();
      } catch (err) {
        this._onFatalError("Render loop error: " + err.message);
        return;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  _onResize() {
    try {
      this.babylonEngine.resize();
      if (this.phaserGame.scale && typeof this.phaserGame.scale.resize === 'function') {
        this.phaserGame.scale.resize(window.innerWidth, window.innerHeight);
      }
    } catch (err) {
      this._onFatalError("Resize error: " + err.message);
    }
  }
}

window.NextGenEngine = NextGenEngine;
