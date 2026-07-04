#!/usr/bin/env node
/**
 * Lexicoin 资产预处理脚本
 *
 * 铁律:法线图不由 AI 生成,必须从高度图程序化推导(见 CLAUDE.md)。
 *
 * 用法(在项目根目录):
 *   npm run assets -- normal --in height.png --out foo-normal.png [--strength 2]
 *   npm run assets -- hrba --height h.png [--rough r.png|0.5] [--metal m.png|0] [--thickness t.png] --out foo-hrba.png
 *   npm run assets -- mask [--r a.png|0] [--g b.png|0] [--b c.png|0] --out foo-mask.png
 *   npm run assets -- check --height h.png --normal n.png    # 高度↔法线一致性校验(ADR-005)
 *   npm run assets -- flip --in n.png --axis x|y|xy [--out foo.png]   # 翻转法线图轴向约定
 *
 * 通道参数既可以是 PNG 路径,也可以是 0~1 的常数(整张图填同一个值)。
 * 所有输入图必须同尺寸;灰度图取 R 通道。
 *
 * 输出规格:
 *   normal — OpenGL Y+ 法线图(绿色通道朝上),与 Assets-guide.md 的 shader 约定一致
 *   hrba   — R=Height, G=Roughness, B=Metalness, A=Thickness(缺省时 A 复制高度,符合 PBR v3.3 规范)
 *   mask   — R/G/B 三路 Universal Mask,A=255
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PNG } from "pngjs";

// ---------- 基础 IO ----------

function readPng(file) {
  if (!fs.existsSync(file)) {
    fail(`找不到文件: ${file}`);
  }
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`✅ 已写出 ${file} (${png.width}x${png.height})`);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/**
 * 读取一个"通道输入":PNG 路径或 0~1 常数。
 * 返回 { get(x,y): number(0..1), width, height } ;常数输入没有尺寸。
 */
function loadChannel(input) {
  const num = Number(input);
  if (input !== undefined && input !== "" && !Number.isNaN(num) && !fs.existsSync(input)) {
    if (num < 0 || num > 1) fail(`常数通道值必须在 0~1 之间,收到 ${input}`);
    return { constant: num };
  }
  const png = readPng(input);
  const { width, height, data } = png;
  return {
    width,
    height,
    get(x, y) {
      return data[(y * width + x) * 4] / 255; // 取 R 通道
    },
  };
}

/** 校验所有图片通道尺寸一致,返回 { width, height }。 */
function resolveSize(channels) {
  let size = null;
  for (const ch of channels) {
    if (ch.constant !== undefined) continue;
    if (!size) {
      size = { width: ch.width, height: ch.height };
    } else if (ch.width !== size.width || ch.height !== size.height) {
      fail(
        `输入图尺寸不一致: ${ch.width}x${ch.height} vs ${size.width}x${size.height}。` +
          `请让 AI 以同一尺寸重新生成资材,不要在这里缩放(缩放会破坏高度图精度)。`
      );
    }
  }
  if (!size) fail("至少需要一个 PNG 输入来确定尺寸(不能全部是常数)");
  return size;
}

function sample(ch, x, y) {
  return ch.constant !== undefined ? ch.constant : ch.get(x, y);
}

// ---------- normal: 高度图 → OpenGL Y+ 法线图 ----------

function cmdNormal(opts) {
  const inFile = opts.in ?? fail("normal 需要 --in <高度图.png>");
  const strength = Number(opts.strength ?? 2.0);
  if (!(strength > 0)) fail(`--strength 必须为正数,收到 ${opts.strength}`);
  const outFile =
    opts.out ?? inFile.replace(/(\.png)$/i, "") .replace(/-height$/i, "") + "-normal.png";

  const src = readPng(inFile);
  const { width: w, height: h } = src;
  const heightAt = (x, y) => {
    // 边缘 clamp,避免法线在图边缘出现接缝
    const cx = Math.min(w - 1, Math.max(0, x));
    const cy = Math.min(h - 1, Math.max(0, y));
    return src.data[(cy * w + cx) * 4] / 255;
  };

  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Sobel 算子求高度梯度(权重和为 8,除以 8 归一化)
      const tl = heightAt(x - 1, y - 1), t = heightAt(x, y - 1), tr = heightAt(x + 1, y - 1);
      const l  = heightAt(x - 1, y),                              r  = heightAt(x + 1, y);
      const bl = heightAt(x - 1, y + 1), b = heightAt(x, y + 1), br = heightAt(x + 1, y + 1);
      const dhdx = (tr + 2 * r + br - tl - 2 * l - bl) / 8;
      const dhdy = (bl + 2 * b + br - tl - 2 * t - tr) / 8; // 图像 y 向下为正

      // OpenGL Y+ 约定:高度向下(图像 y+)增加时,法线朝图像上方倾斜 → G > 0.5
      let nx = -strength * dhdx;
      let ny = strength * dhdy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;

      const i = (y * w + x) * 4;
      out.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }
  writePng(outFile, out);
  console.log(`   法线约定: OpenGL Y+ | strength=${strength}`);
}

