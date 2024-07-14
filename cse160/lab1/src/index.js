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
import { Matrix4, Vector3 } from "../lib/cuon-matrix-cse160";

// HelloCube.js (c) 2012 matsuda
// Vertex shader program
// Vertex shader program
const VSHADER_SOURCE = `
  attribute vec2 aPosition;
  uniform mat4 uModelMatrix;
  void main() {
    gl_Position = uModelMatrix * vec4(aPosition, 0.0, 1.0);
  }
`;

// Fragment shader program
const FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
  `;

// Retrieve <canvas> element
var canvas = document.getElementById("webgl");

// Get the rendering context for WebGL
var gl = canvas.getContext("webgl");
if (!gl) {
  console.log("Failed to get the rendering context for WebGL");
}

// Initialize shaders
if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
  console.log("Failed to intialize shaders.");
}

//Defined triangle's vertices
const vertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5]);

//Create a buffer to store the vertex data
const vertexBuffer = gl.createBuffer();
if (!vertexBuffer) {
  console.log("Failed to create the buffer object");
}

// Bind the buffer object to the gl.ARRAY_BUFFER target
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Write the vertices data into the buffer object
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Get the storage location of the aPosition attribute variable
const aPosPtr = gl.getAttribLocation(gl.program, "aPosition");

// Check if the attribute location was retrieved successfully
if (aPosPtr < 0) {
  console.error("Could not find aPosition ptr");
}

gl.vertexAttribPointer(aPosPtr, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosPtr);

const M = new Matrix4();

function drawSpaceshipMS(gl, matrix, d, s, y) {
  const uModelMatrixPtr = gl.getUniformLocation(gl.program, "uModelMatrix");

  // Helper function to create a matrix, apply transformations and draw
  function setupAndDraw(tx, ty, tz, rotAngle, sx, sy, sz) {
    const M = new Matrix4();
    M.set(matrix);
    M.translate(tx * s, ty * s + y, tz * s); // Apply scaling and vertical offset
    M.rotate(rotAngle, 0, 0, 1);
    M.scale(sx * s, sy * s, sz * s); // Apply the scaling parameter
    gl.uniformMatrix4fv(uModelMatrixPtr, false, M.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Adjust the setupAndDraw calls with new vertical offset
  setupAndDraw(d, 0, 0, 45, 0.5, 0.5, 1);
  setupAndDraw(d, 0, 0, 225, 0.5, 0.5, 1);
  setupAndDraw(d - 0.25, -0.25, 0, -45, 0.2, 0.2, 1);
  setupAndDraw(d - 0.25, -0.25, 0, 135, 0.2, 0.2, 1);
  setupAndDraw(d - 0.2, -0.35, 0, 90, 0.2, 0.2, 1);
  setupAndDraw(d - 0.35, -0.2, 0, -90, 0.2, 0.2, 1);
  setupAndDraw(d + 0.18, 0.18, 0, -180, 0.35, 0.35, 1);
  setupAndDraw(d - 0.56, -0.2, 0, -270, 0.2, 0.2, 1);
  setupAndDraw(d - 0.2, -0.56, 0, 270, 0.2, 0.2, 1);
}

// Set clear color
//gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearColor(0.2, 0.2, 0.2, 1.0); //Set gray color
gl.clear(gl.COLOR_BUFFER_BIT);

drawSpaceshipMS(gl, M, 0, 0.5, 0);
//drawSpaceshipMS(gl, M, 0, 0.5, 0.5);
drawSpaceshipMS(gl, M, -1, 0.5, 0.5);
drawSpaceshipMS(gl, M, 1, 0.5, 0.5);
drawSpaceshipMS(gl, M, 1, 0.5, 0);
//drawSpaceshipMS(gl, M, 1, 0.5, -0.5);
