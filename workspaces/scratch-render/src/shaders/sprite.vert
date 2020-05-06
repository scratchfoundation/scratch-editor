precision mediump float;

#ifdef DRAW_MODE_line
uniform vec2 u_stageSize;
uniform float u_lineThickness;
uniform vec4 u_penPoints;

// Add this to divisors to prevent division by 0, which results in NaNs propagating through calculations.
// Smaller values can cause problems on some mobile devices.
const float epsilon = 1e-3;
#endif

#ifndef DRAW_MODE_line
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelMatrix;
attribute vec2 a_texCoord;
#endif

attribute vec2 a_position;

varying vec2 v_texCoord;

void main() {
	#ifdef DRAW_MODE_line
	// Calculate a rotated ("tight") bounding box around the two pen points.
	// Yes, we're doing this 6 times (once per vertex), but on actual GPU hardware,
	// it's still faster than doing it in JS combined with the cost of uniformMatrix4fv.

	// Expand line bounds by sqrt(2) / 2 each side-- this ensures that all antialiased pixels
	// fall within the quad, even at a 45-degree diagonal
	vec2 position = a_position;
	float expandedRadius = (u_lineThickness * 0.5) + 1.4142135623730951;

	float lineLength = length(u_penPoints.zw - u_penPoints.xy);

	position.x *= lineLength + (2.0 * expandedRadius);
	position.y *= 2.0 * expandedRadius;

	// Center around first pen point
	position -= expandedRadius;

	// Rotate quad to line angle
	vec2 pointDiff = u_penPoints.zw - u_penPoints.xy;
	// Ensure line has a nonzero length so it's rendered properly
	// As long as either component is nonzero, the line length will be nonzero
	pointDiff.x = abs(pointDiff.x) < epsilon ? epsilon : pointDiff.x;
	// The `normalized` vector holds rotational values equivalent to sine/cosine
	// We're applying the standard rotation matrix formula to the position to rotate the quad to the line angle
	vec2 normalized = pointDiff / max(lineLength, epsilon);
	position = mat2(normalized.x, normalized.y, -normalized.y, normalized.x) * position;
	// Translate quad
	position += u_penPoints.xy;

	// Apply view transform
	position *= 2.0 / u_stageSize;

	gl_Position = vec4(position, 0, 1);
	v_texCoord = position * 0.5 * u_stageSize;
	#else
	gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);
	v_texCoord = a_texCoord;
	#endif
}
