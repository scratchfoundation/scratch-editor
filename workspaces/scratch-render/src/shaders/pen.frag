precision mediump float;

uniform sampler2D u_penLayer;

varying vec2 v_texCoord;

void main()
{
	gl_FragColor = texture2D(u_penLayer, v_texCoord);
}
