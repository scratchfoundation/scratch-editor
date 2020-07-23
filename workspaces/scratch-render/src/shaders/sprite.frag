precision mediump float;

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

#ifdef DRAW_MODE_line
uniform vec4 u_lineColor;
uniform float u_lineThickness;
uniform float u_lineLength;
#endif // DRAW_MODE_line

#ifdef DRAW_MODE_background
uniform vec4 u_backgroundColor;
#endif // DRAW_MODE_background

uniform sampler2D u_skin;

#ifndef DRAW_MODE_background
varying vec2 v_texCoord;
#endif

// Add this to divisors to prevent division by 0, which results in NaNs propagating through calculations.
// Smaller values can cause problems on some mobile devices.
const float epsilon = 1e-3;

#if !defined(DRAW_MODE_silhouette) && (defined(ENABLE_color))
// Branchless color conversions based on code from:
// http://www.chilliant.com/rgb2hsv.html by Ian Taylor
// Based in part on work by Sam Hocevar and Emil Persson
// See also: https://en.wikipedia.org/wiki/HSL_and_HSV#Formal_derivation


// Convert an RGB color to Hue, Saturation, and Value.
// All components of input and output are expected to be in the [0,1] range.
vec3 convertRGB2HSV(vec3 rgb)
{
	// Hue calculation has 3 cases, depending on which RGB component is largest, and one of those cases involves a "mod"
	// operation. In order to avoid that "mod" we split the M==R case in two: one for G<B and one for B>G. The B>G case
	// will be calculated in the negative and fed through abs() in the hue calculation at the end.
	// See also: https://en.wikipedia.org/wiki/HSL_and_HSV#Hue_and_chroma
	const vec4 hueOffsets = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);

	// temp1.xy = sort B & G (largest first)
	// temp1.z = the hue offset we'll use if it turns out that R is the largest component (M==R)
	// temp1.w = the hue offset we'll use if it turns out that R is not the largest component (M==G or M==B)
	vec4 temp1 = rgb.b > rgb.g ? vec4(rgb.bg, hueOffsets.wz) : vec4(rgb.gb, hueOffsets.xy);

	// temp2.x = the largest component of RGB ("M" / "Max")
	// temp2.yw = the smaller components of RGB, ordered for the hue calculation (not necessarily sorted by magnitude!)
	// temp2.z = the hue offset we'll use in the hue calculation
	vec4 temp2 = rgb.r > temp1.x ? vec4(rgb.r, temp1.yzx) : vec4(temp1.xyw, rgb.r);

	// m = the smallest component of RGB ("min")
	float m = min(temp2.y, temp2.w);

	// Chroma = M - m
	float C = temp2.x - m;

	// Value = M
	float V = temp2.x;

	return vec3(
		abs(temp2.z + (temp2.w - temp2.y) / (6.0 * C + epsilon)), // Hue
		C / (temp2.x + epsilon), // Saturation
		V); // Value
}

vec3 convertHue2RGB(float hue)
{
	float r = abs(hue * 6.0 - 3.0) - 1.0;
	float g = 2.0 - abs(hue * 6.0 - 2.0);
	float b = 2.0 - abs(hue * 6.0 - 4.0);
	return clamp(vec3(r, g, b), 0.0, 1.0);
}

vec3 convertHSV2RGB(vec3 hsv)
{
	vec3 rgb = convertHue2RGB(hsv.x);
	float c = hsv.z * hsv.y;
	return rgb * c + hsv.z - c;
}
#endif // !defined(DRAW_MODE_silhouette) && (defined(ENABLE_color))

const vec2 kCenter = vec2(0.5, 0.5);

