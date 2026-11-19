/* Nordic Kingdom — galaxy map of the alliance.
   Ten guilds as hologram planets (Three.js), each drawn by a shader from its own Star Wars world,
   tinted with the guild colour. Loaded on demand, together with vendor/three.min.js. */
(function () {
  'use strict';

  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; } return s; }
  float hash3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  // 1 on the iso-line v = integer, 0 elsewhere (anti-aliased)
  float line(float v, float w){ float d=abs(fract(v+0.5)-0.5); float f=fwidth(v)*1.2; return 1.0-smoothstep(w,w+f,d); }
  // lit points on a 3D lattice (city lights, trees, spires)
  float dots(vec3 p, float n, float thr, float size){ vec3 c=floor(p*n); vec3 f=fract(p*n)-0.5; float on=step(thr,hash3(c)); return on*(1.0-smoothstep(size*0.6,size,length(f))); }
  // cellular edges (crystals, ice plates)
  float cells(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=8.0, d2=8.0;
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 o=vec3(float(x),float(y),float(z));
      vec3 r=o+vec3(hash3(i+o),hash3(i+o+7.1),hash3(i+o+13.7))-f; float d=dot(r,r); if(d<d1){d2=d1;d1=d;} else if(d<d2){d2=d;} }
    return sqrt(d2)-sqrt(d1); }
  `;

  const VERT = `
  varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    vPos = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mv;
  }`;

  // uType: 0 forest · 1 desert · 2 shattered · 3 city · 4 lakes · 5 plains · 6 crystal · 7 domes · 8 ice · 9 gas
  const FRAG = NOISE + `
  uniform vec3 uTint; uniform float uTime; uniform int uType; uniform float uDpr; uniform float uHover; uniform float uSeed; uniform float uRadius;
  varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    vec3 p = vPos + uSeed;
    vec3 q = vPos;
    float lat = asin(clamp(q.y, -1.0, 1.0));
    float lon = atan(q.z, q.x);
    float h = fbm(p * 2.2);
    float land = smoothstep(-0.02, 0.06, h);
    float lines = 0.0, fill = 0.0;
    if (uType == 0) {                  // Kashyyyk: continents of canopy, dense tree points
      lines = line(h, 0.03) + line(h * 6.0, 0.01) * 0.35 * land;
      fill = land * 0.06 + dots(q, 46.0, 0.55, 0.32) * land * 0.55;
    } else if (uType == 1) {           // Tatooine: dune ripples, one or two basins
      float d = q.y * 26.0 + fbm(p * 3.0) * 3.0;
      lines = line(d, 0.04) * 0.75 + line(fbm(p * 1.3) * 4.0, 0.012) * 0.35;
      fill = 0.03;
    } else if (uType == 2) {           // Malachor: dark crust split by glowing fractures
      float c = 1.0 - smoothstep(0.0, 0.05, abs(snoise(p * 3.2)));
      float c2 = 1.0 - smoothstep(0.0, 0.03, abs(snoise(p * 7.0 + 3.0)));
      lines = c * 1.1 + c2 * 0.45;
      fill = 0.02;
    } else if (uType == 3) {           // Coruscant: city lights over a block grid
      float g = max(line(lat * 22.0 / 3.14159, 0.03), line(lon * 22.0 / 3.14159, 0.03));
      lines = g * 0.35;
      fill = dots(q, 70.0, 0.35, 0.3) * 0.7 + dots(q, 24.0, 0.8, 0.22) * 0.6 + 0.04;
    } else if (uType == 4) {           // Naboo: rolling plains, lakes, soft contours
      lines = line(h, 0.03) + line(h * 9.0, 0.008) * 0.3;
      float lake = smoothstep(0.55, 0.6, snoise(p * 5.0) * 0.5 + 0.5) * land;
      fill = land * 0.05 + lake * 0.35;
    } else if (uType == 5) {           // Lothal: open grassland, scattered rock spires
      lines = line(h * 2.0, 0.015) * 0.6;
      fill = dots(q, 30.0, 0.86, 0.34) * 0.9 + land * 0.03;
    } else if (uType == 6) {           // Ilum: ice crystal facets
      float e = 1.0 - smoothstep(0.0, 0.07, cells(p * 4.5));
      lines = e * 0.9;
      fill = 0.03 + dots(q, 18.0, 0.9, 0.25) * 0.7;
    } else if (uType == 7) {           // Mandalore: desert under city domes
      vec2 uv = vec2(lon * 3.0, lat * 4.0);
      vec2 r = vec2(1.0, 1.732); vec2 hh = r * 0.5;
      vec2 a = mod(uv, r) - hh; vec2 b = mod(uv - hh, r) - hh;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      float hexd = 0.5 - max(abs(gv.x) * 0.866 + abs(gv.y) * 0.5, abs(gv.y));
      float dome = step(0.62, hash3(floor(vec3(uv * 1.0, 1.0)))) ;
      lines = (1.0 - smoothstep(0.0, 0.05, hexd)) * 0.55 * (0.4 + dome) + line(q.y * 18.0 + fbm(p * 2.0) * 2.0, 0.02) * 0.25;
      fill = 0.03;
    } else if (uType == 8) {           // Hoth: ice sheet, crevasses, polar rings
      float cr = 1.0 - smoothstep(0.0, 0.04, abs(snoise(p * 5.5)));
      lines = cr * 0.7 + line(abs(q.y) * 6.0, 0.02) * 0.4 * smoothstep(0.55, 0.8, abs(q.y));
      fill = 0.05 + smoothstep(0.7, 0.95, abs(q.y)) * 0.18;
    } else {                           // Bespin: gas giant bands and storms
      float band = q.y * 9.0 + fbm(vec3(q.x * 2.0, q.y * 6.0, q.z * 2.0) + uTime * 0.02) * 1.2;
      lines = line(band, 0.06) * 0.8 + line(band * 2.0, 0.015) * 0.3;
      fill = (sin(band * 3.14159) * 0.5 + 0.5) * 0.06;
    }
    float grid = max(line(lat / 3.14159 * 12.0, 0.006), line(lon / 3.14159 * 12.0, 0.006)) * 0.14;
    float facing = step(0.0, dot(vN, vV));                       // 1 = side facing the camera
    float ndv = max(dot(vN, vV), 0.0);
    float back = mix(0.22, 1.0, facing);                         // far side shows faintly through
    float rim = pow(1.0 - ndv, 3.0) * 1.35 * facing;
    float body = (fill + lines + grid) * back;
    float scan = 0.6 + 0.4 * step(0.5, fract(gl_FragCoord.y / uDpr / 3.0));
    float sweepY = mod(uTime * 0.5 + uSeed, 3.2) - 1.6;
    float sweep = exp(-pow((vY / uRadius - sweepY) * 8.0, 2.0)) * 0.45 * back;
    float flicker = 0.93 + 0.07 * snoise(vec3(uTime * 7.0, uSeed, 0.0));
    float boost = 1.0 + uHover * 0.55;
    float a = clamp((body * scan + rim + sweep) * flicker * boost, 0.0, 1.0);
    vec3 col = uTint * a + vec3(1.0) * pow(lines * back, 2.0) * 0.12;
    gl_FragColor = vec4(col, a);
  }`;

  function ringTexture(THREE) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.56, 'rgba(255,255,255,0)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.55)'); r.addColorStop(0.72, 'rgba(255,255,255,0.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  }
  function dotTexture(THREE) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }

  /**
   * create({ canvas, stage, labels: Map<id, HTMLElement>, guilds: [{ id, tint, type, radius, orbit, speed, phase, tilt }],
   *          reduceMotion: MediaQueryList, onHover(id|null), isPaused() })
   */
  function create(opts) {
    const THREE = window.THREE;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    const ring = ringTexture(THREE), dot = dotTexture(THREE);
    const system = new THREE.Group(); system.rotation.x = 0.0; scene.add(system);

    // faint background stars
    const sp = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) { sp[i * 3] = (Math.random() - 0.5) * 90; sp[i * 3 + 1] = (Math.random() - 0.5) * 50; sp[i * 3 + 2] = -20 - Math.random() * 40; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.22, map: dot, color: 0xbfd8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));

    const sphereGeo = new THREE.SphereGeometry(1, 96, 72);
    const planets = opts.guilds.map((g, i) => {
      const tint = new THREE.Color(g.tint);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { uTint: { value: tint }, uTime: { value: 0 }, uType: { value: g.type }, uDpr: { value: dpr }, uHover: { value: 0 }, uSeed: { value: i * 1.37 }, uRadius: { value: 1 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const pivot = new THREE.Group(); system.add(pivot);
      const body = new THREE.Mesh(sphereGeo, mat); body.scale.setScalar(g.radius); body.rotation.z = 0.25; pivot.add(body);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ring, color: tint, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(g.radius * 3.36); pivot.add(halo);
      let orbitLine = null;
      if (g.orbit > 0) {
        const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * g.orbit, 0, Math.sin(a) * g.orbit * 0.58)); }
        orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
        system.add(orbitLine);
      }
      return { g, pivot, body, mat, halo, orbitLine, hover: 0, target: 0, pos: new THREE.Vector3(), screen: { x: 0, y: 0, r: 0, z: 0 } };
    });

    let width = 1, height = 1, hovered = null, focusId = null, pulse = { id: null, t: 0 };
    function resize() {
      const r = opts.stage.getBoundingClientRect();
      width = Math.max(1, r.width); height = Math.max(1, r.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const narrow = width < 640;
      // wide screens: a low, cinematic angle on the orbital plane; phones: seen from above so the orbits fill the height
      camera.fov = narrow ? 46 : 34;
      if (narrow) { camera.position.set(0, 17, 6.5); camera.lookAt(0, 0, 1.3); }
      else { camera.position.set(0, 11, 12.5); camera.lookAt(0, -0.6, 0.6); }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      fit(narrow ? 0.8 : 1);
    }
    // Scale the system so the widest orbit (planet and halo included) always stays inside the frame
    const outer = opts.guilds.reduce((m, g) => Math.max(m, g.orbit + g.radius * 1.8), 0);
    function fit(base) {
      let s = base;
      const v = new THREE.Vector3();
      for (let pass = 0; pass < 3; pass++) {
        system.scale.setScalar(s); system.updateMatrixWorld(true);
        let mx = 0, my = 0;
        for (let k = 0; k < 48; k++) {
          const a = k / 48 * Math.PI * 2;
          v.set(Math.cos(a) * outer, 0, Math.sin(a) * outer * 0.58).applyMatrix4(system.matrixWorld).project(camera);
          mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y));
        }
        const k = Math.min(1, 0.94 / mx, 0.9 / my);
        if (k > 0.995) break;
        s *= k;
      }
      system.scale.setScalar(Math.min(base, s));
    }
    const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(opts.stage); else window.addEventListener('resize', resize);
    resize();

    // pointer picking on projected discs (planets are spheres: no raycaster needed)
    function pick(x, y) {
      let best = null, bd = Infinity;
      planets.forEach(p => {
        const dx = x - p.screen.x, dy = y - p.screen.y; const d = Math.hypot(dx, dy);
        const hit = Math.max(p.screen.r * 1.15, 22);
        if (d < hit && p.screen.z < bd) { bd = p.screen.z; best = p; }
      });
      return best;
    }
    function setHover(id) {
      if (hovered === id) return;
      hovered = id;
      opts.onHover && opts.onHover(id);
    }
    opts.canvas.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = opts.canvas.getBoundingClientRect();
      const p = pick(e.clientX - r.left, e.clientY - r.top);
      opts.canvas.style.cursor = p ? 'pointer' : '';
      setHover(p ? p.g.id : null);
    });
    opts.canvas.addEventListener('pointerleave', () => { opts.canvas.style.cursor = ''; setHover(null); });
    opts.canvas.addEventListener('click', e => {
      const r = opts.canvas.getBoundingClientRect();
      const p = pick(e.clientX - r.left, e.clientY - r.top);
      if (p) opts.labels.get(p.g.id)?.click();
    });

    let last = performance.now(), time = 0, running = true, visible = true;
    const v = new THREE.Vector3();
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible || document.hidden || (opts.isPaused && opts.isPaused())) return;
      const still = opts.reduceMotion.matches;
      if (!still) time += dt;
      planets.forEach(p => {
        const g = p.g;
        const ang = g.phase + (still ? 0 : time * g.speed);
        p.pivot.position.set(Math.cos(ang) * g.orbit, Math.sin(ang * 0.7 + g.phase) * 0.12 * (g.orbit ? 1 : 0), Math.sin(ang) * g.orbit * 0.58);
        if (!still) p.body.rotation.y += dt * (0.12 + 0.1 / g.radius);
        p.target = (hovered === g.id || focusId === g.id) ? 1 : 0;
        p.hover += (p.target - p.hover) * (still ? 1 : 1 - Math.exp(-dt * 10));
        let pulseK = 0;
        if (pulse.id === g.id) { pulse.t += dt; pulseK = Math.max(0, 1 - pulse.t / 1.2) * Math.sin(Math.min(1, pulse.t / 1.2) * Math.PI); if (pulse.t > 1.2) pulse.id = null; }
        const s = g.radius * (1 + p.hover * 0.14 + pulseK * 0.12);
        p.body.scale.setScalar(s);
        p.halo.scale.setScalar(s * 3.36);
        p.halo.material.opacity = 0.4 + p.hover * 0.35 + pulseK * 0.4;
        p.mat.uniforms.uTime.value = time + g.phase;
        p.mat.uniforms.uHover.value = Math.max(p.hover, pulseK);
        if (p.orbitLine) p.orbitLine.material.opacity = 0.1 + p.hover * 0.35;
        // screen position for labels and picking
        p.pivot.getWorldPosition(v); v.project(camera);
        p.screen.x = (v.x * 0.5 + 0.5) * width; p.screen.y = (-v.y * 0.5 + 0.5) * height; p.screen.z = v.z;
        const edge = p.pivot.position.clone().add(new THREE.Vector3(s, 0, 0)).applyMatrix4(system.matrixWorld).project(camera);
        p.screen.r = Math.abs((edge.x * 0.5 + 0.5) * width - p.screen.x);
        const label = opts.labels.get(g.id);
        if (label) {
          label.style.transform = `translate3d(${p.screen.x.toFixed(1)}px, ${(p.screen.y + p.screen.r + 6).toFixed(1)}px, 0) translateX(-50%)`;
          label.style.zIndex = String(1000 - Math.round(v.z * 500));
        }
      });
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
    if (io) io.observe(opts.stage);

    return {
      setFocus(id) { focusId = id; },
      setHover,
      pulse(id) { pulse = { id, t: 0 }; },
      resize,
      destroy() { running = false; if (ro) ro.disconnect(); if (io) io.disconnect(); renderer.dispose(); },
    };
  }

  window.NKGalaxy = { create };
})();
