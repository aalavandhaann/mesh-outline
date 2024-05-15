import { GUI } from 'dat.gui';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, HemisphereLight, LineSegments, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import { SILHOUETTE_SHADER_FRAGMENT, SILHOUETTE_SHADER_VERTEX } from './SihouetteShader';
import './style.css';

type EdgeResult = {
  collapse: number[];
  direction: number[];
  control: number[]
}

type InitializationResult = {
  scene: Scene,
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  controls: OrbitControls
}

function getNormal(a: Vector3, b: Vector3, c: Vector3): Vector3 {
  const ab: Vector3 = new Vector3().subVectors(b, a).normalize();
  const bc: Vector3 = new Vector3().subVectors(c, b).normalize();

  return ab.cross(bc).normalize();
}

function getEdgeResult(a: Vector3, b: Vector3, normal: Vector3): EdgeResult {
  const collapse: number[] = [0, 1];
  const direction: number[] = [];
  const control: number[] = [];

  const currentDirection: Vector3 = new Vector3();
  const currentNormal: Vector3 = new Vector3();
  const currentControl: Vector3 = new Vector3();

  currentDirection.subVectors(b, a);
  currentNormal.crossVectors(currentDirection.clone().normalize(), normal);
  currentControl.copy(a).add(currentNormal);
  direction.push(currentDirection.x, currentDirection.y, currentDirection.z);
  control.push(currentControl.x, currentControl.y, currentControl.z);


  currentDirection.subVectors(a, b);
  // currentNormal.crossVectors(currentDirection.clone().normalize(), normal);
  currentControl.copy(b).add(currentNormal);
  direction.push(currentDirection.x, currentDirection.y, currentDirection.z);
  control.push(currentControl.x, currentControl.y, currentControl.z);

  return { direction: direction, collapse: collapse, control: control };
}

function getSilhouetteGeometry(inGeometry: BufferGeometry): BufferGeometry {

  const geometry: BufferGeometry = inGeometry.clone().toNonIndexed();

  const vertexA: Vector3 = new Vector3();
  const vertexB: Vector3 = new Vector3();
  const vertexC: Vector3 = new Vector3();

  const faceNormal: Vector3 = new Vector3();

  let vertexPositions: BufferAttribute;
  let vertexNormals: BufferAttribute;
  let iteratorIndex: number = 0;
  let edgeResult: EdgeResult;

  let collapse: number[] = [];
  let controls: number[] = [];
  let direction: number[] = [];
  let vertices: number[] = [];


  geometry.computeVertexNormals();
  geometry.normalizeNormals();


  vertexPositions = geometry.getAttribute('position') as BufferAttribute;
  vertexNormals = geometry.getAttribute('normal') as BufferAttribute;



  for (iteratorIndex = 0; iteratorIndex < vertexPositions.count; iteratorIndex += 3) {

    vertexA.fromBufferAttribute(vertexPositions, iteratorIndex);
    vertexB.fromBufferAttribute(vertexPositions, iteratorIndex + 1);
    vertexC.fromBufferAttribute(vertexPositions, iteratorIndex + 2);

    faceNormal.fromBufferAttribute(vertexNormals, iteratorIndex).normalize();

    edgeResult = getEdgeResult(vertexA, vertexB, faceNormal);
    collapse = collapse.concat(edgeResult.collapse);
    direction = direction.concat(edgeResult.direction);
    controls = controls.concat(edgeResult.control);
    vertices.push(vertexA.x, vertexA.y, vertexA.z);
    vertices.push(vertexB.x, vertexB.y, vertexB.z);

    edgeResult = getEdgeResult(vertexB, vertexC, faceNormal);
    collapse = collapse.concat(edgeResult.collapse);
    direction = direction.concat(edgeResult.direction);
    controls = controls.concat(edgeResult.control);
    vertices.push(vertexB.x, vertexB.y, vertexB.z);
    vertices.push(vertexC.x, vertexC.y, vertexC.z);

    edgeResult = getEdgeResult(vertexC, vertexA, faceNormal);
    collapse = collapse.concat(edgeResult.collapse);
    direction = direction.concat(edgeResult.direction);
    controls = controls.concat(edgeResult.control);
    vertices.push(vertexC.x, vertexC.y, vertexC.z);
    vertices.push(vertexA.x, vertexA.y, vertexA.z);
  }

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('control', new Float32BufferAttribute(controls, 3));
  geometry.setAttribute('direction', new Float32BufferAttribute(direction, 3));
  geometry.setAttribute('collapse', new Float32BufferAttribute(collapse, 1));

  return geometry;
}

const gui = new GUI();
const meshControls = gui.addFolder('Mesh Controls');
const materialControls = gui.addFolder('Material Controls');
// Create a cube geometry
const geometry = new TorusGeometry(3, 1);//, 3, 3);
// const geometry = new SphereGeometry(5, 10, 10);
// const geometry = new BoxGeometry(5, 5, 5, 1, 1, 1);

