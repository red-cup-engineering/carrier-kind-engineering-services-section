/**
 * The metroplex's three-dimensional tier, loaded only by a browser that can draw it: three's
 * WebGPU build (which falls back to WebGL2 itself) and the qwzspace backend over it.
 * @module
 */
export * as THREE from "three/webgpu";
export { createBackend, toThree } from "@red-cup-engineering/qwzspace/render-three";
