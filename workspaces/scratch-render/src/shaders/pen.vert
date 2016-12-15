attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
	vec2 position = vec2(a_texCoord.x - 0.5, 0.5 - a_texCoord.y) * vec2(2, 2);
	gl_Position = vec4(position, 0, 1);
	v_texCoord = a_texCoord;
}
