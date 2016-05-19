precision mediump float;

#ifdef ENABLE_color
uniform float u_color;
#endif
#ifdef ENABLE_fisheye
uniform float u_fisheye;
#endif
#ifdef ENABLE_whirl
uniform float u_whirl;
#endif
#ifdef ENABLE_pixelate
uniform float u_pixelate;
#endif
#ifdef ENABLE_mosaic
uniform float u_mosaic;
#endif
#ifdef ENABLE_brightness
uniform float u_brightness;
#endif
#ifdef ENABLE_ghost
uniform float u_ghost;
#endif

uniform sampler2D u_skin;
#define u_pixelate_half vec2(0.5,0.5) // TODO

varying vec2 v_texCoord;

#if defined(ENABLE_color) || defined(ENABLE_brightness)
vec3 convertRGB2HSV(vec3 rgb)
{
	float maxRGB = max(max(rgb.r, rgb.g), rgb.b);
	float minRGB = min(min(rgb.r, rgb.g), rgb.b);
	float span = maxRGB - minRGB;
	float h, s;
	if (span == 0.0)
	{
		h = s = 0.0;
	}
	else
	{
		if (maxRGB == rgb.r) h = 60.0 * ((rgb.g - rgb.b) / span);
		else if (maxRGB == rgb.g) h = 120.0 + 60.0 * ((rgb.b - rgb.r) / span);
		else h = 240.0 + 60.0 * ((rgb.r - rgb.g) / span);
		s = span / maxRGB;
	}
	return vec3(h, s, maxRGB);
}

vec3 convertHSV2RGB(vec3 hsv)
{
	float h = hsv.r;
	float s = hsv.g;
	float v = hsv.b;

	float f = h / 60.0;
	int i = int(f);
	f -= float(i);
	float p = v * (1.0 - s);
	float q = v * (1.0 - (s * f));
	float t = v * (1.0 - (s * (1.0 - f)));

	vec3 rgb;

	if (i == 1)
	{
		rgb = vec3(q, v, p);
	}
	else if (i == 2)
	{
		rgb = vec3(p, v, t);
	}
	else if (i == 3)
	{
		rgb = vec3(p, q, v);
	}
	else if (i == 4)
	{
		rgb = vec3(t, p, v);
	}
	else if (i == 5)
	{
		rgb = vec3(v, p, q);
	}
	else // i == 0, i == 6, or h was out of range
	{
		rgb = vec3(v, t, p);
	}

	return rgb;
}
#endif // defined(ENABLE_color) || defined(ENABLE_brightness)

const vec2 kCenter = vec2(0.5, 0.5);

void main()
{
	vec2 texcoord0 = v_texCoord;

	#ifdef ENABLE_mosaic
	texcoord0 = fract(u_mosaic * texcoord0);
	#endif // ENABLE_mosaic

	#ifdef ENABLE_pixelate
	texcoord0 = floor(texcoord0 / u_pixelate) * u_pixelate + u_pixelate_half;
	#endif // ENABLE_pixelate

	#ifdef ENABLE_whirl
	{
		const float kRadius = 0.5;
		vec2 offset = texcoord0 - kCenter;
		float offsetMagnitude = length(offset);
		float whirlFactor = 1.0 - (offsetMagnitude / kRadius);
		float whirlActual = u_whirl * whirlFactor * whirlFactor;
		float sinWhirl = sin(whirlActual);
		float cosWhirl = cos(whirlActual);
		mat2 rotationMatrix = mat2(
			cosWhirl, -sinWhirl,
			sinWhirl, cosWhirl
		);

		// TODO: tweak this algorithm such that texture coordinates don't depend on conditionals.
		// see: https://www.opengl.org/wiki/Sampler_%28GLSL%29#Non-uniform_flow_control
		if (offsetMagnitude <= kRadius)
		{
			texcoord0 = rotationMatrix * offset + kCenter;
		}
	}
	#endif // ENABLE_whirl

	#ifdef ENABLE_fisheye
	{
		vec2 vec = (texcoord0 - kCenter) / kCenter;
		float r = pow(length(vec), u_fisheye);
		float angle = atan(vec.y, vec.x);
		// TODO: tweak this algorithm such that texture coordinates don't depend on conditionals.
		// see: https://www.opengl.org/wiki/Sampler_%28GLSL%29#Non-uniform_flow_control
		if (r <= 1.0)
		{
			texcoord0 = kCenter + r * vec2(cos(angle), sin(angle)) * kCenter;
		}
	}
	#endif // ENABLE_fisheye

	gl_FragColor = texture2D(u_skin, texcoord0);

	if (gl_FragColor.a == 0.0)
	{
		discard;
	}

	#if defined(ENABLE_color) || defined(ENABLE_brightness)
	{
		vec3 hsv = convertRGB2HSV(gl_FragColor.rgb);

		#ifdef ENABLE_color
		{
			// this code forces grayscale values to be slightly saturated
			// so that some slight change of hue will be visible
			if (hsv.b < 0.11) hsv = vec3(0.0, 1.0, 0.11); // force black to dark gray, fully-saturated
			if (hsv.g < 0.09) hsv = vec3(0.0, 0.09, hsv.b); // make saturation at least 0.09

			hsv.r = mod(hsv.r + u_color, 360.0);
			if (hsv.r < 0.0) hsv.r += 360.0;
		}
		#endif // ENABLE_color

		#ifdef ENABLE_brightness
		hsv.b = clamp(hsv.b + u_brightness, 0.0, 1.0);
		#endif // ENABLE_brightness

		gl_FragColor.rgb = convertHSV2RGB(hsv);
	}
	#endif // defined(ENABLE_color) || defined(ENABLE_brightness)

	#ifdef ENABLE_ghost
	gl_FragColor.a *= u_ghost;
	#endif // ENABLE_ghost
}
