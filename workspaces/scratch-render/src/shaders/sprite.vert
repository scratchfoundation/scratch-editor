attribute vec4 position;
varying vec2 v_texCoord;

uniform mat4 u_transform;
uniform mat4 u_projection;

void main() {
    gl_Position = u_projection * u_transform * position;

    // Map clipspace coordinates to texture coordinates
    v_texCoord = (position.xy * vec2(1.0, -1.0)) + vec2(0.5);
}