// ---------- hrba: 四张灰度图 → 单张 RGBA 材质图 ----------

function cmdHrba(opts) {
  if (!opts.height) fail("hrba 需要 --height <高度图.png>(R 通道来源)");
  const outFile = opts.out ?? fail("hrba 需要 --out <输出.png>");

  const chHeight = loadChannel(opts.height);
  const chRough = loadChannel(opts.rough ?? "0.5");
  const chMetal = loadChannel(opts.metal ?? "0");
  // PBR v3.3 规范:未提供厚度时,以高度作为默认厚度
  const chThick = opts.thickness ? loadChannel(opts.thickness) : chHeight;

  const { width: w, height: h } = resolveSize([chHeight, chRough, chMetal, chThick]);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out.data[i] = Math.round(sample(chHeight, x, y) * 255);
      out.data[i + 1] = Math.round(sample(chRough, x, y) * 255);
      out.data[i + 2] = Math.round(sample(chMetal, x, y) * 255);
      out.data[i + 3] = Math.round(sample(chThick, x, y) * 255);
    }
  }
  writePng(outFile, out);
  console.log(
    `   通道: R=Height(${opts.height}) G=Roughness(${opts.rough ?? "0.5"}) ` +
      `B=Metalness(${opts.metal ?? "0"}) A=Thickness(${opts.thickness ?? "同高度图"})`
  );
}

// ---------- mask: 三张灰度图 → 三路 Universal Mask ----------

function cmdMask(opts) {
  const outFile = opts.out ?? fail("mask 需要 --out <输出.png>");
  const chR = loadChannel(opts.r ?? "0");
  const chG = loadChannel(opts.g ?? "0");
  const chB = loadChannel(opts.b ?? "0");

  const { width: w, height: h } = resolveSize([chR, chG, chB]);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out.data[i] = Math.round(sample(chR, x, y) * 255);
      out.data[i + 1] = Math.round(sample(chG, x, y) * 255);
      out.data[i + 2] = Math.round(sample(chB, x, y) * 255);
      out.data[i + 3] = 255;
    }
  }
  writePng(outFile, out);
  console.log(`   通道: R=${opts.r ?? 0} G=${opts.g ?? 0} B=${opts.b ?? 0}(路由含义见 Assets-guide.md §6.B)`);
}

// ---------- check: 高度↔法线一致性校验(ADR-005) ----------

/** 用与 cmdNormal 相同的 Sobel 计算高度图在 (x,y) 处的期望法线 xy 分量(未归一化,相关系数对缩放不敏感)。 */
function expectedNormalXY(src, w, h, x, y) {
  const at = (px, py) => {
    const cx = Math.min(w - 1, Math.max(0, px));
    const cy = Math.min(h - 1, Math.max(0, py));
    return src.data[(cy * w + cx) * 4] / 255;
  };
  const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
  const l  = at(x - 1, y),                        r  = at(x + 1, y);
  const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
  const dhdx = (tr + 2 * r + br - tl - 2 * l - bl) / 8;
  const dhdy = (bl + 2 * b + br - tl - 2 * t - tr) / 8;
  return [-dhdx, dhdy]; // OpenGL Y+ 约定,与 cmdNormal 一致
}

function pearson(xs, ys) {
  const n = xs.length;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; syy += ys[i] * ys[i]; sxy += xs[i] * ys[i];
  }
  const cov = sxy / n - (sx / n) * (sy / n);
  const vx = sxx / n - (sx / n) ** 2;
  const vy = syy / n - (sy / n) ** 2;
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}