void main()
{
	#if !(defined(DRAW_MODE_line) || defined(DRAW_MODE_background))
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
		float whirlFactor = max(1.0 - (offsetMagnitude / kRadius), 0.0);
		float whirlActual = u_whirl * whirlFactor * whirlFactor;
		float sinWhirl = sin(whirlActual);
		float cosWhirl = cos(whirlActual);
		mat2 rotationMatrix = mat2(
			cosWhirl, -sinWhirl,
			sinWhirl, cosWhirl
		);

		texcoord0 = rotationMatrix * offset + kCenter;
	}
	#endif // ENABLE_whirl

	#ifdef ENABLE_fisheye
	{
		vec2 vec = (texcoord0 - kCenter) / kCenter;
		float vecLength = length(vec);
		float r = pow(min(vecLength, 1.0), u_fisheye) * max(1.0, vecLength);
		vec2 unit = vec / vecLength;

		texcoord0 = kCenter + r * unit * kCenter;
	}
	#endif // ENABLE_fisheye

	gl_FragColor = texture2D(u_skin, texcoord0);

	#if defined(ENABLE_color) || defined(ENABLE_brightness)
	// Divide premultiplied alpha values for proper color processing
	// Add epsilon to avoid dividing by 0 for fully transparent pixels
	gl_FragColor.rgb = clamp(gl_FragColor.rgb / (gl_FragColor.a + epsilon), 0.0, 1.0);

	#ifdef ENABLE_color
	{
		vec3 hsv = convertRGB2HSV(gl_FragColor.xyz);

		// this code forces grayscale values to be slightly saturated
		// so that some slight change of hue will be visible
		const float minLightness = 0.11 / 2.0;
		const float minSaturation = 0.09;
		if (hsv.z < minLightness) hsv = vec3(0.0, 1.0, minLightness);
		else if (hsv.y < minSaturation) hsv = vec3(0.0, minSaturation, hsv.z);

		hsv.x = mod(hsv.x + u_color, 1.0);
		if (hsv.x < 0.0) hsv.x += 1.0;

		gl_FragColor.rgb = convertHSV2RGB(hsv);
	}
	#endif // ENABLE_color

	#ifdef ENABLE_brightness
	gl_FragColor.rgb = clamp(gl_FragColor.rgb + vec3(u_brightness), vec3(0), vec3(1));
	#endif // ENABLE_brightness

	// Re-multiply color values
	gl_FragColor.rgb *= gl_FragColor.a + epsilon;

	#endif // defined(ENABLE_color) || defined(ENABLE_brightness)

	#ifdef ENABLE_ghost
	gl_FragColor *= u_ghost;
	#endif // ENABLE_ghost

	#ifdef DRAW_MODE_silhouette
	// Discard fully transparent pixels for stencil test
	if (gl_FragColor.a == 0.0) {
		discard;
	}
	// switch to u_silhouetteColor only AFTER the alpha test
	gl_FragColor = u_silhouetteColor;
	#else // DRAW_MODE_silhouette

	#ifdef DRAW_MODE_colorMask
	vec3 maskDistance = abs(gl_FragColor.rgb - u_colorMask);
	vec3 colorMaskTolerance = vec3(u_colorMaskTolerance, u_colorMaskTolerance, u_colorMaskTolerance);
	if (any(greaterThan(maskDistance, colorMaskTolerance)))
	{
		discard;
	}
	#endif // DRAW_MODE_colorMask
	#endif // DRAW_MODE_silhouette

	#ifdef DRAW_MODE_straightAlpha
	// Un-premultiply alpha.
	gl_FragColor.rgb /= gl_FragColor.a + epsilon;
	#endif

	#endif // !(defined(DRAW_MODE_line) || defined(DRAW_MODE_background))

	#ifdef DRAW_MODE_line
	// Maaaaagic antialiased-line-with-round-caps shader.

	// "along-the-lineness". This increases parallel to the line.
	// It goes from negative before the start point, to 0.5 through the start to the end, then ramps up again
	// past the end point.
	float d = ((v_texCoord.x - clamp(v_texCoord.x, 0.0, u_lineLength)) * 0.5) + 0.5;

	// Distance from (0.5, 0.5) to (d, the perpendicular coordinate). When we're in the middle of the line,
	// d will be 0.5, so the distance will be 0 at points close to the line and will grow at points further from it.
	// For the "caps", d will ramp down/up, giving us rounding.
	// See https://www.youtube.com/watch?v=PMltMdi1Wzg for a rough outline of the technique used to round the lines.
	float line = distance(vec2(0.5), vec2(d, v_texCoord.y)) * 2.0;
	// Expand out the line by its thickness.
	line -= ((u_lineThickness - 1.0) * 0.5);
	// Because "distance to the center of the line" decreases the closer we get to the line, but we want more opacity
	// the closer we are to the line, invert it.
	gl_FragColor = u_lineColor * clamp(1.0 - line, 0.0, 1.0);
	#endif // DRAW_MODE_line

	#ifdef DRAW_MODE_background
	gl_FragColor = u_backgroundColor;
	#endif
}
