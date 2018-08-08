uniform mat4 u_projectionMatrix;
uniform mat4 u_modelMatrix;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

#ifdef DRAW_MODE_lineSample
uniform float u_positionScalar;
#endif

void main() {
    #ifdef DRAW_MODE_lineSample
    vec2 position = a_position;
    position.y = clamp(position.y * u_positionScalar, -0.5, 0.5);
    gl_Position = u_projectionMatrix * u_modelMatrix * vec4(position, 0, 1);
    #else
    gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);
    #endif
    v_texCoord = a_texCoord;
}
