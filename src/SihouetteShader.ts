export const SILHOUETTE_SHADER_VERTEX: string = /* glsl */` 
uniform float thresholdAngleMin;
uniform float thresholdAngleMax;

attribute vec3 control;
attribute vec3 direction;
attribute float collapse;

void main() {
	const float DEG2RAD = 0.017453292519943295;
	float thresholdDotMin = cos(DEG2RAD * thresholdAngleMin);
	float thresholdDotMax = cos(DEG2RAD * thresholdAngleMax);	

	// Bring all the values in the projection space, so z is always point towards the screen
	vec4 c = projectionMatrix * modelViewMatrix * vec4(control, 1.0);	
	vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);	
	vec4 pDir = projectionMatrix * modelViewMatrix * vec4(position + direction, 1.0);	

	// The direction in 2D with x and y values of point and point + direction
	vec2 dir;
	//The normal direction is the flipping of y to -y as x, and x to y
	vec2 norm;
	//Direction between the control point and the point + direction
	vec2 controlDirection;
	float dotProduct;
	float discardFlag;
	vec3 flaggedPosition;
	vec4 newPosition;

	// Calculating the Normalized coordinates
	c.xy /= c.w;
	p.xy /= p.w;
	pDir.xy /= pDir.w;

	dir  = pDir.xy - p.xy;
	norm  = vec2(-dir.y, dir.x);
	controlDirection = c.xy - pDir.xy;

	dotProduct = dot(normalize(norm), normalize(controlDirection));
	discardFlag = float( dotProduct <= thresholdDotMin && dotProduct >= thresholdDotMax );

	flaggedPosition = position + ((discardFlag > 0.0) ? direction * collapse : vec3(0));
	newPosition = projectionMatrix * modelViewMatrix * vec4(flaggedPosition, 1.0);
	gl_Position = newPosition;
}	
`;

export const SILHOUETTE_SHADER_FRAGMENT: string = /* glsl */`
	
uniform vec3 diffuse;
uniform float opacity;

void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
    gl_FragColor = diffuseColor;
}
`;