const baseMaterial = new MeshStandardMaterial({ color: 0x00FF00 }); // Green color

const outlineMaterial = new ShaderMaterial({
  vertexShader: SILHOUETTE_SHADER_VERTEX,
  fragmentShader: SILHOUETTE_SHADER_FRAGMENT,
  uniforms: {
    diffuse: {
      value: new Color().setHex(0xFFFFFF)
    },
    opacity: {
      value: 1
    },
    thresholdAngleMin: {
      value: 0
    },
    thresholdAngleMax: {
      value: 90
    },
    lineThickness: {
      value: 3.0
    }
  },
  side: DoubleSide,
  alphaToCoverage: true, // only works when WebGLRenderer's "antialias" is set to "true"
  transparent: false
});


const torusMesh = new Mesh(geometry, baseMaterial);
const torusOutlineMesh = new LineSegments(getSilhouetteGeometry(geometry), outlineMaterial);

const light: HemisphereLight = new HemisphereLight(0xFFFFFF, 0x000000, 1);
const threeBox: HTMLDivElement = document.getElementById('three-box') as HTMLDivElement || document.createElement('DIV');
let threeResult: InitializationResult;

let loader = new GLTFLoader();

function getWindowSize(): Vector2 {
  let width: number = window.innerWidth;
  let height: number = window.innerHeight;
  return new Vector2(width, height);
}

function resizeWindow(): void {
  let renderer: WebGLRenderer = threeResult.renderer;
  let camera: PerspectiveCamera = threeResult.camera;
  let size: Vector2 = getWindowSize();
  let aspectRatio: number = size.x / size.y;

  renderer.setSize(size.x, size.y);
  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix();
  render();
}

function createThreeScene(): InitializationResult {
  let size: Vector2 = getWindowSize();
  let aspectRatio: number = size.x / size.y;
  let scene: Scene = new Scene();
  let camera: PerspectiveCamera = new PerspectiveCamera(45, aspectRatio, 1, 1000);
  let renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });
  let controls: OrbitControls = new OrbitControls(camera, renderer.domElement);

  renderer.autoClear = true;
  renderer.setClearColor(0x444444);
  renderer.setSize(size.x, size.y);
  renderer.setPixelRatio(window.devicePixelRatio);

  return { scene: scene, camera: camera, renderer: renderer, controls: controls };

}

function main() {
  threeResult = createThreeScene();

  threeResult.camera.position.set(20, 5, 20);
  threeResult.controls.target.set(0, 0, 0);

  loader.load("https://threejs.org/examples/models/gltf/Horse.glb", function (gltf) {

    let outline: LineSegments;
    let container = new Group();
    let mesh: Mesh = gltf.scene.children[0] as Mesh;
    // (mesh.material as MeshStandardMaterial).color.set(0x222222);
    // (mesh.material as MeshStandardMaterial).vertexColors = false;
    (mesh.material as MeshStandardMaterial).polygonOffset = true;
    (mesh.material as MeshStandardMaterial).polygonOffsetFactor = 1;

    outline = new LineSegments(getSilhouetteGeometry(mesh.geometry), outlineMaterial);

    container.add(outline);
    container.add(mesh);

    container.scale.set(0.1, 0.1, 0.1);

    threeResult.scene.add(container);

    meshControls.add(mesh, "visible").name("Mesh");
    meshControls.add(outline, "visible").name("Outline");

    materialControls.addColor(outlineMaterial.uniforms.diffuse, 'value').name('Outline Color');
    materialControls.add(outlineMaterial.uniforms.thresholdAngleMin, 'value', 0, 180, 0.1).name('Min Angle Threshold');
    materialControls.add(outlineMaterial.uniforms.thresholdAngleMax, 'value', 0, 180, 0.1).name('Max Angle Threshold');
    materialControls.add(outlineMaterial, 'linewidth', 1, 5).name('Line Width');
    outlineMaterial.linewidth = 5;

  });

  torusMesh.material.polygonOffset = true;
  torusMesh.material.polygonOffsetFactor = 1;

  threeResult.scene.add(torusMesh);
  threeResult.scene.add(torusOutlineMesh);
  threeResult.scene.add(light);


  meshControls.add(torusMesh, 'visible').name('Torus');
  meshControls.add(torusOutlineMesh, 'visible').name('Torus Outline');

  threeResult.renderer.setAnimationLoop(render);

  threeBox.appendChild(threeResult.renderer.domElement);
  window.addEventListener('resize', resizeWindow);
  resizeWindow();
  render();
}

function render(): void {
  threeResult.renderer.render(threeResult.scene, threeResult.camera);
  threeResult.controls.update();
}

main();