/* BeanBeanMouse reflective business card.
 * Vanilla integration for the existing SPA: WebGL2 material + DOM 3D transform.
 * The card texture stays flat; the environment reflection is sampled separately.
 */
(function () {
  'use strict';

  const VERTEX_SHADER = `#version 300 es
    layout(location = 0) in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;

  const FRAGMENT_SHADER = `#version 300 es
    precision highp float;
    uniform sampler2D uCardTexture;
    uniform sampler2D uEnvironmentTexture;
    uniform vec2 uResolution;
    uniform vec2 uAngleTilt;
    uniform vec2 uPointer;
    uniform float uHasCard;
    in vec2 vUv;
    out vec4 outColor;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    vec2 noiseSlope(vec2 uv) {
      float e = 1.0 / max(uResolution.x, 1.0);
      float n = valueNoise(uv * vec2(95.0, 70.0));
      float nx = valueNoise((uv + vec2(e, 0.0)) * vec2(95.0, 70.0));
      float ny = valueNoise((uv + vec2(0.0, e)) * vec2(95.0, 70.0));
      return vec2(nx - n, ny - n) * 18.0;
    }

    void main() {
      vec2 uv = vUv;
      vec2 micro = noiseSlope(uv);
      vec2 angleTilt = uAngleTilt * 0.36;
      vec3 normal = normalize(vec3(micro + angleTilt + uPointer * 0.035, 1.0));
      vec3 incident = normalize(vec3(0.0, 0.0, -1.0));
      vec3 reflected = reflect(incident, normal);
      vec2 q = reflected.xy / max(reflected.z, 0.2);
      vec2 reflectionUv = clamp(uv + 0.12 * q, vec2(0.002), vec2(0.998));

      vec3 environment = texture(uEnvironmentTexture, reflectionUv).rgb;
      float luminance = dot(environment, vec3(0.2126, 0.7152, 0.0722));
      environment = mix(vec3(luminance), environment, 0.42);

      vec3 card = texture(uCardTexture, uv).rgb;
      vec3 metalBase = mix(card, card * vec3(0.92, 0.96, 1.0) + 0.025, uHasCard);
      float edge = smoothstep(0.46, 0.5, abs(uv.x - 0.5)) + smoothstep(0.47, 0.5, abs(uv.y - 0.5));
      float fresnel = pow(1.0 - max(dot(normal, -incident), 0.0), 2.2);
      float movingBand = smoothstep(0.88, 1.0, sin((uv.x + uv.y + uAngleTilt.y * 0.16) * 9.0) * 0.5 + 0.5);
      vec3 reflection = environment * (0.16 + fresnel * 0.62 + edge * 0.12);
      vec3 specular = vec3(1.0, 0.91, 0.72) * movingBand * (0.055 + fresnel * 0.14);
      vec3 color = metalBase * 0.88 + reflection + specular;

      float vignette = smoothstep(0.82, 0.18, distance(uv, vec2(0.5)));
      color *= mix(0.82, 1.03, vignette);
      outColor = vec4(color, 1.0);
    }`;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'shader compile failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'program link failed';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function setPointerCaptureSafe(element, pointerId) {
    try { element.setPointerCapture(pointerId); } catch (error) { /* older browsers */ }
  }

  function releasePointerCaptureSafe(element, pointerId) {
    try { element.releasePointerCapture(pointerId); } catch (error) { /* older browsers */ }
  }

  function normalizeAngle(value) {
    let angle = value % 360;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    return angle;
  }

  function createReflectiveCard3D(stage, options) {
    if (!stage) return null;
    const settings = options || {};
    const rig = stage.querySelector('.metal-card-rig');
    const canvas = stage.querySelector('.metal-card-canvas');
    const fallback = stage.querySelector('.metal-card-fallback');
    if (!rig || !canvas) return null;

    const reducedMotionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const state = {
      mode: 'static',
      baseX: -5,
      baseY: -10,
      hoverX: 0,
      hoverY: 0,
      hoverVX: 0,
      hoverVY: 0,
      targetHoverX: 0,
      targetHoverY: 0,
      dragging: false,
      pointerId: null,
      pointerX: 0,
      pointerY: 0,
      lastPointerX: 0,
      lastPointerY: 0,
      downX: 0,
      downY: 0,
      downAt: 0,
      moved: false,
      running: true,
      ready: false,
      renderCount: 0,
      flipAnimation: null,
      raf: 0,
      lastFrame: 0
    };

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });

    let program = null;
    let vertexArray = null;
    let cardTexture = null;
    let environmentTexture = null;
    let cardImage = null;
    const uniforms = {};

    const rawEnvironment = document.createElement('canvas');
    const horizontalBlur = document.createElement('canvas');
    const verticalBlur = document.createElement('canvas');
    rawEnvironment.width = 128;
    rawEnvironment.height = 192;
    horizontalBlur.width = 128;
    horizontalBlur.height = 192;
    verticalBlur.width = 128;
    verticalBlur.height = 192;
    const rawContext = rawEnvironment.getContext('2d');
    const horizontalContext = horizontalBlur.getContext('2d');
    const verticalContext = verticalBlur.getContext('2d');

    function resizeCanvas() {
      if (!gl) return false;
      const rect = canvas.getBoundingClientRect();
      const deviceDpr = window.devicePixelRatio || 1;
      const dpr = state.mode === 'static'
        ? Math.min(2.5, Math.max(2, deviceDpr))
        : Math.min(2, Math.max(1.5, deviceDpr));
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === width && canvas.height === height) return false;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      return true;
    }

    function paintEnvironment() {
      if (!rawContext || !horizontalContext || !verticalContext || !gl) return;
      const width = rawEnvironment.width;
      const height = rawEnvironment.height;
      const blue = rawContext.createLinearGradient(0, 0, width, height);
      blue.addColorStop(0, '#06162F');
      blue.addColorStop(0.46, '#0A2A53');
      blue.addColorStop(1, '#020A18');
      rawContext.fillStyle = blue;
      rawContext.fillRect(0, 0, width, height);

      rawContext.save();
      rawContext.translate(width * 0.28, height * 0.26);
      rawContext.rotate(-0.16);
      rawContext.fillStyle = 'rgba(235, 244, 255, 0.94)';
      rawContext.fillRect(-4, -height, 8, height * 2);
      rawContext.fillStyle = 'rgba(255, 255, 255, 0.24)';
      rawContext.fillRect(13, -height, 2, height * 2);
      rawContext.restore();

      const warmX = width * 0.74;
      const warmY = height * 0.43;
      const warm = rawContext.createRadialGradient(warmX, warmY, 2, warmX, warmY, width * 0.48);
      warm.addColorStop(0, 'rgba(255, 244, 199, 1)');
      warm.addColorStop(0.2, 'rgba(243, 182, 95, 0.92)');
      warm.addColorStop(0.58, 'rgba(174, 92, 39, 0.4)');
      warm.addColorStop(1, 'rgba(45, 20, 8, 0)');
      rawContext.fillStyle = warm;
      rawContext.fillRect(0, 0, width, height);

      rawContext.save();
      rawContext.translate(width * 0.54, height * 0.72);
      rawContext.rotate(0.62);
      rawContext.fillStyle = 'rgba(202, 230, 255, 0.72)';
      rawContext.fillRect(-width, -3, width * 2, 6);
      rawContext.restore();

      horizontalContext.clearRect(0, 0, width, height);
      horizontalContext.save();
      horizontalContext.filter = 'blur(5px)';
      horizontalContext.drawImage(rawEnvironment, 0, 0);
      horizontalContext.restore();

      verticalContext.clearRect(0, 0, width, height);
      verticalContext.save();
      verticalContext.filter = 'blur(6px)';
      verticalContext.drawImage(horizontalBlur, 0, 0);
      verticalContext.restore();

      gl.bindTexture(gl.TEXTURE_2D, environmentTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, verticalBlur);
    }

    function initializeWebGL() {
      if (!gl) return false;
      try {
        program = createProgram(gl);
        gl.useProgram(program);
        vertexArray = gl.createVertexArray();
        gl.bindVertexArray(vertexArray);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        cardTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cardTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        environmentTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, environmentTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        uniforms.card = gl.getUniformLocation(program, 'uCardTexture');
        uniforms.environment = gl.getUniformLocation(program, 'uEnvironmentTexture');
        uniforms.resolution = gl.getUniformLocation(program, 'uResolution');
        uniforms.angleTilt = gl.getUniformLocation(program, 'uAngleTilt');
        uniforms.pointer = gl.getUniformLocation(program, 'uPointer');
        uniforms.hasCard = gl.getUniformLocation(program, 'uHasCard');
        gl.uniform1i(uniforms.card, 0);
        gl.uniform1i(uniforms.environment, 1);
        paintEnvironment();
        return true;
      } catch (error) {
        console.warn('[reflective-card] WebGL2 unavailable:', error.message);
        return false;
      }
    }

    function loadCardTexture() {
      const source = settings.imageUrl || (fallback && fallback.getAttribute('src')) || '';
      if (!source || !gl) return;
      const image = new Image();
      const isRemote = /^https?:/i.test(source) && new URL(source, location.href).origin !== location.origin;
      if (isRemote) image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (!state.running) return;
        cardImage = image;
        const ratio = (image.naturalWidth || 1050) + ' / ' + (image.naturalHeight || 600);
        rig.style.setProperty('--card-ratio', ratio);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cardTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        state.ready = true;
        stage.classList.add('is-webgl-ready');
        if (fallback) fallback.classList.add('is-hidden');
        updateTransform();
        render();
        if (state.mode === 'interactive') startLoop();
      };
      image.onerror = () => {
        stage.classList.add('is-webgl-fallback');
      };
      image.src = source;
    }

    function updateTransform() {
      const flipAnimation = state.flipAnimation;
      if (flipAnimation) {
        const progress = Math.min(1, (performance.now() - flipAnimation.started) / 520);
        const eased = 1 - Math.pow(1 - progress, 3);
        state.baseY = flipAnimation.from + (flipAnimation.to - flipAnimation.from) * eased;
        if (progress >= 1) state.flipAnimation = null;
      }
      const angleX = state.baseX + state.hoverX;
      const angleY = state.baseY + state.hoverY;
      rig.style.transform = 'rotateX(' + angleX.toFixed(3) + 'deg) rotateY(' + angleY.toFixed(3) + 'deg)';
      return { angleX, angleY };
    }

    function render() {
      if (!gl || !state.ready || !program) return;
      resizeCanvas();
      state.renderCount++;
      const angles = updateTransform();
      const radiansX = angles.angleX * Math.PI / 180;
      const radiansY = angles.angleY * Math.PI / 180;
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cardTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, environmentTexture);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.angleTilt, Math.sin(radiansY) * 0.82, Math.sin(radiansX) * 0.82);
      gl.uniform2f(uniforms.pointer, state.pointerX, state.pointerY);
      gl.uniform1f(uniforms.hasCard, cardImage ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function stopLoop() {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.lastFrame = 0;
    }

    function startLoop() {
      if (!state.running || state.raf) return;
      state.lastFrame = 0;
      state.raf = requestAnimationFrame(frame);
    }

    function frame(time) {
      if (!state.running) return;
      const delta = state.lastFrame ? Math.min(0.034, (time - state.lastFrame) / 1000) : 0.016;
      state.lastFrame = time;
      let springActive = false;
      if (state.mode === 'interactive' && !state.dragging) {
        const stiffness = 120;
        const damping = 16;
        const forceX = (state.targetHoverX - state.hoverX) * stiffness - state.hoverVX * damping;
        const forceY = (state.targetHoverY - state.hoverY) * stiffness - state.hoverVY * damping;
        state.hoverVX += forceX * delta;
        state.hoverVY += forceY * delta;
        state.hoverX += state.hoverVX * delta;
        state.hoverY += state.hoverVY * delta;
        springActive = Math.abs(state.targetHoverX - state.hoverX) + Math.abs(state.targetHoverY - state.hoverY) > 0.025
          || Math.abs(state.hoverVX) + Math.abs(state.hoverVY) > 0.04;
      }
      const flipActive = !!state.flipAnimation;
      updateTransform();
      render();
      if (flipActive || (state.mode === 'interactive' && (state.dragging || springActive))) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.raf = 0;
        state.lastFrame = 0;
      }
    }

    function reset() {
      state.baseX = -5;
      state.baseY = -10;
      state.hoverX = 0;
      state.hoverY = 0;
      state.hoverVX = 0;
      state.hoverVY = 0;
      state.targetHoverX = 0;
      state.targetHoverY = 0;
      state.flipAnimation = null;
      updateTransform();
      render();
      if (state.mode === 'static') stopLoop();
    }

    function flip() {
      const current = updateTransform().angleY;
      state.flipAnimation = {
        from: current,
        to: current + 180,
        started: performance.now()
      };
      startLoop();
    }

    function syncModeUi() {
      const panel = stage.closest('.modal') || document;
      stage.classList.toggle('is-interactive', state.mode === 'interactive');
      stage.classList.toggle('is-static', state.mode !== 'interactive');
      stage.dataset.mode = state.mode;
      panel.querySelectorAll('[data-action="card-view-mode"]').forEach(button => {
        const active = button.dataset.mode === state.mode;
        button.classList.toggle('on', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const hint = panel.querySelector('#cardModeHint');
      if (hint) {
        const text = state.mode === 'interactive' ? hint.dataset.interactive : hint.dataset.static;
        if (text) hint.textContent = text;
      }
    }

    function setMode(mode) {
      state.mode = mode === 'interactive' ? 'interactive' : 'static';
      state.dragging = false;
      stage.classList.remove('is-dragging');
      if (state.mode === 'static') {
        stopLoop();
        reset();
      } else {
        state.lastFrame = 0;
        render();
        startLoop();
      }
      syncModeUi();
    }

    function onPointerMove(event) {
      if (state.mode !== 'interactive') return;
      const rect = stage.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1));
      state.pointerX = nx;
      state.pointerY = ny;

      if (state.dragging) {
        const dx = event.clientX - state.lastPointerX;
        const dy = event.clientY - state.lastPointerY;
        state.baseY += dx * 0.52;
        state.baseX -= dy * 0.52;
        state.lastPointerX = event.clientX;
        state.lastPointerY = event.clientY;
        state.moved = state.moved || Math.abs(event.clientX - state.downX) + Math.abs(event.clientY - state.downY) > 5;
        updateTransform();
        render();
        return;
      }

      if (!reducedMotionQuery || !reducedMotionQuery.matches) {
        state.targetHoverY = nx * 12;
        state.targetHoverX = -ny * 12;
        startLoop();
      }
    }

    function onPointerDown(event) {
      if (state.mode !== 'interactive') return;
      if (event.button != null && event.button !== 0) return;
      state.dragging = true;
      state.pointerId = event.pointerId;
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      state.downX = event.clientX;
      state.downY = event.clientY;
      state.downAt = performance.now();
      state.moved = false;
      state.flipAnimation = null;
      stage.classList.add('is-dragging');
      setPointerCaptureSafe(stage, event.pointerId);
      startLoop();
    }

    function finishPointer(event) {
      if (!state.dragging) return;
      const wasTap = !state.moved && performance.now() - state.downAt < 360;
      state.dragging = false;
      stage.classList.remove('is-dragging');
      releasePointerCaptureSafe(stage, event.pointerId);
      if (wasTap) flip();
    }

    function onPointerLeave() {
      state.pointerX = 0;
      state.pointerY = 0;
      if (!state.dragging) {
        state.targetHoverX = 0;
        state.targetHoverY = 0;
        if (state.mode === 'interactive') startLoop();
      }
    }

    function onKeyDown(event) {
      const key = event.key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        flip();
      } else if (state.mode === 'interactive' && key === 'ArrowLeft') {
        event.preventDefault();
        state.baseY -= 15;
      } else if (state.mode === 'interactive' && key === 'ArrowRight') {
        event.preventDefault();
        state.baseY += 15;
      } else if (state.mode === 'interactive' && key === 'ArrowUp') {
        event.preventDefault();
        state.baseX -= 15;
      } else if (state.mode === 'interactive' && key === 'ArrowDown') {
        event.preventDefault();
        state.baseX += 15;
      } else if (key === 'Home') {
        event.preventDefault();
        reset();
      }
      state.baseX = normalizeAngle(state.baseX);
      state.baseY = normalizeAngle(state.baseY);
      updateTransform();
      render();
    }

    function destroy() {
      state.running = false;
      cancelAnimationFrame(state.raf);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointerup', finishPointer);
      stage.removeEventListener('pointercancel', finishPointer);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('keydown', onKeyDown);
      stopLoop();
      if (gl) {
        if (cardTexture) gl.deleteTexture(cardTexture);
        if (environmentTexture) gl.deleteTexture(environmentTexture);
        if (vertexArray) gl.deleteVertexArray(vertexArray);
        if (program) gl.deleteProgram(program);
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
      stage.classList.remove('is-webgl-ready', 'is-dragging', 'is-interactive', 'is-static');
    }

    if (gl && initializeWebGL()) {
      loadCardTexture();
      stage.addEventListener('pointermove', onPointerMove);
      stage.addEventListener('pointerdown', onPointerDown);
      stage.addEventListener('pointerup', finishPointer);
      stage.addEventListener('pointercancel', finishPointer);
      stage.addEventListener('pointerleave', onPointerLeave);
      stage.addEventListener('keydown', onKeyDown);
      syncModeUi();
      updateTransform();
      render();
    } else {
      stage.classList.add('is-webgl-fallback');
      updateTransform();
    }

    return {
      flip: flip,
      reset: reset,
      setMode: setMode,
      destroy: destroy,
      getState: function () {
        return {
          mode: state.mode,
          rafActive: !!state.raf,
          renderCount: state.renderCount,
          ready: state.ready,
          width: canvas.width,
          height: canvas.height
        };
      },
      snapshot: function () {
        render();
        return state.ready ? canvas.toDataURL('image/png') : '';
      }
    };
  }

  window.createReflectiveCard3D = createReflectiveCard3D;
})();
