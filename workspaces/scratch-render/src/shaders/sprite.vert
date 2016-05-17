uniform mat4 u_mvp;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
    gl_Position = u_mvp * vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
}
