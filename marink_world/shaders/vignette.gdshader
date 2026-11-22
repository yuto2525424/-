shader_type canvas_item;

// 画面の四隅を少し暗くして、中央に視線を集める。全画面に重ねる。
void fragment() {
	vec2 uv = UV - vec2(0.5);
	float d = length(uv * vec2(1.0, 1.2));
	float v = smoothstep(0.42, 0.95, d);
	COLOR = vec4(0.01, 0.05, 0.09, v * 0.55);
}
