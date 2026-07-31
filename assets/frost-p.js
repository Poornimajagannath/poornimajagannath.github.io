/**
 * Frosted glass "P" — soft raymarched mark for the home hero.
 * Material language inspired by translucent physical lighting;
 * pastel rainbow albedo, slow idle motion, light pointer drift.
 */
(() => {
  const canvas = document.querySelector("[data-frost-p]");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    }) ||
    canvas.getContext("experimental-webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });

  if (!gl) {
    canvas.replaceWith(fallbackMark());
    return;
  }

  const vs = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Raymarched rounded "P" with frosted translucent shading.
  const fs = `
    precision highp float;

    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_pointer;
    uniform float u_dark;

    #define MAX_STEPS 72
    #define MAX_DIST 18.0
    #define SURF 0.0016

    float sdRoundBox(vec3 p, vec3 b, float r) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
    }

    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
      vec3 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h) - r;
    }

    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }

    float opSmoothUnion(float d1, float d2, float k) {
      float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
      return mix(d2, d1, h) - k * h * (1.0 - h);
    }

    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    // Rounded tubular uppercase P in local space.
    float sdLetterP(vec3 p) {
      // Tall stem — clear uppercase proportion
      float stem = sdCapsule(p, vec3(-0.7, -1.35, 0.0), vec3(-0.7, 1.25, 0.0), 0.33);

      // Bowl sits on the upper half
      vec3 q = p - vec3(-0.18, 0.48, 0.0);
      float bowl = sdTorus(q.xzy, vec2(0.58, 0.33));

      // Right half only (open counter of the P)
      bowl = max(bowl, -q.x);

      // Keep bowl in the upper body
      float bowlGate = sdRoundBox(p - vec3(0.05, 0.48, 0.0), vec3(0.95, 0.7, 0.5), 0.08);
      bowl = max(bowl, bowlGate);

      // Join stem to bowl
      float join = sdRoundBox(p - vec3(-0.38, 0.48, 0.0), vec3(0.3, 0.58, 0.22), 0.16);

      float d = opSmoothUnion(stem, bowl, 0.11);
      d = opSmoothUnion(d, join, 0.1);
      return d;
    }

    float map(vec3 p) {
      // Idle + pointer tilt — three-quarter view that keeps the counter open
      p.yz *= rot(-0.05 + u_pointer.y * 0.16);
      p.xz *= rot(0.22 + u_pointer.x * 0.26 + u_time * 0.12);
      p.xy *= rot(sin(u_time * 0.26) * 0.035);
      return sdLetterP(p);
    }

    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.0018, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
      ));
    }

    float softShadow(vec3 ro, vec3 rd, float k) {
      float res = 1.0;
      float t = 0.04;
      for (int i = 0; i < 24; i++) {
        float h = map(ro + rd * t);
        res = min(res, k * h / t);
        t += clamp(h, 0.03, 0.2);
        if (res < 0.02 || t > 6.0) break;
      }
      return clamp(res, 0.0, 1.0);
    }

    // Soft ambient lobes — a cheap spherical-harmonics-like wash.
    vec3 shAmbient(vec3 n) {
      vec3 sky = mix(vec3(0.78, 0.86, 0.98), vec3(0.42, 0.52, 0.72), u_dark);
      vec3 ground = mix(vec3(0.96, 0.90, 0.86), vec3(0.18, 0.16, 0.2), u_dark);
      vec3 warm = mix(vec3(1.0, 0.82, 0.78), vec3(0.55, 0.32, 0.4), u_dark);
      vec3 cool = mix(vec3(0.72, 0.84, 1.0), vec3(0.25, 0.35, 0.55), u_dark);
      vec3 a =
        sky * (0.55 + 0.45 * n.y) +
        ground * (0.45 - 0.35 * n.y) +
        warm * max(0.0, dot(n, normalize(vec3(0.6, 0.2, 0.5)))) * 0.55 +
        cool * max(0.0, dot(n, normalize(vec3(-0.7, 0.35, 0.2)))) * 0.45;
      return a;
    }

    // Pastel rainbow keyed to letter height / depth.
    vec3 pastelAlbedo(vec3 p, vec3 n) {
      float h = clamp((p.y + 1.25) / 2.5, 0.0, 1.0);
      float swirl = fract(h * 0.85 + 0.18 * p.x + 0.1 * p.z + 0.08 * sin(p.y * 2.4 + u_time * 0.55));
      vec3 c1 = vec3(0.55, 0.78, 1.00); // sky blue
      vec3 c2 = vec3(0.72, 0.62, 0.98); // lilac
      vec3 c3 = vec3(0.98, 0.55, 0.78); // pink
      vec3 c4 = vec3(1.00, 0.72, 0.48); // peach
      vec3 c5 = vec3(0.78, 0.94, 0.52); // lime
      vec3 col;
      if (swirl < 0.25) col = mix(c1, c2, swirl / 0.25);
      else if (swirl < 0.5) col = mix(c2, c3, (swirl - 0.25) / 0.25);
      else if (swirl < 0.75) col = mix(c3, c4, (swirl - 0.5) / 0.25);
      else col = mix(c4, c5, (swirl - 0.75) / 0.25);
      // Keep a little frosted milk, but let color stay visible
      float fres = pow(1.0 - abs(dot(n, normalize(-vec3(p.xy * 0.15, 1.0)))), 2.0);
      col = mix(col, vec3(0.96, 0.97, 0.99), 0.12 + 0.22 * fres);
      return col;
    }

    vec3 shade(vec3 p, vec3 n, vec3 rd, vec3 ro) {
      vec3 albedo = pastelAlbedo(p, n);

      vec3 lightDir = normalize(vec3(
        0.45 + u_pointer.x * 0.55,
        0.85,
        0.55 - u_pointer.y * 0.35
      ));
      float wrap = dot(n, lightDir) * 0.5 + 0.5;
      float diff = pow(wrap, 1.25);
      float shadow = softShadow(p + n * 0.02, lightDir, 8.0);
      shadow = mix(0.62, 1.0, shadow);

      // Specular — broad frosted highlight
      vec3 h = normalize(lightDir - rd);
      float spec = pow(max(dot(n, h), 0.0), 22.0) * 0.34;
      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.4) * 0.42;

      vec3 amb = shAmbient(n);
      vec3 lit =
        albedo * amb * 0.55 +
        albedo * diff * shadow * mix(vec3(1.0, 0.96, 0.93), vec3(0.92, 0.88, 1.0), u_dark) * 1.05 +
        mix(albedo, vec3(1.0), 0.35) * spec * shadow +
        albedo * rim;

      // Soft translucency: light bleeding through
      float thickness = clamp(0.55 + 0.45 * p.z, 0.2, 1.0);
      lit += albedo * 0.28 * (1.0 - thickness) * wrap;

      // Very soft ground contact cue from camera space y
      float floorFade = smoothstep(-1.6, -0.2, p.y);
      lit *= mix(0.86, 1.0, floorFade);

      return lit;
    }

    vec3 march(vec3 ro, vec3 rd) {
      float t = 0.0;
      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < SURF) {
          vec3 n = calcNormal(p);
          return shade(p, n, rd, ro);
        }
        t += d * 0.85;
        if (t > MAX_DIST) break;
      }
      return vec3(0.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
      uv.y *= -1.0;

      vec3 ro = vec3(0.0, 0.08, 4.1);
      vec3 rd = normalize(vec3(uv * 1.05, -1.55));

      vec3 col = march(ro, rd);

      // Premultiplied-style alpha: only the letter is opaque-ish
      float alpha = max(max(col.r, col.g), col.b);
      alpha = smoothstep(0.02, 0.18, alpha);

      // Soft vignette-free composite onto transparent canvas
      col = pow(max(col, 0.0), vec3(0.92));
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[frost-p]", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vsh = compile(gl.VERTEX_SHADER, vs);
  const fsh = compile(gl.FRAGMENT_SHADER, fs);
  if (!vsh || !fsh) {
    canvas.replaceWith(fallbackMark());
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[frost-p]", gl.getProgramInfoLog(prog));
    canvas.replaceWith(fallbackMark());
    return;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uPointer = gl.getUniformLocation(prog, "u_pointer");
  const uDark = gl.getUniformLocation(prog, "u_dark");

  gl.useProgram(prog);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let pointer = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let raf = 0;
  let start = performance.now();
  let visible = true;

  const stage = canvas.closest(".soft-hero__mark-stage") || canvas.parentElement;

  function isDark() {
    return document.documentElement.dataset.theme === "dark" ? 1 : 0;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    resize();

    const t = reduceMotion ? 0.8 : (now - start) * 0.001;
    if (!reduceMotion) {
      pointer.x += (target.x - pointer.x) * 0.06;
      pointer.y += (target.y - pointer.y) * 0.06;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uDark, isDark());
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!reduceMotion) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function onPointer(e) {
    if (reduceMotion || !stage) return;
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    target.x = Math.max(-1, Math.min(1, x));
    target.y = Math.max(-1, Math.min(1, y));
    kick();
  }

  stage?.addEventListener("pointermove", onPointer, { passive: true });
  stage?.addEventListener(
    "pointerleave",
    () => {
      target.x = 0;
      target.y = 0;
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    resize();
    kick();
  });

  const themeObs = new MutationObserver(() => kick());
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((en) => en.isIntersecting);
        if (visible) kick();
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);
  }

  kick();

  function fallbackMark() {
    const el = document.createElement("div");
    el.className = "soft-hero__mark soft-hero__mark--fallback";
    el.setAttribute("aria-hidden", "true");
    el.textContent = "P";
    el.style.cssText = [
      "font-family: var(--blume-font-display), ui-serif, Georgia, serif",
      "font-size: clamp(7rem, 28vw, 13rem)",
      "font-weight: 520",
      "letter-spacing: -0.08em",
      "line-height: 0.85",
      "display: grid",
      "place-items: center",
      "height: 100%",
      "background: linear-gradient(135deg, #9ec0f0, #c6a8e8, #f0a8c4, #f0c089, #c8d96a)",
      "-webkit-background-clip: text",
      "background-clip: text",
      "color: transparent",
      "filter: drop-shadow(0 18px 30px rgba(40, 30, 50, 0.18))",
      "user-select: none",
    ].join(";");
    return el;
  }
})();
