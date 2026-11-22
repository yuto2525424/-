shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, specular_schlick_ggx;

// 海面：複数のサイン波を重ねた低ポリゴン風の波。時間は episode00.gd から送る。
uniform float time = 0.0;
uniform vec4 deep_color : source_color = vec4(0.02, 0.18, 0.38, 1.0);
uniform vec4 shallow_color : source_color = vec4(0.06, 0.52, 0.64, 1.0);
uniform float wave_height = 0.24;

float wave_fn(vec2 p, float t) {
	return sin(p.x * 0.09 + t * 0.9) * 0.5
		+ sin(p.y * 0.13 - t * 0.7) * 0.35
		+ sin((p.x + p.y) * 0.21 + t * 1.6) * 0.15;
}

void vertex() {
	vec2 p = VERTEX.xz;
	VERTEX.y += wave_fn(p, time) * wave_height;
	float e = 0.6;
	float dx = (wave_fn(p + vec2(e, 0.0), time) - wave_fn(p - vec2(e, 0.0), time)) / (2.0 * e) * wave_height;
	float dz = (wave_fn(p + vec2(0.0, e), time) - wave_fn(p - vec2(0.0, e), time)) / (2.0 * e) * wave_height;
	NORMAL = normalize(vec3(-dx, 1.0, -dz));
}

void fragment() {
	float fres = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 2.5);
	ALBEDO = mix(shallow_color.rgb, deep_color.rgb, fres);
	ALPHA = 0.7;
	ROUGHNESS = 0.06;
	SPECULAR = 0.7;
	METALLIC = 0.0;
}
