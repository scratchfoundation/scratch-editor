precision mediump float;

uniform float u_fudge;

#ifdef DRAW_MODE_silhouette
uniform vec4 u_silhouetteColor;
#else // DRAW_MODE_silhouette
# ifdef ENABLE_color
uniform float u_color;
# endif // ENABLE_color
# ifdef ENABLE_brightness
uniform float u_brightness;
# endif // ENABLE_brightness
#endif // DRAW_MODE_silhouette

#ifdef DRAW_MODE_colorMask
uniform vec3 u_colorMask;
uniform float u_colorMaskTolerance;
#endif // DRAW_MODE_colorMask

#ifdef ENABLE_fisheye
uniform float u_fisheye;
#endif // ENABLE_fisheye
#ifdef ENABLE_whirl
uniform float u_whirl;
#endif // ENABLE_whirl
#ifdef ENABLE_pixelate
uniform float u_pixelate;
uniform vec2 u_skinSize;
#endif // ENABLE_pixelate
#ifdef ENABLE_mosaic
uniform float u_mosaic;
#endif // ENABLE_mosaic
#ifdef ENABLE_ghost
uniform float u_ghost;
#endif // ENABLE_ghost

uniform sampler2D u_skin;

varying vec2 v_texCoord;

#if !defined(DRAW_MODE_silhouette) && (defined(ENABLE_color) || defined(ENABLE_brightness))
// Branchless color conversions based on code from:
// http://www.chilliant.com/rgb2hsv.html by Ian Taylor
// Based in part on work by Sam Hocevar and Emil Persson

const float kEpsilon = 1e-6;

vec3 convertRGB2HCV(vec3 rgb)
{
	vec4 p = (rgb.g < rgb.b) ? vec4(rgb.bg, -1, 2.0/3.0) : vec4(rgb.gb, 0, -1.0/3.0);
	vec4 q = (rgb.r < p.x) ? vec4(p.xyw, rgb.r) : vec4(rgb.r, p.yzx);
	float c = q.x - min(q.w, q.y);
	float h = abs((q.w - q.y) / (6.0 * c + kEpsilon) + q.z);
	return vec3(h, c, q.x);
}

vec3 convertRGB2HSL(vec3 rgb)
{
	vec3 hcv = convertRGB2HCV(rgb);
	float l = hcv.z - hcv.y * 0.5;
	float s = hcv.y / (1.0 - abs(l * 2.0 - 1.0) + kEpsilon);
	return vec3(hcv.x, s, l);
}

vec3 convertHue2RGB(float hue)
{
	float r = abs(hue * 6.0 - 3.0) - 1.0;
	float g = 2.0 - abs(hue * 6.0 - 2.0);
	float b = 2.0 - abs(hue * 6.0 - 4.0);
	return clamp(vec3(r, g, b), 0.0, 1.0);
}

vec3 convertHSL2RGB(vec3 hsl)
{
	vec3 rgb = convertHue2RGB(hsl.x);
	float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
	return (rgb - 0.5) * c + hsl.z;
}
#endif // !defined(DRAW_MODE_silhouette) && (defined(ENABLE_color) || defined(ENABLE_brightness))

const vec2 kCenter = vec2(0.5, 0.5);

void main()
{
	vec2 texcoord0 = v_texCoord;

	#ifdef ENABLE_mosaic
	texcoord0 = fract(u_mosaic * texcoord0);
	#endif // ENABLE_mosaic

	#ifdef ENABLE_pixelate
	{
		// TODO: clean up "pixel" edges
		vec2 pixelTexelSize = u_skinSize / u_pixelate;
		texcoord0 = (floor(texcoord0 * pixelTexelSize) + kCenter) / pixelTexelSize;
	}
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

    #ifdef ENABLE_ghost
    gl_FragColor.a *= u_ghost;
    #endif // ENABLE_ghost

	#ifdef DRAW_MODE_silhouette
	// switch to u_silhouetteColor only AFTER the alpha test
	gl_FragColor = u_silhouetteColor;
	#else // DRAW_MODE_silhouette

	#if defined(ENABLE_color) || defined(ENABLE_brightness)
	{
		vec3 hsl = convertRGB2HSL(gl_FragColor.xyz);

		#ifdef ENABLE_color
		{
			// this code forces grayscale values to be slightly saturated
			// so that some slight change of hue will be visible
			const float minLightness = 0.11 / 2.0;
			const float minSaturation = 0.09;
			if (hsl.z < minLightness) hsl = vec3(0.0, 1.0, minLightness);
			else if (hsl.y < minSaturation) hsl = vec3(0.0, minSaturation, hsl.z);

			hsl.x = mod(hsl.x + u_color, 1.0);
			if (hsl.x < 0.0) hsl.x += 1.0;
		}
		#endif // ENABLE_color

		#ifdef ENABLE_brightness
		hsl.z = clamp(hsl.z + u_brightness, 0.0, 1.0);
		#endif // ENABLE_brightness

		gl_FragColor.rgb = convertHSL2RGB(hsl);
	}
	#endif // defined(ENABLE_color) || defined(ENABLE_brightness)

	#ifdef DRAW_MODE_colorMask
	vec3 maskDistance = abs(gl_FragColor.rgb - u_colorMask);
	vec3 colorMaskTolerance = vec3(u_colorMaskTolerance, u_colorMaskTolerance, u_colorMaskTolerance);
	if (any(greaterThan(maskDistance, colorMaskTolerance)))
	{
		discard;
	}
	#endif // DRAW_MODE_colorMask

	// WebGL defaults to premultiplied alpha
	gl_FragColor.rgb *= gl_FragColor.a;

	#endif // DRAW_MODE_silhouette
}
