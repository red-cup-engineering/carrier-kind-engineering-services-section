/**
 * Browser presentation for a Holofoam experiment.
 *
 * This module only projects the experiment state it receives.  It neither
 * advances organisms nor changes their rules, so the same saved experiment can
 * be rendered through WebGL2 or the Canvas2D fallback without changing its
 * replay semantics.
 */

import { SENSE_RADIUS, fieldAt } from './simulation.mjs';

const VERTEX_SOURCE = `#version 300 es
in vec2 position;
in vec3 color;
in float size;
out vec3 vColor;
void main() {
  gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
  gl_PointSize = size;
  vColor = color;
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outputColor;
void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float distance = dot(point, point);
  if (distance > 1.0) discard;
  outputColor = vec4(vColor, (1.0 - distance) * 0.54);
}`;

const QUAD_SOURCE = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FADE_SOURCE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
out vec4 outputColor;
void main() { outputColor = texture(source, uv) * 0.93; }`;

const PRESENT_SOURCE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform vec2 texel;
out vec4 outputColor;
void main() {
  vec3 center = texture(source, uv).rgb;
  vec3 blur = vec3(0.0);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    blur += texture(source, uv + vec2(float(x), float(y)) * texel * 3.0).rgb;
  }
  blur /= 9.0;
  vec3 lit = center + blur * 0.12;
  outputColor = vec4(lit / (vec3(1.0) + lit), 1.0);
}`;

const LINE_VERTEX_SOURCE = `#version 300 es
in vec2 position;
in vec3 color;
out vec3 vColor;
void main() { gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0); vColor = color; }`;

const LINE_FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outputColor;
void main() { outputColor = vec4(vColor, 1.0); }`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Holofoam renderer shader failed: ${reason}`);
  }
  return shader;
}

function program(gl, vertex = VERTEX_SOURCE, fragment = FRAGMENT_SOURCE) {
  const value = gl.createProgram();
  gl.attachShader(value, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(value, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(value);
  if (!gl.getProgramParameter(value, gl.LINK_STATUS)) {
    throw new Error(`Holofoam renderer program failed: ${gl.getProgramInfoLog(value)}`);
  }
  return value;
}

function target(gl, width, height, highPrecision) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, highPrecision ? gl.RGBA16F : gl.RGBA8, width, height, 0,
    gl.RGBA, highPrecision ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Holofoam renderer could not create its trail target.');
  }
  return { texture, framebuffer, width, height };
}

function colorFor(organism, output, offset) {
  const palette = [[0.12, 0.76, 1.0], [1.0, 0.54, 0.12], [0.78, 0.32, 1.0]];
  const color = palette[organism.lineage % palette.length];
  const light = 0.38 + organism.energy * 0.82;
  output[offset] = color[0] * light;
  output[offset + 1] = color[1] * light;
  output[offset + 2] = color[2] * light;
}

function viewFor(camera = {}) {
  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1,
  };
}

function project(value, pan, zoom) {
  return (value - 0.5 - pan) * zoom + 0.5;
}

function wrappedDistance(a, b) {
  let delta = b - a;
  if (Math.abs(delta) > 0.5) delta -= Math.sign(delta);
  return delta;
}

function localDistance(world, a, b) {
  return Math.hypot(
    wrappedDistance(a.x / world.width, b.x / world.width) * world.width,
    wrappedDistance(a.y / world.height, b.y / world.height) * world.height,
  );
}

function senseState(world, enabled, view) {
  const selected = enabled && Number.isInteger(world.selected) ? world.organisms[world.selected] : null;
  if (selected === null) return { selected: null, view, focus: [0.5, 0.5], radius: 0, flow: [0, 0] };
  const centered = { ...view, x: selected.x / world.width - 0.5, y: selected.y / world.height - 0.5 };
  const flow = fieldAt(world, selected.x, selected.y);
  return { selected, view: centered, focus: [0.5, 0.5], radius: SENSE_RADIUS / Math.min(world.width, world.height) * centered.zoom, flow: [flow.x, flow.y] };
}

function addLine(lines, start, end, color) {
  lines.push(start[0], start[1], ...color, end[0], end[1], ...color);
}

function addArrow(lines, start, flow, length, color) {
  const magnitude = Math.hypot(flow.x, flow.y);
  if (magnitude === 0) return;
  const x = flow.x / magnitude, y = flow.y / magnitude;
  const end = [start[0] + x * length, start[1] - y * length];
  addLine(lines, start, end, color);
  addLine(lines, end, [end[0] - x * length * 0.28 + y * length * 0.16, end[1] + y * length * 0.28 + x * length * 0.16], color);
  addLine(lines, end, [end[0] - x * length * 0.28 - y * length * 0.16, end[1] + y * length * 0.28 - x * length * 0.16], color);
}

