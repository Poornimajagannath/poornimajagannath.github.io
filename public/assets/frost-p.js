/**
 * Frosted glass "P" — real display-font glyph with soft iridescent lighting.
 * No procedural letterform guessing; the shape is an actual uppercase P.
 */
(() => {
  const canvas = document.querySelector("[data-frost-p]");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    }) ||
    canvas.getContext("experimental-webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

  if (!gl) {
    canvas.replaceWith(fallbackMark());
    return;
  }

  const vs = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Fake-depth frosted P from a glyph alpha atlas + screen-space normals.
  const fs = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_glyph;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_pointer;
    uniform float u_dark;

    float sampleA(vec2 uv) {
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
      return texture2D(u_glyph, uv).a;
    }

    vec3 pastel(vec2 uv, float ndotl) {
      float t = fract(uv.y * 0.85 + uv.x * 0.35 + u_time * 0.04 + ndotl * 0.15);
      vec3 c1 = vec3(0.55, 0.78, 1.00);
      vec3 c2 = vec3(0.72, 0.62, 0.98);
      vec3 c3 = vec3(0.98, 0.55, 0.78);
      vec3 c4 = vec3(1.00, 0.72, 0.48);
      vec3 c5 = vec3(0.78, 0.94, 0.52);
      vec3 col;
      if (t < 0.25) col = mix(c1, c2, t / 0.25);
      else if (t < 0.5) col = mix(c2, c3, (t - 0.25) / 0.25);
      else if (t < 0.75) col = mix(c3, c4, (t - 0.5) / 0.25);
      else col = mix(c4, c5, (t - 0.75) / 0.25);
      // Frosted milk wash
      col = mix(col, vec3(0.97, 0.97, 0.99), 0.28);
      return mix(col, col * 0.72, u_dark * 0.35);
    }

    void main() {
      // Parallax / idle drift in UV space (keeps silhouette readable)
      vec2 drift = vec2(
        u_pointer.x * 0.012 + sin(u_time * 0.35) * 0.006,
        -u_pointer.y * 0.010 + cos(u_time * 0.28) * 0.004
      );
      vec2 uv = v_uv + drift;

      float a = sampleA(uv);
      if (a < 0.04) {
        gl_FragColor = vec4(0.0);
        return;
      }

      // Screen-space normal from glyph alpha gradient
      vec2 px = 1.0 / u_res;
      float ax = sampleA(uv + vec2(px.x * 2.0, 0.0)) - sampleA(uv - vec2(px.x * 2.0, 0.0));
      float ay = sampleA(uv + vec2(0.0, px.y * 2.0)) - sampleA(uv - vec2(0.0, px.y * 2.0));
      vec3 n = normalize(vec3(-ax * 4.5, -ay * 4.5, 1.0));

      // Soft “extrusion” rim: peek at offset samples toward light
      vec3 light = normalize(vec3(0.35 + u_pointer.x * 0.4, 0.7, 0.55));
      float sides = 0.0;
      for (int i = 1; i <= 5; i++) {
        float f = float(i);
        vec2 off = light.xy * (f * 1.6) * px * 3.0;
        sides += sampleA(uv - off) * (1.0 - f / 6.0);
      }
      sides = clamp(sides / 3.0, 0.0, 1.0);

      float ndotl = clamp(dot(n, light) * 0.5 + 0.5, 0.0, 1.0);
      vec3 albedo = pastel(uv + drift * 2.0, ndotl);

      // Face vs frosted rim
      vec3 face = mix(albedo, vec3(0.98, 0.98, 1.0), 0.35 + 0.25 * ndotl);
      vec3 rimCol = pastel(uv + vec2(0.08, -0.05), 0.2) * 0.95;
      vec3 col = mix(face, rimCol, sides * 0.55 * (1.0 - a * 0.25));

      // Broad frosted specular
      vec3 h = normalize(light + vec3(0.0, 0.0, 1.0));
      float spec = pow(max(dot(n, h), 0.0), 28.0) * 0.4;
      col += vec3(1.0) * spec * (0.55 + 0.45 * a);

      // Soft contact shadow under the glyph (no card/frame)
      float below = sampleA(uv + vec2(0.0, -0.045));
      float shadow = smoothstep(0.0, 1.0, below) * (1.0 - a) * 0.0; // unused plate
      col *= (0.88 + 0.12 * ndotl);

      float alpha = clamp(a + sides * 0.35, 0.0, 1.0);
      alpha = pow(alpha, 0.92);
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

  async function buildGlyphTexture() {
    const size = 1024;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");

    try {
      await document.fonts.load('600 720px "Lora-c8b8e429f5b51570"');
      await document.fonts.load("600 720px Lora");
    } catch (_) {}
    await document.fonts.ready.catch(() => {});

    ctx.clearRect(0, 0, size, size);
    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--blume-ff-lora").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--blume-font-display").trim() ||
      'Lora, "Times New Roman", Georgia, serif';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 720px ${family}`;
    // Slight optical centering for Lora’s P
    ctx.fillText("P", size * 0.5, size * 0.55);

    const img = ctx.getImageData(0, 0, size, size);
    let ink = 0;
    for (let i = 0; i < img.data.length; i += 4) ink += img.data[i + 3] > 10 ? 1 : 0;
    if (ink < size * size * 0.01) throw new Error("empty glyph");

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    return tex;
  }

  (async () => {
    let glyphTex;
    try {
      glyphTex = await buildGlyphTexture();
    } catch (err) {
      console.warn("[frost-p]", err);
      canvas.replaceWith(fallbackMark());
      return;
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
    const uGlyph = gl.getUniformLocation(prog, "u_glyph");

    gl.useProgram(prog);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.uniform1i(uGlyph, 0);

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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      const t = reduceMotion ? 0.6 : (now - start) * 0.001;
      if (!reduceMotion) {
        pointer.x += (target.x - pointer.x) * 0.08;
        pointer.y += (target.y - pointer.y) * 0.08;
      }

      // Mild CSS tilt on the stage for depth without fighting the glyph
      if (stage && !reduceMotion) {
        const rx = (-pointer.y * 7).toFixed(2);
        const ry = (pointer.x * 9 + Math.sin(t * 0.35) * 3).toFixed(2);
        stage.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
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

    stage?.addEventListener(
      "pointermove",
      (e) => {
        if (reduceMotion || !stage) return;
        const r = stage.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        kick();
      },
      { passive: true }
    );
    stage?.addEventListener(
      "pointerleave",
      () => {
        target.x = 0;
        target.y = 0;
        if (stage) stage.style.transform = "";
      },
      { passive: true }
    );
    window.addEventListener("resize", () => {
      resize();
      kick();
    });
    new MutationObserver(() => kick()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          visible = entries.some((en) => en.isIntersecting);
          if (visible) kick();
        },
        { threshold: 0.05 }
      ).observe(canvas);
    }
    kick();
  })();

  function fallbackMark() {
    const el = document.createElement("div");
    el.className = "soft-hero__mark soft-hero__mark--fallback";
    el.setAttribute("aria-hidden", "true");
    el.textContent = "P";
    el.style.cssText = [
      'font-family: var(--blume-ff-lora), var(--blume-font-display), Lora, Georgia, serif',
      "font-size: clamp(7rem, 28vw, 13rem)",
      "font-weight: 600",
      "letter-spacing: -0.06em",
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
