uniform mat4 u_modelMatrix;

#ifdef DRAW_MODE_line
uniform vec2 u_stageSize;
#endif

#ifndef DRAW_MODE_line
uniform mat4 u_projectionMatrix;
attribute vec2 a_texCoord;
#endif

attribute vec2 a_position;

varying vec2 v_texCoord;

void main() {
    #ifdef DRAW_MODE_line
    vec4 screenCoord = u_modelMatrix * vec4(a_position, 0, 1);

    gl_Position = screenCoord;
    v_texCoord = ((screenCoord.xy * 0.5) + 0.5) * u_stageSize;
    #else
    gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
    #endif
}
