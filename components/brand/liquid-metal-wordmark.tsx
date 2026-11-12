"use client";

/*
 * Надпись «Entry Check» из жидкого металла (WebGL2).
 *
 * Шейдер — из paper-design/liquid-logo (через RareUI Liquid Metal), лицензия PolyForm Shield 1.0.0:
 * https://polyformproject.org/licenses/shield/1.0.0 — использование, не конкурирующее с продуктами Paper, разрешено.
 *
 * Отличия от оригинала:
 * - «Карта рельефа» (решение уравнения Пуассона по маске текста) посчитана заранее и лежит в
 *   public/brand/wordmark-metal.png: Geist 800, 104 px, фаска 8,5 px по расстоянию до края, 64 уровня серого.
 *   Считать её в браузере — до секунды работы процессора на телефоне при каждой загрузке.
 * - Кадры — не чаще 30 в секунду (металл течёт медленно), пауза вне экрана и на скрытой вкладке.
 * - prefers-reduced-motion: один неподвижный кадр.
 * - Пока шейдер не готов или WebGL2 нет — обычный текст с серебристым градиентом того же размера.
 */

import { useEffect, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/site";

const MAP_URL = "/brand/wordmark-metal.png";
const MAP_RATIO = 652 / 127;
const FRAME_MS = 1000 / 30;

const VERTEX = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 vUv;
void main() {
  vUv = .5 * (a_position + 1.);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;
#define PI 3.14159265358979323846
#define PATTERN_ASPECT 1.6

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
  m = m*m;
  m = m*m;
  vec3 x = 2. * fract(p * C.www) - 1.;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130. * dot(m, g);
}

vec2 get_img_uv() {
  vec2 img_uv = vUv;
  img_uv -= .5;
  if (u_ratio > u_img_ratio) {
    img_uv.x = img_uv.x * u_ratio / u_img_ratio;
  } else {
    img_uv.y = img_uv.y * u_img_ratio / u_ratio;
  }
  img_uv += .5;
  img_uv.y = 1. - img_uv.y;
  return img_uv;
}

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
  float ch = c2;
  float border = 0.;
  float blur = u_patternBlur + extra_blur;
  ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
  border = w[0];
  ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
  b = smoothstep(.2, .8, b);
  border = w[0] + .4 * (1. - b) * w[1];
  ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
  border = w[0] + .5 * (1. - b) * w[1];
  ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));
  return ch;
}

float get_img_frame_alpha(vec2 uv, float img_frame_width) {
  float a = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
  a *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
  return a;
}

void main() {
  vec2 uv = vUv;
  uv.y = 1. - uv.y;
  // Оригинал рассчитан на квадратный холст (uv.x *= ratio, центр узора в 0.5).
  // У надписи 5:1 — центрируем узор по надписи и лишь слегка растягиваем по горизонтали.
  uv.x = (uv.x - .5) * PATTERN_ASPECT + .5;
  float diagonal = uv.x - uv.y;
  float t = .001 * u_time;

  vec2 img_uv = get_img_uv();
  vec4 img = texture(u_image_texture, img_uv);

  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));

  float edge = img.r;
  vec2 grad_uv = uv;
  grad_uv -= .5;
  float dist = length(grad_uv + vec2(0., .2 * diagonal));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);

  float bulge = pow(1.8 * dist, 1.2);
  bulge = 1. - bulge;
  bulge *= pow(uv.y, .3);

  float cycle_width = u_patternScale;
  float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
  float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);
  float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
  float thin_strip_2_width = cycle_width * thin_strip_2_ratio;

  float opacity = 1. - smoothstep(.9 - .5 * u_edge, 1. - .5 * u_edge, edge);
  opacity *= get_img_frame_alpha(img_uv, 0.01);

  float noise = snoise(uv - t);
  edge += (1. - edge) * u_liquid * noise;

  float refr = clamp(1. - bulge, 0., 1.);
  float dir = grad_uv.x;
  dir += diagonal;
  dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));
  bulge *= clamp(pow(uv.y, .1), .3, 1.);
  dir *= (.1 + (1.1 - edge) * bulge);
  dir *= smoothstep(1., .7, edge);
  dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
  dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));
  dir *= (.5 + .5 * pow(uv.y, 2.));
  dir *= cycle_width;
  dir -= t;

  float refr_r = refr;
  refr_r += .03 * bulge * noise;
  float refr_b = 1.3 * refr;
  refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
  refr_r -= diagonal;
  refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
  refr_b -= .2 * edge;
  refr_r *= u_refraction;
  refr_b *= u_refraction;

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
  float r = get_color_channel(color1.r, color2.r, mod(dir + refr_r, 1.), w, 0.02 + .03 * u_refraction * bulge, bulge);
  float g = get_color_channel(color1.g, color2.g, mod(dir, 1.), w, 0.01 / max(1. - diagonal, .15), bulge);
  float b = get_color_channel(color1.b, color2.b, mod(dir - refr_b, 1.), w, .01, bulge);

  fragColor = vec4(vec3(r, g, b) * opacity, opacity);
}`;

type Params = { speed: number; patternScale: number; refraction: number; edge: number; patternBlur: number; liquid: number };

// Для маленькой надписи: край шире (буквы не «съедаются»), преломление слабее (без цветной каймы).
const DEFAULTS: Params = { speed: 0.3, patternScale: 2, refraction: 0.004, edge: 0.3, patternBlur: 0.005, liquid: 0.07 };

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error("LiquidMetal shader:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

export function LiquidMetalWordmark({ className = "", params }: { className?: string; params?: Partial<Params> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const p = { ...DEFAULTS, ...params };
  const key = JSON.stringify(p);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    const cfg: Params = JSON.parse(key);
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(u("u_patternScale"), cfg.patternScale);
    gl.uniform1f(u("u_refraction"), cfg.refraction);
    gl.uniform1f(u("u_edge"), cfg.edge);
    gl.uniform1f(u("u_patternBlur"), cfg.patternBlur);
    gl.uniform1f(u("u_liquid"), cfg.liquid);
    gl.uniform1f(u("u_img_ratio"), MAP_RATIO);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let texture: WebGLTexture | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let last = 0;
    let elapsed = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(u("u_ratio"), canvas.width / canvas.height);
    };

    const draw = () => {
      gl.uniform1f(u("u_time"), elapsed % 100_000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      if (now - last >= FRAME_MS) {
        elapsed += Math.min(now - last, 100) * cfg.speed;
        last = now;
        draw();
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduceMotion || raf || !texture) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const image = new Image();
    image.src = MAP_URL;
    image
      .decode()
      .then(() => {
        if (disposed) return;
        texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.uniform1i(u("u_image_texture"), 0);
        resize();
        elapsed = 2400; // не с нуля: первый кадр уже с бликами
        draw();
        setReady(true);
        start();
      })
      .catch(() => {});

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (texture) draw();
    });
    resizeObserver.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (texture) gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [key]);

  return (
    <span className={`relative inline-block aspect-[652/127] [container-type:size] ${className}`}>
      {/* Запасной вариант и подстраховка до первого кадра: тот же текст, серебристый градиент. */}
      <span
        aria-hidden="true"
        className={`metal-text absolute inset-0 flex items-center justify-center text-[82cqh] leading-none font-bold tracking-[-0.02em] whitespace-nowrap transition-opacity duration-300 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        {SITE_NAME}
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`metal-shadow absolute inset-0 size-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
