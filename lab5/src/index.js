/**
 * With codesandbox we import our functions from the files they live in
 * rather than import that file in the HTML file like we usually do
 *
 * ALSO NOTE that there is NO main function being called.
 * index.js IS your main function and the code written in it is run
 * on page load.
 */
import "./styles.css";
import { initShaders } from "../lib/cuon-utils";
import getContext from "./Context";
import Camera from "./Camera";
import Controls from "./Controls";
import Ocean from "./Ocean";
import Sky from "./Sky";

const VERTEX_SHADER = `
  precision mediump float;
  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 normal;
  
  uniform mat4 modelMatrix;
  uniform mat4 normalMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  
  varying vec3 vNormal;
  
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    vNormal = (normalMatrix * vec4(normal, 1.0)).xyz;
  }
  `;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vNormal;

  void main() {
    vec3 norm = normalize(vNormal);
    
    gl_FragColor = vec4(norm, 1.0);
  }
`;

// Get the rendering context for WebGL
var gl = getContext();

if (!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER))
  console.error("Could not init shaders");

const camera = new Camera([0, 2.5, 5], [0, 1, 0]);
const controls = new Controls(gl, camera);

function tick() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  Ocean.render(gl, camera);
  Sky.render(gl, camera);
  controls.update();

  requestAnimationFrame(tick);
}

tick();