function cmdCheck(opts) {
  if (!opts.height || !opts.normal) fail("check 需要 --height <高度图.png> --normal <法线图.png>");
  const hPng = readPng(opts.height);
  const nPng = readPng(opts.normal);
  if (hPng.width !== nPng.width || hPng.height !== nPng.height) {
    fail(`尺寸不一致: 高度 ${hPng.width}x${hPng.height} vs 法线 ${nPng.width}x${nPng.height}`);
  }
  const w = hPng.width, h = hPng.height;
  const exX = [], exY = [], acX = [], acY = [];
  let sumR = 0, sumG = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [ex, ey] = expectedNormalXY(hPng, w, h, x, y);
      const i = (y * w + x) * 4;
      exX.push(ex); exY.push(ey);
      acX.push(nPng.data[i] - 127.5); acY.push(nPng.data[i + 1] - 127.5);
      sumR += nPng.data[i]; sumG += nPng.data[i + 1];
    }
  }
  const n = w * h;
  const corrR = pearson(exX, acX);
  const corrG = pearson(exY, acY);
  const meanR = sumR / n, meanG = sumG / n;

  console.log(`高度↔法线一致性校验(期望值按 OpenGL Y+ 约定推导)`);
  console.log(`  R 通道相关系数: ${corrR.toFixed(3)}   G 通道相关系数: ${corrG.toFixed(3)}`);
  console.log(`  法线均值: R=${meanR.toFixed(1)} G=${meanG.toFixed(1)}(平坦资产应接近 127.5)`);

  const verdicts = [];
  if (corrR < -0.15) verdicts.push("⚠️ X 轴疑似翻转(可用 flip --axis x 修正后复测)");
  if (corrG < -0.15) verdicts.push("⚠️ Y 轴疑似 DirectX 约定(可用 flip --axis y 或 shader 的 normalFlipY 修正)");
  if (Math.abs(meanR - 127.5) > 8 || Math.abs(meanG - 127.5) > 8) {
    verdicts.push("⚠️ 法线存在整体方向偏置,疑似原画烘焙光影被推理模型误读为坡度");
  }
  const agree = Math.max(Math.abs(corrR), Math.abs(corrG));
  if (agree >= 0.6) verdicts.push("✅ 形状一致性良好");
  else if (agree >= 0.3) verdicts.push("🟡 形状一致性弱——两图可能来自不同推理模型,建议改为单一真相源(ADR-005)");
  else verdicts.push("🔴 两图基本描述了不同的形状,禁止混用(ADR-005)");
  for (const v of verdicts) console.log(`  ${v}`);
}

// ---------- flip: 翻转法线图轴向约定 ----------

function cmdFlip(opts) {
  const inFile = opts.in ?? fail("flip 需要 --in <法线图.png>");
  const axis = opts.axis ?? fail("flip 需要 --axis x|y|xy");
  if (!["x", "y", "xy"].includes(axis)) fail(`--axis 只接受 x / y / xy,收到 ${axis}`);
  const outFile = opts.out ?? inFile.replace(/\.png$/i, `-flip${axis}.png`);

  const png = readPng(inFile);
  for (let i = 0; i < png.data.length; i += 4) {
    if (axis.includes("x")) png.data[i] = 255 - png.data[i];
    if (axis.includes("y")) png.data[i + 1] = 255 - png.data[i + 1];
  }
  writePng(outFile, png);
  console.log(`   已翻转 ${axis.toUpperCase()} 轴(通道取反)`);
}

// ---------- CLI ----------

const HELP = `Lexicoin 资产预处理

命令:
  normal  高度图 → OpenGL Y+ 法线图
          npm run assets -- normal --in height.png [--out foo-normal.png] [--strength 2]
  hrba    打包 HRBA 材质图 (R=Height G=Rough B=Metal A=Thickness)
          npm run assets -- hrba --height h.png [--rough r.png|0.5] [--metal 0] [--thickness t.png] --out foo-hrba.png
  mask    打包三路 Universal Mask
          npm run assets -- mask [--r a.png] [--g b.png] [--b c.png] --out foo-mask.png
  check   高度↔法线一致性校验(ADR-005:混用推理产物前必须校验)
          npm run assets -- check --height h.png --normal n.png
  flip    翻转法线图轴向约定
          npm run assets -- flip --in n.png --axis x|y|xy [--out foo.png]

通道参数可以是 PNG 路径或 0~1 常数。灰度图取 R 通道。所有输入图必须同尺寸。`;

const { values, positionals } = parseArgs({
  options: {
    in: { type: "string" },
    out: { type: "string" },
    strength: { type: "string" },
    height: { type: "string" },
    rough: { type: "string" },
    metal: { type: "string" },
    thickness: { type: "string" },
    r: { type: "string" },
    g: { type: "string" },
    b: { type: "string" },
    normal: { type: "string" },
    axis: { type: "string" },
    help: { type: "boolean" },
  },
  allowPositionals: true,
});

const cmd = positionals[0];
if (values.help || !cmd) {
  console.log(HELP);
  process.exit(cmd ? 0 : 1);
}

switch (cmd) {
  case "normal": cmdNormal(values); break;
  case "hrba": cmdHrba(values); break;
  case "mask": cmdMask(values); break;
  case "check": cmdCheck(values); break;
  case "flip": cmdFlip(values); break;
  default: fail(`未知命令 "${cmd}"\n\n${HELP}`);
}
