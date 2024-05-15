export const SILHOUETTE_SHADER_VERTEX: string = /* glsl */` 

uniform float minAngle;
uniform float maxAngle;
varying float vEdgeFactor;
const float PI = 3.141592653589793;

void main() {
	float DEG2RAD = PI / 180.0;

    vec3 vertexNormal = normalize(normalMatrix * normal);    
	vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);	
	vec3 viewDir = normalize(-viewPosition.xyz); // Normalize the view direction	
	vec4 projectedPosition = projectionMatrix * viewPosition;
	
	float normalDotView = dot(vertexNormal, viewDir); // Dot product of normal and view direction
	float dotMinAngle = cos(DEG2RAD * minAngle);
	float dotMaxAngle = cos(DEG2RAD * maxAngle);
    
	// Determine if the vertex is part of the silhouette
    vEdgeFactor = step(dotMaxAngle, normalDotView) * step(normalDotView, dotMinAngle);

	gl_Position = projectedPosition;
}
`;

export const SILHOUETTE_SHADER_FRAGMENT: string = /* glsl */`
	
uniform vec3 color;
varying float vEdgeFactor;

void main() {
	if (vEdgeFactor == 0.0) {
        discard;
    }
    gl_FragColor = vec4(color, 1.0);//mix(outlineColor, baseColor, edgeFactor);
}
`;