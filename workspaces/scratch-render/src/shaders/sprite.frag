precision mediump float;

uniform sampler2D u_skin;
uniform float u_brightness_shift;
uniform float u_hue_shift;
uniform float u_whirl_radians;

varying vec2 v_texCoord;

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

void main()
{
	float hueShift = u_hue_shift;
	float whirlRadians = u_whirl_radians;

	vec2 texcoord0 = v_texCoord;

    // TODO: conditional compilation instead of a runtime 'if' to avoid undefined texture2D behavior
    // see: https://www.opengl.org/wiki/Sampler_%28GLSL%29#Non-uniform_flow_control
	if (whirlRadians != 0.0)
	{
		const vec2 kCenter = vec2(0.5, 0.5);
		const float kRadius = 0.5;
		vec2 offset = texcoord0 - kCenter;
		float offsetMagnitude = length(offset);
		float whirlFactor = 1.0 - (offsetMagnitude / kRadius);
		float whirlActual = whirlRadians * whirlFactor * whirlFactor;
		float sinWhirl = sin(whirlActual);
		float cosWhirl = cos(whirlActual);
		mat2 rotationMatrix = mat2(
			cosWhirl, -sinWhirl,
			sinWhirl, cosWhirl
		);
		if (offsetMagnitude <= kRadius)
		{
			texcoord0 = rotationMatrix * offset + kCenter;
		}
	}

	gl_FragColor = texture2D(u_skin, texcoord0);

	// TODO: See if we can/should use actual alpha test.
	// Does bgfx offer a way to set u_alphaRef? Would that help?
	if (gl_FragColor.a == 0.0)
	{
		discard;
	}

	const bool needHSV = true;
	if (needHSV)
	{
		vec3 hsv = convertRGB2HSV(gl_FragColor.rgb);

		if (hueShift != 0.0)
		{
			// this code forces grayscale values to be slightly saturated
			// so that some slight change of hue will be visible
			if (hsv.b < 0.11) hsv = vec3(0.0, 1.0, 0.11); // force black to dark gray, fully-saturated
			if (hsv.g < 0.09) hsv = vec3(0.0, 0.09, hsv.b); // make saturation at least 0.09

			hsv.r = mod(hsv.r + hueShift, 360.0);
			if (hsv.r < 0.0) hsv.r += 360.0;
		}

		gl_FragColor.rgb = convertHSV2RGB(hsv);
	}
}