function overlayLines(world, inspect, sensing, view) {
  const lines = [];
  if (inspect) {
    for (let x = 0.05; x < 1; x += 0.1) for (let y = 0.05; y < 1; y += 0.1) {
      const start = [project(x, view.x, view.zoom), project(y, view.y, view.zoom)];
      const flow = fieldAt(world, x * world.width, y * world.height);
      addArrow(lines, start, flow, 0.026 * view.zoom, [0.52, 0.94, 1.0]);
    }
  }
  if (sensing.selected !== null) {
    const center = sensing.focus;
    const radiusX = SENSE_RADIUS / world.width * view.zoom;
    const radiusY = SENSE_RADIUS / world.height * view.zoom;
    for (let index = 0; index < 48; index += 1) {
      const a = index / 48 * Math.PI * 2;
      const b = (index + 1) / 48 * Math.PI * 2;
      addLine(lines, [center[0] + Math.cos(a) * radiusX, center[1] + Math.sin(a) * radiusY],
        [center[0] + Math.cos(b) * radiusX, center[1] + Math.sin(b) * radiusY], [0.78, 0.95, 1.0]);
    }
    addArrow(lines, center, fieldAt(world, sensing.selected.x, sensing.selected.y), 0.08 * view.zoom, [1.0, 0.72, 0.22]);
  }
  return new Float32Array(lines);
}

function motionLines(world, organisms, history, view) {
  const lines = [];
  for (const organism of organisms) {
    const before = history.get(organism.id);
    if (before === undefined) continue;
    const dx = wrappedDistance(before.x / world.width, organism.x / world.width);
    const dy = wrappedDistance(before.y / world.height, organism.y / world.height);
    const start = [project(before.x / world.width, view.x, view.zoom), project(before.y / world.height, view.y, view.zoom)];
    const end = [project(before.x / world.width + dx, view.x, view.zoom), project(before.y / world.height + dy, view.y, view.zoom)];
    const color = new Float32Array(3);
    colorFor(organism, color, 0);
    color[0] *= 0.08;
    color[1] *= 0.08;
    color[2] *= 0.08;
    addLine(lines, start, end, color);
  }
  return new Float32Array(lines);
}

function remember(organisms, history) {
  history.clear();
  for (const organism of organisms) history.set(organism.id, { x: organism.x, y: organism.y });
}

function resizeCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, ratio };
}

function createWebGlRenderer(canvas, gl) {
  const pipeline = program(gl);
  const fadePipeline = program(gl, QUAD_SOURCE, FADE_SOURCE);
  const presentPipeline = program(gl, QUAD_SOURCE, PRESENT_SOURCE);
  const linePipeline = program(gl, LINE_VERTEX_SOURCE, LINE_FRAGMENT_SOURCE);
  const buffer = gl.createBuffer();
  const quad = gl.createBuffer();
  const lineBuffer = gl.createBuffer();
  const position = gl.getAttribLocation(pipeline, 'position');
  const color = gl.getAttribLocation(pipeline, 'color');
  const size = gl.getAttribLocation(pipeline, 'size');
  let data = new Float32Array(0);
  const history = new Map();
  let priorTick = null;
  let priorView = null;
  const highPrecision = gl.getExtension('EXT_color_buffer_float') !== null;
  let read = null;
  let write = null;

  gl.useProgram(pipeline);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(color);
  gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 8);
  gl.enableVertexAttribArray(size);
  gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 24, 20);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function replaceTargets(width, height) {
    if (read !== null) { gl.deleteFramebuffer(read.framebuffer); gl.deleteTexture(read.texture); }
    if (write !== null) { gl.deleteFramebuffer(write.framebuffer); gl.deleteTexture(write.texture); }
    read = target(gl, width, height, highPrecision);
    write = target(gl, width, height, highPrecision);
    for (const current of [read, write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, current.framebuffer);
      gl.clearColor(0.012, 0.025, 0.075, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function drawQuad(active, texture, width, height) {
    gl.useProgram(active);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const position = gl.getAttribLocation(active, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(active, 'source'), 0);
    const texel = gl.getUniformLocation(active, 'texel');
    if (texel !== null) gl.uniform2f(texel, 1 / width, 1 / height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function drawLines(lines) {
    if (lines.length === 0) return;
    gl.useProgram(linePipeline);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lines, gl.DYNAMIC_DRAW);
    const linePosition = gl.getAttribLocation(linePipeline, 'position');
    const lineColor = gl.getAttribLocation(linePipeline, 'color');
    gl.enableVertexAttribArray(linePosition);
    gl.vertexAttribPointer(linePosition, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(lineColor);
    gl.vertexAttribPointer(lineColor, 3, gl.FLOAT, false, 20, 8);
    gl.drawArrays(gl.LINES, 0, lines.length / 5);
  }

  function resize() {
    const { width, height } = resizeCanvas(canvas);
    gl.viewport(0, 0, width, height);
    if (read === null || read.width !== width || read.height !== height) replaceTargets(width, height);
  }

  function draw(world, { inspect = false, senses = false, camera } = {}) {
    resize();
    const organisms = world.organisms;
    const sensing = senseState(world, senses, viewFor(camera));
    const view = sensing.view;
    if (priorTick === null || world.tick <= priorTick || priorView === null || priorView.x !== view.x || priorView.y !== view.y || priorView.zoom !== view.zoom) history.clear();
    const required = organisms.length * 6;
    if (data.length < required) data = new Float32Array(required);
    for (let index = 0; index < organisms.length; index += 1) {
      const organism = organisms[index];
      const offset = index * 6;
      data[offset] = project(organism.x / world.width, view.x, view.zoom);
      data[offset + 1] = project(organism.y / world.height, view.y, view.zoom);
      colorFor(organism, data, offset + 2);
      if (sensing.selected !== null && organism !== sensing.selected) {
        const local = localDistance(world, organism, sensing.selected) <= SENSE_RADIUS;
        data[offset + 2] *= local ? 0.52 : 0.07;
        data[offset + 3] *= local ? 0.52 : 0.07;
        data[offset + 4] *= local ? 0.52 : 0.07;
      }
      data[offset + 5] = 2.5 + organism.trait * 5.5;
    }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
    gl.viewport(0, 0, write.width, write.height);
    drawQuad(fadePipeline, read.texture, write.width, write.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(pipeline);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 8);
    gl.enableVertexAttribArray(size);
    gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 24, 20);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, required), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, organisms.length);
    drawLines(motionLines(world, organisms, history, view));
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, write.width, write.height);
    drawQuad(presentPipeline, write.texture, write.width, write.height);
    drawLines(overlayLines(world, inspect, sensing, view));
    [read, write] = [write, read];
    remember(organisms, history);
    priorTick = world.tick;
    priorView = { ...view };
    canvas.dataset.rendererBackend = 'webgl2';
    canvas.dataset.rendererParticles = String(organisms.length);
    canvas.dataset.rendererCapacity = 'unbounded-by-renderer';
    canvas.dataset.rendererPrecision = highPrecision ? 'rgba16f' : 'rgba8-fallback';
  }

  return { resize, draw, backend: 'webgl2' };
}

