// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
precision mediump float;

// Attributes from the vertex buffer
attribute vec4 a_Position;  // Vertex position
attribute vec2 a_UV;        // Texture coordinates
attribute vec3 a_Normal;    // Normal vector
attribute vec4 a_Color;     

// Varyings to pass data to the fragment shader
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec4 v_VertPos;

// Uniforms for transformation matrices
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;

void main() {
  // Calculate the final vertex position by applying all transformation matrices
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

  // Pass the texture coordinates and normal vector to the fragment shader
  v_UV = a_UV;
  v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
  v_Normal = a_Normal;

  // Calculate the vertex position in world space
  v_VertPos = u_ModelMatrix * a_Position;
}`;

var FSHADER_SOURCE = `
precision mediump float;

varying vec2 v_UV;
varying vec3 v_Normal;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
uniform sampler2D u_Sampler5;
uniform sampler2D u_Sampler6;
uniform int u_whichTexture;
uniform vec3 u_lightPos;
uniform vec3 u_cameraPos;
uniform bool u_lightOn; 
varying vec4 v_VertPos;

uniform vec3 u_spotLightPos;
uniform vec3 u_spotLightDir;
uniform float u_spotLightCutoff;
uniform float u_spotLightOuterCutoff;
uniform float u_spotLightIntensity;