function createCanvasRenderer(canvas, context) {
  const history = new Map();
  let priorTick = null;
  let priorView = null;
  function resize() { resizeCanvas(canvas); }
  function draw(world, { inspect = false, senses = false, camera } = {}) {
    const { width, height, ratio } = resizeCanvas(canvas);
    const sensing = senseState(world, senses, viewFor(camera));
    const view = sensing.view;
    if (priorTick === null || world.tick <= priorTick || priorView === null || priorView.x !== view.x || priorView.y !== view.y || priorView.zoom !== view.zoom) history.clear();
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#030719';
    context.fillRect(0, 0, width / ratio, height / ratio);
    for (const organism of world.organisms) {
      const dim = sensing.selected !== null && organism !== sensing.selected && localDistance(world, organism, sensing.selected) > SENSE_RADIUS;
      context.fillStyle = `hsla(${organism.hue}, 94%, ${45 + organism.energy * 32}%, ${dim ? 0.07 : 0.72})`;
      context.beginPath();
      context.arc(project(organism.x / world.width, view.x, view.zoom) * width / ratio,
        project(organism.y / world.height, view.y, view.zoom) * height / ratio,
        1.2 + organism.trait * 1.9, 0, Math.PI * 2);
      context.fill();
    }
    const motions = motionLines(world, world.organisms, history, view);
    context.lineWidth = 1.4;
    for (let index = 0; index < motions.length; index += 10) {
      context.strokeStyle = `rgb(${Math.round(motions[index + 2] * 255)} ${Math.round(motions[index + 3] * 255)} ${Math.round(motions[index + 4] * 255)})`;
      context.beginPath();
      context.moveTo(motions[index] * width / ratio, motions[index + 1] * height / ratio);
      context.lineTo(motions[index + 5] * width / ratio, motions[index + 6] * height / ratio);
      context.stroke();
    }
    const lines = overlayLines(world, inspect, sensing, view);
    context.lineWidth = 1.25;
    for (let index = 0; index < lines.length; index += 10) {
      context.strokeStyle = `rgb(${Math.round(lines[index + 2] * 255)} ${Math.round(lines[index + 3] * 255)} ${Math.round(lines[index + 4] * 255)})`;
      context.beginPath();
      context.moveTo(lines[index] * width / ratio, lines[index + 1] * height / ratio);
      context.lineTo(lines[index + 5] * width / ratio, lines[index + 6] * height / ratio);
      context.stroke();
    }
    canvas.dataset.rendererBackend = 'canvas2d';
    canvas.dataset.rendererParticles = String(world.organisms.length);
    canvas.dataset.rendererCapacity = 'CPU-bound';
    remember(world.organisms, history);
    priorTick = world.tick;
    priorView = { ...view };
  }
  return { resize, draw, backend: 'canvas2d' };
}

/**
 * Prefer GPU point drawing. Canvas2D remains a working presentation fallback
 * for browsers without WebGL2; it does not claim the same particle capacity.
 */
export function createRenderer(canvas) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (gl !== null) return createWebGlRenderer(canvas, gl);
  } catch {
    // The Canvas2D route below is the explicit supported fallback.
  }
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Holofoam needs either WebGL2 or Canvas2D.');
  return createCanvasRenderer(canvas, context);
}