void main() {
    vec4 texColor;

    if (u_whichTexture == -3) {
        texColor = vec4((v_Normal + 1.0) / 2.0, 1.0); // Normal visualization
    } else if (u_whichTexture == -2) {
        texColor = u_FragColor;  // Use plain color
    } else if (u_whichTexture == -1) {
        texColor = vec4(v_UV, 1.0, 1.0); // Display texture coordinates
    } else if (u_whichTexture == 0) {
        texColor = texture2D(u_Sampler0, v_UV); // Texture 0
    } else if (u_whichTexture == 1) {
        texColor = texture2D(u_Sampler1, v_UV); // Texture 1
    } else if (u_whichTexture == 2) {
        texColor = texture2D(u_Sampler2, v_UV); // Texture 2
    } else if (u_whichTexture == 3) {
        texColor = texture2D(u_Sampler3, v_UV); // Texture 3
    } else if (u_whichTexture == 4) {
        texColor = texture2D(u_Sampler4, v_UV); // Texture 4 (night sky)
    } else if (u_whichTexture == 5) {
        texColor = texture2D(u_Sampler5, v_UV); // Texture 5 (sunrise sky)
    } else if (u_whichTexture == 6) {
        texColor = texture2D(u_Sampler6, v_UV); // Texture 6 (new texture)
    } else {
        texColor = vec4(1.0, 0.2, 0.2, 1.0); // Fallback color for errors
    }

    vec3 lightVector = u_lightPos - vec3(v_VertPos);
    float r = length(lightVector);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    vec3 R = reflect(-L, N);

    // eye
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    // Specular
    float specular = pow(max(dot(E, R), 0.0), 64.0) * 0.8;

    vec3 diffuse = vec3(texColor) * nDotL * 0.7;
    vec3 ambient = vec3(texColor) * 0.3;

    // Spotlight calculations
    vec3 spotLightDir = normalize(u_spotLightDir);
    vec3 fragToLight = normalize(u_spotLightPos - vec3(v_VertPos));
    float theta = dot(fragToLight, spotLightDir);

    float epsilon = u_spotLightCutoff - u_spotLightOuterCutoff;
    float intensity = clamp((theta - u_spotLightOuterCutoff) / epsilon, 0.0, 1.0);

if (theta > u_spotLightOuterCutoff) {
    float spotDiffuse = max(dot(N, fragToLight), 0.0);
    float spotSpecular = pow(max(dot(E, reflect(-fragToLight, N)), 0.0), 32.0);

    diffuse += vec3(texColor) * spotDiffuse * intensity * 2.0; 
    specular += spotSpecular * intensity * 2.0;  
}

    if (u_lightOn) {
        gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
    } else {
        gl_FragColor = texColor;
    }
}`;

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal; 
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_NormalMatrix;
let u_Samplers = [];
let u_whichTexture;
let u_lightPos;
let u_CameraPos;
let g_horizontalAngle = 175.0;
let g_verticalAngle = 0.0;
let isLightPosSliderActive = false;
//let isNightMode = false;
//let isSunriseMode = false;

// Global Variables Related to UI Elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize=5;
let g_globalAngle=0; 
let g_yellowAngle=0;
let g_magentaAngle=0;
let g_yellowAnimation=false;
let g_magentaAnimation=false;
let g_NormalOn=false;
let g_lightOn=true;
let g_lightPos=[0, 1, -2];

// Global Variables for Spotlight
let spotlightIntensity = 1.0;
let u_spotLightPos;
let u_spotLightDir;
let u_spotLightCutoff;
let u_spotLightOuterCutoff;
let u_spotLightIntensity;

function radians(degrees) {
    return degrees * Math.PI / 180.0;
}

const setupWebGL = () => {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  // Enable blending and set blend function
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.enable(gl.DEPTH_TEST);
}

const connectVariablesToGLSL = () => {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of a_UV
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  // Get the storage location of a Normal
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }
  
  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_lightPos
  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
      console.log('Failed to get the storage location of u_lightPos');
      return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
      console.log('Failed to get the storage location of u_cameraPos');
      return;
  }
  
  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  let u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }
  u_Samplers.push(u_Sampler0);

  let u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
  }
  u_Samplers.push(u_Sampler1);

  let u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler2');
    return false;
  }
  u_Samplers.push(u_Sampler2);

  let u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  if (!u_Sampler3) {
    console.log('Failed to get the storage location of u_Sampler3');
    return false;
  }
  u_Samplers.push(u_Sampler3);

  let u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');
  if (!u_Sampler4) {
    console.log('Failed to get the storage location of u_Sampler4');
    return false;
  }
  u_Samplers.push(u_Sampler4);

  let u_Sampler5 = gl.getUniformLocation(gl.program, 'u_Sampler5');
  if (!u_Sampler5) {
    console.log('Failed to get the storage location of u_Sampler5');
    return false;
  }
  u_Samplers.push(u_Sampler5);

  let u_Sampler6 = gl.getUniformLocation(gl.program, 'u_Sampler6');
  if (!u_Sampler6) {
    console.log('Failed to get the storage location of u_Sampler6');
    return false;
  }
  u_Samplers.push(u_Sampler6);

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return false;
  }

  // Get the storage location of u_lightOn
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

    u_spotLightPos = gl.getUniformLocation(gl.program, 'u_spotLightPos');
    u_spotLightDir = gl.getUniformLocation(gl.program, 'u_spotLightDir');
    u_spotLightCutoff = gl.getUniformLocation(gl.program, 'u_spotLightCutoff');
    u_spotLightOuterCutoff = gl.getUniformLocation(gl.program, 'u_spotLightOuterCutoff');
    u_spotLightIntensity = gl.getUniformLocation(gl.program, 'u_spotLightIntensity');
    
    if (!u_spotLightPos || !u_spotLightDir || !u_spotLightCutoff || !u_spotLightOuterCutoff || !u_spotLightIntensity) {
        return;
    }
}

const addActionsForHtmlUI = () => {
  // Update camera angle on input
  document.getElementById('cameraAngle').addEventListener('input', (event) => {
      g_horizontalAngle = parseFloat(event.target.value);
      renderAllShapes();
  });

  // Enable mouse dragging for canvas
  canvas.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      let rect = ev.target.getBoundingClientRect();
      if (rect.left <= ev.clientX && ev.clientX < rect.right && rect.top <= ev.clientY && ev.clientY < rect.bottom) {
          lastX = ev.clientX;
          lastY = ev.clientY;
          dragging = true;
      }
  });

  // Handle mouse movement for dragging
  canvas.addEventListener('mousemove', (ev) => {
      if (dragging) {
          let dx = (ev.clientX - lastX) * 10.0 * Math.PI / canvas.width;
          let dy = (ev.clientY - lastY) * 10.0 * Math.PI / canvas.height;
          currentAngleX += dx;
          currentAngleY += dy;
          renderAllShapes();
          lastX = ev.clientX;
          lastY = ev.clientY;
      }
  });

  // Disable dragging on mouse up
  canvas.addEventListener('mouseup', () => {
      dragging = false;
  });

// Toggle light visualization
document.getElementById('lightOn').onclick = function() { g_lightOn = true; };
document.getElementById('lightOff').onclick = function() { g_lightOn = false; };
  
// Toggle normal visualization
document.getElementById('normalOn').onclick = function() { g_NormalOn = true; };
document.getElementById('normalOff').onclick = function() { g_NormalOn = false; };

// Adjust angles with sliders
document.getElementById('yellowSlide').addEventListener('mousemove', function() { g_yellowAngle = this.value; renderAllShapes(); });
  document.getElementById('magentaSlide').addEventListener('mousemove', function() { g_magentaAngle = this.value; renderAllShapes(); });

// Event listeners for light position sliders
document.getElementById('lightSlideX').addEventListener('mousedown', function() { 
      isLightPosSliderActive = true; 
  });
  document.getElementById('lightSlideX').addEventListener('mouseup', function() { 
      isLightPosSliderActive = false; 
  });
  document.getElementById('lightSlideX').addEventListener('input', function(ev) { 
      g_lightPos[0] = this.value / 100; 
      renderAllShapes(); 
  });

  document.getElementById('lightSlideY').addEventListener('mousedown', function() { 
      isLightPosSliderActive = true; 
  });
  document.getElementById('lightSlideY').addEventListener('mouseup', function() { 
      isLightPosSliderActive = false; 
  });
  document.getElementById('lightSlideY').addEventListener('input', function(ev) { 
      g_lightPos[1] = this.value / 100; 
      renderAllShapes(); 
  });

  document.getElementById('lightSlideZ').addEventListener('mousedown', function() { 
      isLightPosSliderActive = true; 
  });
  document.getElementById('lightSlideZ').addEventListener('mouseup', function() { 
      isLightPosSliderActive = false; 
  });
  document.getElementById('lightSlideZ').addEventListener('input', function(ev) { 
      g_lightPos[2] = this.value / 100; 
      renderAllShapes(); 
  });

  // Toggle animation for yellow and magenta
  document.getElementById('animationYellowOnButton').onclick = function() { g_yellowAnimation = true; };
  document.getElementById('animationYellowOffButton').onclick = function() { g_yellowAnimation = false; };
  document.getElementById('animationMagentaOnButton').onclick = function() { g_magentaAnimation = true; };
  document.getElementById('animationMagentaOffButton').onclick = function() { g_magentaAnimation = false; };

}


let images = {
  0: 'ground.jpg',
  1: 'cloud-sky.jpg',
  2: 'llama-skin.jpg',
  3: 'llama-tail.jpg',
  4: 'night-sky.png',
  5: 'sunrise-sky.jpg',
  6: 'checker.jpg'
}

function initTextures() {
  for (let i = 0; i < Object.keys(images).length; i++) {
    const image = new Image();
    if (!image) {
      console.log('Failed to create the image object');
      return false;
    }

    image.onload = function(){ sendImageToTexture(image, i); };
    // Tell the browser to load an Image
    image.src = images[i];
    //console.log(image.src);
  }

  return true;
}

function sendImageToTexture(image, textureNum) {
  // Create a texture object
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image's y axis
  // Activate texture unit0
  gl.activeTexture(gl.TEXTURE0 + textureNum);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameter
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the image to texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit to the sampler
  gl.uniform1i(u_Samplers[textureNum], textureNum);

}

const g_startTime = performance.now()/1000.0;
let g_seconds = performance.now()/1000.0 - g_startTime;

const tick = () => {
  g_seconds = performance.now()/1000.0 - g_startTime;
  // console.log(g_seconds);
  updateAnimationAngles();
  renderAllShapes();
  renderLlama(0, 0, 0, 1.0);
  renderLlama(1, 0, 0, 0.5); 
  //if (Math.random() > 0.250) {
    //x = Math.floor(Math.random()*32);
    //y = Math.floor(Math.random()*32);
    //if (g_map[x][y] > 0) {
      //g_map[x][y] += Math.round(Math.random()*2) - 1;
    //} else {
      //g_map[x][y] = 1;
    //}   
  //}
  drawMap();
  requestAnimationFrame(tick);
}


const convertCoordinateEventToGL = (ev) => {
  let x = ev.clientX; // x coordinate of a mouse pointer
  let y = ev.clientY; // y coordinate of a mouse pointer
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return [x, y];
}

// Update the angles of everything if currently animated
function updateAnimationAngles() {
    if (g_yellowAnimation) {
        g_yellowAngle = (45 * Math.sin(g_seconds));
    }
    if (g_magentaAnimation) {
        g_magentaAngle = (45 * Math.sin(3 * g_seconds));
    }

    //g_neckAngle = (20 * Math.sin(g_seconds));  
    //g_headAngle = (25 * Math.sin(3 * g_seconds));
    //g_legsAngle = (25 * Math.sin(3 * g_seconds));
    //g_earsAngle = (5 * Math.sin(4 * g_seconds));
    //g_tailAngle = (5 * Math.sin(4 * g_seconds));
  
  if (!isLightPosSliderActive) {
      g_lightPos[0] = 1.3 * Math.cos(g_seconds);
  }
}

function keydown(ev) {
    switch (ev.keyCode) {
        case 39: // Right arrow
            g_eye[0] += 0.2;
            break;
        case 37: // Left arrow
            g_eye[0] -= 0.2;
            break;
        case 81: // Q - rotate left
            g_horizontalAngle += 5; 
            break;
        case 69: // E - rotate right
            g_horizontalAngle -= 5; 
            break;
        case 87: // W - move forward
            g_eye[2] -= 0.2; // Moves the camera forward along the Z-axis
            break;
        case 65: // A - move left
            g_eye[0] -= 0.2; // Moves the camera left along the X-axis
            break;
        case 83: // S - move backward
            g_eye[2] += 0.2; // Moves the camera backward along the Z-axis
            break;
        case 68: // D - move right
            g_eye[0] += 0.2; // Moves the camera right along the X-axis
            break;
    }
    renderAllShapes();
    // console.log(ev.keyCode);
}

let g_camera = new Camera();

var g_eye = [0, 0, 3];
var g_at = [0, 0, -100];
var g_up = [0, 1, 0];

var g_map = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 1],
    [1, 4, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
];

g_map = new Array(32).fill(null).map(() => new Array(32).fill(0));

function drawMap() {
    for (x = 0; x < 32; x++) {
        for (y = 0; y < 32; y++) {
            //console.log(x, y);
            if (x % 4 == 0 && y % 4 == 0) {
              if (g_map[x][y] > 0) {
                var shrub = new Cube();
                shrub.color = [0, 1, 0, 1];
                shrub.textureNum = 0;
                //shrub.matrix.translate(0, -0.75, 0);
                shrub.matrix.translate(x - 14, -0.5, y - 14);
                shrub.matrix.scale(0.75, g_map[x][y], 0.75);
                shrub.render();
              }
            }
        }
    }
}

/*
// Mode Toggle Functions
function setDayMode() {
    isNightMode = false;
    isSunriseMode = false;  // Ensure sunrise mode is turned off when it's day
    renderAllShapes();  
}

function setNightMode() {
    isNightMode = true;
    isSunriseMode = false;  
    renderAllShapes(); 
}

function setSunriseMode() {
    isNightMode = false;    // Ensure night mode is turned off when it's sunrise
    isSunriseMode = true;
    renderAllShapes(); 
}
*/

const renderAllShapes = () => {
  let startTime = performance.now();
  gl.clearColor(0, 0, 0, 1.0);
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const globalRotateMatrix = new Matrix4().rotate(g_horizontalAngle + currentAngleX, 0, 1, 0);
  globalRotateMatrix.rotate(g_verticalAngle + currentAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotateMatrix.elements);

  var projMat = new Matrix4();
  projMat.setPerspective(50, 1 * canvas.width / canvas.height, 1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  // Pass the view matrix
  var viewMat = new Matrix4();
  viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  /*
  var normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
*/
  
  /*
  // Pass the view matrix
  var viewMat = new Matrix4();
  // viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]);
  viewMat.setLookAt(
      g_camera.eye.x, g_camera.eye.y, g_camera.eye.z,
      g_camera.at.x, g_camera.at.y, g_camera.at.z,
      g_camera.up.x, g_camera.up.y, g_camera.up.z
      // (eye, at, up)
  );
  // viewMat.setLookAt(0,0,3, 0,0,-100, 0,1,0); // (eye, at, up)
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);
*/
  
  /*
  if (isNightMode) {
      renderNightSky();
  } else if (isSunriseMode) {
      renderSunriseSky();
  } else {
      renderDaySky();
  }
  
  const ground = new Cube();
  ground.color = [1,0,0,1];
  ground.textureNum = 0;
  ground.matrix.translate(0, -0.5, 0);
  ground.matrix.scale(128, 0, 128);
  ground.matrix.translate(-0.5, 0, -0.5);
  ground.render();

function renderDaySky() {
  const sky = new Cube();
  sky.color = [1,1,1,1];
  sky.textureNum = 1;
  sky.matrix.scale(-128, -128, -128);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();
} 

function renderNightSky() {
  const night_sky = new Cube();
  //night_sky.color = [1,1,1,1];
  night_sky.textureNum = 4;
  night_sky.matrix.scale(-128, -128, -128);
  night_sky.matrix.translate(-0.5, -0.5, -0.5);
  gl.uniform1i(u_whichTexture, 4);
  night_sky.render();
}

function renderSunriseSky() {
    const night_sky = new Cube();
    //night_sky.color = [1,1,1,1];
    night_sky.textureNum = 5;
    night_sky.matrix.scale(-128, -128, -128);
    night_sky.matrix.translate(-0.5, -0.5, -0.5);
    gl.uniform1i(u_whichTexture, 5);
    night_sky.render();
  }
*/

  // Set the correct texture mode
  gl.uniform1i(u_whichTexture, g_NormalOn ? -3 : -2);

  // Pass the light position to GLSL
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  // Pass the camera position to GLSL
  gl.uniform3f(u_cameraPos, g_camera.eye.x, g_camera.eye.y, g_camera.eye.z);

  // Pass the light status
  gl.uniform1i(u_lightOn, g_lightOn);

  gl.uniform1f(u_spotLightIntensity, spotlightIntensity);

  // Set uniform values
  gl.uniform3f(u_spotLightPos, 1.0, 1.0, 1.0); 
  gl.uniform3f(u_spotLightDir, 0.0, -1.0, 0.0); 
  gl.uniform1f(u_spotLightCutoff, Math.cos(12.5 * Math.PI / 180.0)); 
  gl.uniform1f(u_spotLightOuterCutoff, Math.cos(15.0 * Math.PI / 180.0)); 
  gl.uniform1f(u_spotLightIntensity, 1.0); 

  const ground = new Cube();
  ground.color = [1,0,0,1];
  ground.textureNum = g_NormalOn ? -3 : 0;
  //ground.textureNum = 0;
  ground.matrix.translate(0, -0.5, 0);
  ground.matrix.scale(128, 0, 128);
  ground.matrix.translate(-0.5, 0, -0.5);
  ground.render();
    
  const sky = new Cube();
  sky.textureNum = g_NormalOn ? -3 : 1;
  //sky.color = [1,1,1,1];
  sky.textureNum = g_NormalOn ? -3 : 1;
  //sky.textureNum = 1;
  sky.matrix.scale(-128, -128, -128);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();
    
  // Draw the light
  var light = new Cube();
  light.color = [2, 2, 0, 1];
  light.textureNum = g_NormalOn ? -3 : -2;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(.08, .08, .08);
  light.matrix.translate(0, -6, 20);
  light.render();
    
  // Draw Sphere
  var sp = new Sphere();
  sp.textureNum = g_NormalOn ? -3 : -2;
  sp.matrix.translate(0, 0, -1.5); 
  sp.matrix.scale(0.15, 0.15, 0.15); 
  sp.render();

/*
  // Draw the body cube
  var body = new Cube();
  body.color = [1.0, 0.0, 0.0, 1.0];
  body.textureNum = g_NormalOn ? -3 : -2;
  body.matrix.translate(-0.25, -0.75, 0.0);
  body.matrix.rotate(-5,1,0,0);
  body.matrix.scale(0.5, .3, .5);
  body.normalMatrix.setInverseOf(body.matrix).transpose();
  body.render();

  // Draw a left arm
  var yellow = new Cube();
  yellow.color = [1, 1, 0, 1];
  yellow.textureNum = g_NormalOn ? -3 : -2;
  yellow.matrix.setTranslate(0, -0.5, 0.0); 
  yellow.matrix.rotate(-5,1,0,0);
  yellow.matrix.rotate(-g_yellowAngle,0,0,1);
  var yellowCoordinatesMat=new Matrix4(yellow.matrix);
  yellow.matrix.scale(0.25, 0.7, 0.5);
  yellow.matrix.translate(-0.5,0,0);
  yellow.normalMatrix.setInverseOf(yellow.matrix).transpose();
  yellow.render();
  
  // Test box
  var box = new Cube();
  box.color = [1, 0, 1, 1];
  box.textureNum = g_NormalOn ? -3 : -2;
  box.matrix = yellowCoordinatesMat;
  box.matrix.translate(0, 0.65, 0);
  box.matrix.rotate(g_magentaAngle, 0, 0, 1);
  box.matrix.scale(0.3, 0.3, 0.3);
  box.matrix.translate(-0.5, 0, -0.001);
  box.normalMatrix.setInverseOf(box.matrix).transpose();
  box.render();
*/

  let duration = performance.now() - startTime;
  sendTextToHTML(`ms: ${Math.floor(duration)} fps: ${Math.floor(10000/duration)/10}`, 'info');
}

const sendTextToHTML = (text, htmlTag) => {
  let htmlObj = document.getElementById(htmlTag);
  if (!htmlObj) {
    console.log(`Failed to get ${htmlTag} from HTML`);
    return;
  }
  htmlObj.innerHTML = text;
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  document.onkeydown = keydown;

  initTextures();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  requestAnimationFrame(tick);
}