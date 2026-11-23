extends Node3D
## MARINK WORLD EPISODE 00「はじまりの選択」（約38秒・1080×1920）の演出コントローラ。
## 経過時間 t を進めながら、カメラ・3D世界・字幕・効果をすべて t から計算する。
## Movie Maker は --fixed-fps で delta を固定するため、書き出しと再生で同じ映像になる。

const END_TIME := 38.0            # 演出の基準時間（story 時刻）
const STORY_RATE := 1.0            # 実時間と演出時間を一致させる（38秒）
const SEA_POS := Vector3(-12.0, 0.0, 0.0)
const AQUA_POS := Vector3(0.0, 0.0, 0.0)
const RES_POS := Vector3(12.0, 0.0, 0.0)
const SEABED_SEA_Y := -2.6
const SEABED_RES_Y := -4.6
const SAND := Color(0.86, 0.74, 0.5)
const AIR_FOG := Color(0.72, 0.9, 0.98)
const WATER_FOG := Color(0.03, 0.3, 0.4)
const CUT_TIMES := [12.0, 16.0, 20.0, 25.0]  # ここで一瞬暗転して場面を切り替える

var t := 0.0
var options: Array = []
var track := CameraTrack.new()

var cam: Camera3D
var env: Environment
var water_mat: ShaderMaterial
var ui: CanvasLayer
var tint_rect: ColorRect
var shade_rect: ColorRect
var fade_rect: ColorRect
var flash_rect: ColorRect
var captions: Array = []
var cards: Array = []
var pops: Array = []     # {node, base, start, dur}: 伸びる・出現するノード
var fishes: Array = []   # {node, tail, c, rx, rz, speed, phase, vis}
var kelps: Array = []    # {joints, ph}
var emblems: Array = []  # {node, x}
var bubbles: CPUParticles3D
var aqua_light: OmniLight3D
var ship_root: Node3D
var rov: Node3D
var cable_im: ImmediateMesh
var crane_tip := Vector3.ZERO
var star_root: Node3D
var star_ring: MeshInstance3D
var bgm: AudioStreamPlayer


func _ready() -> void:
	ThemeDB.fallback_font = load("res://fonts/ipag.ttf")
	options = _load_options()
	_build_environment()
	_build_camera_track()
	cam = Camera3D.new()
	cam.current = true
	add_child(cam)
	_build_water()
	_build_school()
	_build_sea_world()
	_build_aquarium_world()
	_build_crowd()
	_build_hook_prop()
	_build_research_world()
	_build_emblems()
	_build_ui()
	bgm = AudioStreamPlayer.new()
	bgm.stream = load("res://audio/bgm_mix.wav")
	add_child(bgm)
	bgm.play()


func _process(delta: float) -> void:
	t += delta * STORY_RATE
	if t >= END_TIME:
		get_tree().quit()
		return
	_update_camera()
	_update_water_and_fog()
	_update_sea()
	_update_aquarium()
	_update_research()
	_update_emblems()
	_update_pops()
	_update_captions()
	_update_overlays()
	for f in fishes:
		_swim(f, t)


# ---------------------------------------------------------------- 準備

func _load_options() -> Array:
	var file := FileAccess.open("res://config/options.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(file.get_as_text())
	return data["options"]


func _opt_label(i: int) -> String:
	return "%d %s" % [i + 1, options[i]["name"]]


func _accent(i: int) -> Color:
	match i:
		0:
			return Color(0.45, 0.9, 0.6)
		1:
			return Color(0.45, 0.8, 1.0)
	return Color(1.0, 0.8, 0.35)


func _build_environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.1, 0.56, 1.0)
	sky_mat.sky_horizon_color = Color(0.7, 0.94, 1.0)
	sky_mat.ground_horizon_color = Color(0.4, 0.72, 0.88)
	sky_mat.ground_bottom_color = Color(0.1, 0.3, 0.45)
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_density = 0.0
	env.fog_light_color = AIR_FOG
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52.0, 28.0, 0.0)
	sun.light_energy = 0.85
	sun.light_color = Color(1.0, 0.97, 0.9)
	sun.shadow_enabled = true
	add_child(sun)


func _build_camera_track() -> void:
	# S1 導入（0〜3秒）：上空から海へ近づく
	track.add(0.0, Vector3(0.0, 4.0, 24.0), Vector3(0.0, -0.5, -6.0), 50.0)
	track.add(1.1, Vector3(0.0, 20.0, 40.0), Vector3(0.0, -1.0, -6.0), 55.0)
	track.add(3.0, Vector3(0.0, 28.0, 46.0), Vector3(0.0, -1.0, -8.0), 55.0)
	# S2 企画紹介（3〜7秒）：海面近くまで降りる。遠方に島
	track.add(7.0, Vector3(0.0, 6.0, 30.0), Vector3(0.0, 0.5, -20.0), 55.0)
	# S3 3択（7〜12秒）：俯瞰へ
	track.add(11.8, Vector3(0.0, 30.0, 26.0), Vector3(0.0, 0.0, 0.0), 72.0)
	# S4 海を育てる（12〜16秒）：海中へ潜る
	track.add(12.0, Vector3(-12.0, 7.0, 22.0), Vector3(-12.0, 0.0, 0.0), 60.0)
	track.add(12.9, Vector3(-12.0, 0.8, 12.0), Vector3(-12.0, -1.2, 0.0), 62.0)
	track.add(14.5, Vector3(-10.0, -1.4, 7.0), Vector3(-12.0, -2.6, -2.0), 62.0)
	track.add(16.0, Vector3(-13.0, -1.8, 4.0), Vector3(-12.0, -2.4, -4.0), 62.0)
	# S5 水族館を作る（16〜20秒）：島へ
	track.add(16.1, Vector3(3.0, 7.0, 26.0), Vector3(0.0, 2.0, 0.0), 56.0)
	track.add(20.0, Vector3(-7.0, 9.0, 14.0), Vector3(0.0, 2.5, 0.0), 56.0)
	# S6 海底を調査する（20〜25秒）：調査船とROV
	track.add(20.1, Vector3(16.0, 6.0, 22.0), Vector3(12.0, 0.0, 0.0), 58.0)
	track.add(22.0, Vector3(16.0, 2.5, 12.0), Vector3(13.2, -1.0, 0.0), 60.0)
	track.add(23.2, Vector3(18.5, -1.6, 6.0), Vector3(14.1, -3.4, -0.8), 60.0)
	track.add(25.0, Vector3(19.0, -2.6, 3.0), Vector3(14.2, -3.8, -1.0), 60.0)
	# S7 投票の説明（25〜32秒）：3つの世界を一画面に
	track.add(25.1, Vector3(0.0, 24.0, 36.0), Vector3(0.0, -1.0, 0.0), 70.0)
	track.add(32.0, Vector3(0.0, 26.0, 34.0), Vector3(0.0, -1.0, 0.0), 70.0)
	# S8 エンディング（32〜38秒）：上空へ引く
	track.add(32.1, Vector3(0.0, 26.0, 34.0), Vector3(0.0, -1.0, 0.0), 70.0)
	track.add(38.0, Vector3(0.0, 80.0, 75.0), Vector3(0.0, 0.0, 0.0), 60.0)


func _build_water() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(360.0, 360.0)
	pm.subdivide_width = 180
	pm.subdivide_depth = 180
	water_mat = ShaderMaterial.new()
	water_mat.shader = load("res://shaders/water.gdshader")
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = water_mat
	add_child(mi)


## S2：海面下を泳ぐ魚の群れ（カメラ近くで影のように見える）
func _build_school() -> void:
	var defs: Array = [
		[Color(0.2, 0.55, 0.95), Color(1.0, 0.85, 0.15), 0.9],
		[Color(0.2, 0.55, 0.95), Color(1.0, 0.85, 0.15), 1.0],
		[Color(0.25, 0.6, 0.9), Color(1.0, 0.85, 0.15), 0.8],
		[Color(0.2, 0.55, 0.95), Color(1.0, 0.85, 0.15), 0.95],
	]
	for i in range(defs.size()):
		var d: Array = defs[i]
		var f := WorldBuilders.fish(self, d[0], d[1], false, d[2])
		fishes.append({
			"node": f["root"], "tail": f["tail"],
			"c": Vector3(-2.0 + i * 1.3, -1.5, 19.0 + (i % 2) * 2.0),
			"rx": 2.2, "rz": 1.6, "speed": 0.6 + i * 0.1, "phase": i * 1.7, "vis": 0.0,
		})


# ---------------------------------------------------------------- 3D世界

## 海の世界（左）：岩と砂の海底から、海藻・サンゴ・魚が育つ
func _build_sea_world() -> void:
	var sea := Node3D.new()
	sea.position = SEA_POS
	add_child(sea)
	var bed := WorldBuilders.terrain(sea, 18.0, 36, 0.9, 11, SAND, Color(0.4, 0.37, 0.36))
	bed.position.y = SEABED_SEA_Y
	for k in range(5):
		WorldBuilders.part(sea, WorldBuilders.cyl_mesh(0.5, 1.1, 14.0, 6), Color(0.85, 0.97, 1.0),
			Vector3(-4.0 + k * 2.0, 3.0, -2.0 + (k % 2) * 3.0), Vector3(0.10, 0.0, 0.16), Vector3.ONE, 0.1, 0.6)
	var rock_defs: Array = [
		[Vector3(-4.0, 0.0, 2.0), 1.1], [Vector3(3.5, 0.0, -1.5), 0.8], [Vector3(-1.0, 0.0, 4.5), 0.6],
		[Vector3(5.0, 0.0, 3.5), 1.3], [Vector3(0.5, 0.0, -5.0), 1.0], [Vector3(-6.0, 0.0, -4.0), 0.7],
	]
	for i in range(rock_defs.size()):
		var d: Array = rock_defs[i]
		var p: Vector3 = d[0]
		WorldBuilders.rock(sea, Vector3(p.x, SEABED_SEA_Y + 0.2, p.z), float(d[1]), Color(0.45, 0.44, 0.46), i + 1)
	var coral_defs: Array = [Vector3(-2.5, 0.0, -2.0), Vector3(2.2, 0.0, 1.5), Vector3(-5.5, 0.0, 3.0), Vector3(6.0, 0.0, -2.5)]
	for i in range(coral_defs.size()):
		var p: Vector3 = coral_defs[i]
		var col := Color(1.0, 0.45, 0.5) if i % 2 == 0 else Color(1.0, 0.7, 0.3)
		var c := WorldBuilders.coral(sea, Vector3(p.x, SEABED_SEA_Y, p.z), col, 30 + i)
		pops.append({"node": c, "base": Vector3.ONE, "start": 14.0 + i * 0.35, "dur": 1.1})
	var kelp_defs: Array = [Vector3(-3.5, 0.0, -0.5), Vector3(-1.0, 0.0, -3.5), Vector3(1.5, 0.0, 1.0), Vector3(4.2, 0.0, -4.0), Vector3(-6.5, 0.0, 0.8)]
	for i in range(kelp_defs.size()):
		var p: Vector3 = kelp_defs[i]
		var k := WorldBuilders.kelp(sea, Vector3(p.x, SEABED_SEA_Y, p.z), 6, 0.95, Color(0.22, 0.62, 0.3))
		var kroot: Node3D = k["root"]
		pops.append({"node": kroot, "base": Vector3.ONE, "start": 13.6 + i * 0.3, "dur": 1.8})
		kelps.append({"joints": k["joints"], "ph": i * 1.3})
	var sea_defs: Array = [
		[Color(1.0, 0.45, 0.1), Color(1.0, 0.45, 0.1), true, 1.0],   # カクレクマノミ風（白帯）
		[Color(0.1, 0.4, 0.9), Color(1.0, 0.85, 0.15), false, 1.1],  # ナンヨウハギ風（青と黄の尾）
		[Color(1.0, 0.85, 0.2), Color(0.25, 0.22, 0.2), false, 1.0], # キイロハギ風
		[Color(0.2, 0.7, 0.85), Color(0.9, 0.9, 0.9), false, 0.9],
		[Color(1.0, 0.45, 0.1), Color(1.0, 0.45, 0.1), true, 0.8],
		[Color(0.1, 0.4, 0.9), Color(1.0, 0.85, 0.15), false, 0.9],
	]
	for i in range(sea_defs.size()):
		var d: Array = sea_defs[i]
		var f := WorldBuilders.fish(sea, d[0], d[1], d[2], d[3])
		fishes.append({
			"node": f["root"], "tail": f["tail"],
			"c": Vector3(-1.0 + i * 1.4, -1.6 - (i % 3) * 0.4, -1.0 + (i % 2) * 2.0),
			"rx": 3.5 + i * 0.4, "rz": 2.5 + (i % 3), "speed": 0.5 + i * 0.07, "phase": i * 1.1, "vis": 13.4,
		})
	bubbles = CPUParticles3D.new()
	bubbles.position = Vector3(0.0, SEABED_SEA_Y, 0.0)
	bubbles.amount = 60
	bubbles.lifetime = 4.0
	bubbles.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	bubbles.emission_box_extents = Vector3(6.0, 0.2, 6.0)
	bubbles.direction = Vector3.UP
	bubbles.spread = 12.0
	bubbles.initial_velocity_min = 0.5
	bubbles.initial_velocity_max = 1.0
	bubbles.gravity = Vector3.ZERO
	bubbles.scale_amount_min = 0.5
	bubbles.scale_amount_max = 1.0
	bubbles.emitting = false
	var bm := SphereMesh.new()
	bm.radius = 0.07
	bm.height = 0.14
	bm.radial_segments = 6
	bm.rings = 3
	bm.material = WorldBuilders.mat(Color(0.9, 0.98, 1.0), 0.1, 0.45, 0.4)
	bubbles.mesh = bm
	sea.add_child(bubbles)


## 水族館の世界（中央）：何もない島に、建物と水槽が組み上がる
func _build_aquarium_world() -> void:
	var aq := Node3D.new()
	aq.position = AQUA_POS
	add_child(aq)
	var isle := WorldBuilders.terrain(aq, 26.0, 44, 0.45, 7, Color(0.86, 0.74, 0.5), Color(0.4, 0.68, 0.34), 11.0, 4.5)
	isle.position.y = 0.6
	var tree_defs: Array = [Vector3(-9.0, 0.6, -7.0), Vector3(9.5, 0.6, -6.0), Vector3(-10.0, 0.6, 3.0), Vector3(10.0, 0.6, 2.5), Vector3(-3.0, 0.6, -10.5), Vector3(4.0, 0.6, -10.2)]
	for p in tree_defs:
		WorldBuilders.part(aq, WorldBuilders.cyl_mesh(0.15, 0.22, 1.8, 5), Color(0.5, 0.36, 0.22), p + Vector3(0.0, 0.9, 0.0))
		WorldBuilders.part(aq, WorldBuilders.sphere_mesh(1.1, 6, 3), Color(0.25, 0.6, 0.3), p + Vector3(0.0, 2.2, 0.0))

	var y0 := 0.6
	var base := WorldBuilders.part(aq, WorldBuilders.box_mesh(Vector3(8.0, 2.4, 5.6)), Color(0.97, 0.96, 0.92), Vector3(0.0, y0 + 1.2, 0.0))
	_pop(base, 16.4, 0.6)
	var roof := WorldBuilders.part(aq, WorldBuilders.box_mesh(Vector3(8.6, 0.35, 6.2)), Color(0.1, 0.5, 0.62), Vector3(0.0, y0 + 2.58, 0.0))
	_pop(roof, 16.7, 0.5)
	var dome := WorldBuilders.part(aq, WorldBuilders.sphere_mesh(2.2, 10, 5), Color(0.6, 0.92, 1.0), Vector3(0.0, y0 + 2.8, -0.7), Vector3.ZERO, Vector3(1.0, 0.45, 0.9), 0.45)
	_pop(dome, 17.0, 0.6)
	for x in [-3.6, 3.6]:
		var pillar := WorldBuilders.part(aq, WorldBuilders.cyl_mesh(0.18, 0.18, 2.4, 6), Color.WHITE, Vector3(x, y0 + 1.2, 2.95))
		_pop(pillar, 16.9, 0.4)
	var sign_board := WorldBuilders.part(aq, WorldBuilders.box_mesh(Vector3(3.6, 0.5, 0.12)), Color(1.0, 0.8, 0.3), Vector3(0.0, y0 + 2.6, 2.9), Vector3.ZERO, Vector3.ONE, 1.0, 0.8)
	_pop(sign_board, 17.3, 0.4)

	var tank_c := Vector3(0.0, y0 + 1.1, 3.6)
	var fill := WorldBuilders.part(aq, WorldBuilders.box_mesh(Vector3(5.0, 2.0, 1.4)), Color(0.1, 0.55, 0.85), tank_c, Vector3.ZERO, Vector3.ONE, 0.42)
	_pop(fill, 18.2, 0.6)
	var glass := WorldBuilders.part(aq, WorldBuilders.box_mesh(Vector3(5.3, 2.3, 1.6)), Color(0.75, 0.95, 1.0), tank_c, Vector3.ZERO, Vector3.ONE, 0.18)
	_pop(glass, 18.2, 0.6)
	var tank_defs: Array = [
		[Color(1.0, 0.45, 0.1), Color(1.0, 0.45, 0.1), true, 0.7, Vector3(-0.8, 0.0, 0.0)],
		[Color(0.1, 0.4, 0.9), Color(1.0, 0.85, 0.15), false, 0.75, Vector3(0.9, 0.2, 0.0)],
		[Color(1.0, 0.85, 0.2), Color(0.25, 0.22, 0.2), false, 0.7, Vector3(0.0, -0.3, 0.2)],
	]
	for i in range(tank_defs.size()):
		var d: Array = tank_defs[i]
		var f := WorldBuilders.fish(aq, d[0], d[1], d[2], d[3])
		fishes.append({
			"node": f["root"], "tail": f["tail"],
			"c": tank_c + (d[4] as Vector3),
			"rx": 1.6, "rz": 0.35, "speed": 0.8 + i * 0.15, "phase": i * 2.1, "vis": 18.6,
		})
	aqua_light = OmniLight3D.new()
	aqua_light.position = Vector3(0.0, y0 + 2.4, 4.6)
	aqua_light.light_color = Color(0.85, 0.97, 1.0)
	aqua_light.light_energy = 0.0
	aqua_light.omni_range = 12.0
	aq.add_child(aqua_light)


## 調査の世界（右）：海底の岩場と、調査船・ROV・ヒトデ
func _build_research_world() -> void:
	var res := Node3D.new()
	res.position = RES_POS
	add_child(res)
	var bed := WorldBuilders.terrain(res, 20.0, 40, 0.7, 23, SAND, Color(0.3, 0.34, 0.4))
	bed.position.y = SEABED_RES_Y
	var rock_defs: Array = [Vector3(-4.0, 0.0, -2.5), Vector3(-2.0, 0.0, 4.5), Vector3(4.5, 0.0, -3.0), Vector3(5.0, 0.0, 4.0)]
	for i in range(rock_defs.size()):
		var p: Vector3 = rock_defs[i]
		WorldBuilders.rock(res, Vector3(p.x, SEABED_RES_Y + 0.2, p.z), 1.1 + i * 0.15, Color(0.38, 0.36, 0.4), 60 + i)
	var kelp_pos := Vector3(-5.0, SEABED_RES_Y, 4.8)
	var k := WorldBuilders.kelp(res, kelp_pos, 4, 0.9, Color(0.25, 0.5, 0.3))
	pops.append({"node": k["root"], "base": Vector3.ONE, "start": 21.0, "dur": 1.5})
	kelps.append({"joints": k["joints"], "ph": 2.0})

	star_root = WorldBuilders.sea_star(res, Vector3(2.2, SEABED_RES_Y + 0.25, -1.0), 1.0)
	star_root.visible = false
	star_ring = WorldBuilders.part(res, _torus(0.55, 0.7), Color(1.0, 0.9, 0.5), Vector3(2.2, SEABED_RES_Y + 0.12, -1.0), Vector3.ZERO, Vector3.ONE, 0.85, 1.0)
	star_ring.visible = false

	var ship := WorldBuilders.research_ship(self)
	ship_root = ship["root"]
	rov = ship["rov"]
	cable_im = ship["cable"]
	crane_tip = ship["crane"]
	ship_root.visible = false


## S3：3つの世界を示す発光リング（海・水族館・調査船のアイコン）
func _build_emblems() -> void:
	var xs: Array = [SEA_POS.x, AQUA_POS.x, RES_POS.x]
	for i in range(3):
		var root := Node3D.new()
		root.position = Vector3(float(xs[i]), 2.5, 0.0)
		root.visible = false
		add_child(root)
		WorldBuilders.part(root, _torus(1.2, 1.42), Color(1.0, 0.86, 0.4), Vector3.ZERO, Vector3.ZERO, Vector3.ONE, 0.85, 1.0)
		match i:
			0:
				for k in range(3):
					WorldBuilders.part(root, WorldBuilders.cyl_mesh(0.07, 0.1, 1.2 + k * 0.25, 5), Color(0.25, 0.7, 0.35), Vector3(-0.5 + k * 0.5, 0.0, 0.0))
			1:
				WorldBuilders.part(root, WorldBuilders.box_mesh(Vector3(1.0, 0.7, 0.8)), Color(0.97, 0.96, 0.92), Vector3(0.0, -0.1, 0.0))
				WorldBuilders.part(root, WorldBuilders.box_mesh(Vector3(1.1, 0.9, 0.9)), Color(0.7, 0.95, 1.0), Vector3(0.0, 0.0, 0.0), Vector3.ZERO, Vector3.ONE, 0.35)
			2:
				WorldBuilders.part(root, WorldBuilders.box_mesh(Vector3(1.2, 0.3, 0.5)), Color(0.94, 0.95, 0.97), Vector3(0.0, -0.1, 0.0))
				WorldBuilders.part(root, WorldBuilders.box_mesh(Vector3(0.5, 0.35, 0.4)), Color(0.95, 0.42, 0.14), Vector3(0.1, 0.15, 0.0))
		emblems.append({"node": root, "x": float(xs[i])})


func _torus(inner: float, outer: float) -> TorusMesh:
	var tm := TorusMesh.new()
	tm.inner_radius = inner
	tm.outer_radius = outer
	return tm


## 冒頭の「?」の箱（参考動画の問いかけの見せ方を、海の世界に合わせた演出）
var hook_root: Node3D


func _build_hook_prop() -> void:
	hook_root = Node3D.new()
	hook_root.position = Vector3(0.0, 3.6, 2.0)
	add_child(hook_root)
	WorldBuilders.part(hook_root, WorldBuilders.box_mesh(Vector3(2.2, 2.2, 2.2)), Color(1.0, 0.82, 0.18), Vector3.ZERO, Vector3.ZERO, Vector3.ONE, 1.0, 0.25)
	var q := Label3D.new()
	q.text = "?"
	q.font_size = 220
	q.pixel_size = 0.012
	q.modulate = Color(0.12, 0.12, 0.14)
	q.outline_size = 0
	q.position = Vector3(0.0, 0.0, 1.14)
	hook_root.add_child(q)
	_pop(hook_root, 0.0, 0.45)


## 島にいる人たち（参考動画のように、街に人が集まる賑やかさを出す）
func _build_crowd() -> void:
	var colors := [Color(0.95, 0.35, 0.3), Color(0.3, 0.6, 0.95), Color(1.0, 0.8, 0.25), Color(0.35, 0.8, 0.5), Color(0.8, 0.45, 0.9), Color(1.0, 0.55, 0.2), Color(0.25, 0.75, 0.85), Color(0.95, 0.5, 0.6)]
	for i in range(colors.size()):
		var root := Node3D.new()
		var x := -6.5 + i * 1.85
		root.position = Vector3(x, 1.2, 5.8 + sin(i * 1.7) * 0.5)
		add_child(root)
		var cap := CapsuleMesh.new()
		cap.radius = 0.32
		cap.height = 1.3
		WorldBuilders.part(root, cap, colors[i], Vector3(0.0, 0.65, 0.0))
		WorldBuilders.part(root, WorldBuilders.sphere_mesh(0.3, 8, 4), Color(1.0, 0.86, 0.72), Vector3(0.0, 1.6, 0.0))
		root.scale = Vector3(0.001, 0.001, 0.001)
		_pop(root, 18.0 + i * 0.12, 0.45)


func _pop(node: Node3D, start: float, dur: float) -> void:
	pops.append({"node": node, "base": node.scale, "start": start, "dur": dur})


# ---------------------------------------------------------------- 毎フレームの更新

func _update_camera() -> void:
	var s := track.sample(t)
	cam.global_position = s["pos"]
	cam.fov = float(s["fov"])
	cam.look_at(s["target"], Vector3.UP)


func _update_water_and_fog() -> void:
	water_mat.set_shader_parameter("time", t)
	var uw := clampf(-cam.global_position.y / 0.8, 0.0, 1.0)
	env.fog_density = 0.035 * uw
	env.fog_light_color = AIR_FOG.lerp(WATER_FOG, uw)
	tint_rect.color.a = 0.25 * uw


func _update_sea() -> void:
	for kp in kelps:
		var joints: Array = kp["joints"]
		for i in range(joints.size()):
			var j: Node3D = joints[i]
			j.rotation.z = sin(t * 1.2 + float(kp["ph"]) + i * 0.55) * 0.05 * float(i + 1)
	bubbles.emitting = t >= 12.6 and t < 16.4


func _update_aquarium() -> void:
	aqua_light.light_energy = 2.2 * clampf((t - 18.6) / 0.6, 0.0, 1.0)


func _update_research() -> void:
	ship_root.visible = t >= 19.8
	var sp := clampf((t - 20.0) / 2.4, 0.0, 1.0)
	var bob := sin(t * 1.3) * 0.08
	ship_root.position = Vector3(lerpf(26.0, RES_POS.x, _ease_out(sp)), 0.2 + bob, 0.0)
	ship_root.rotation.z = sin(t * 0.9) * 0.03

	var dp := clampf((t - 22.0) / 1.8, 0.0, 1.0)
	var de := _ease_in_out(dp)
	rov.position = Vector3(lerpf(0.6, 2.2, de) + sin(t * 0.45) * 0.2 * dp, lerpf(1.0, -3.9, de), lerpf(2.2, -1.0, de))
	cable_im.clear_surfaces()
	cable_im.surface_begin(Mesh.PRIMITIVE_LINES)
	cable_im.surface_add_vertex(crane_tip)
	cable_im.surface_add_vertex(rov.position + Vector3(0.0, 0.2, 0.0))
	cable_im.surface_end()

	star_root.visible = t >= 23.3
	var stp := clampf((t - 23.3) / 0.6, 0.0, 1.0)
	star_root.scale = Vector3.ONE * maxf(0.001, _ease_back(stp))
	star_ring.visible = t >= 23.9 and t < 25.4
	var rp := clampf((t - 23.9) / 1.5, 0.0, 1.0)
	star_ring.scale = Vector3.ONE * lerpf(0.6, 3.0, rp)
	var rm := star_ring.material_override as StandardMaterial3D
	var col := rm.albedo_color
	col.a = 0.85 * (1.0 - rp)
	rm.albedo_color = col


func _update_emblems() -> void:
	for e in emblems:
		var node: Node3D = e["node"]
		node.visible = t >= 7.4 and t < 12.0
		var p := clampf((t - 7.4) / 2.2, 0.0, 1.0)
		node.position = Vector3(float(e["x"]), lerpf(2.5, 7.5, _ease_out(p)), 0.0)
		node.rotation.y = t * 0.8


func _update_pops() -> void:
	for p in pops:
		var node: Node3D = p["node"]
		var k := clampf((t - float(p["start"])) / float(p["dur"]), 0.0, 1.0)
		var s := 0.001 if k <= 0.0 else maxf(0.001, _ease_back(k))
		node.scale = (p["base"] as Vector3) * s


func _swim(f: Dictionary, now: float) -> void:
	var node: Node3D = f["node"]
	var tail: Node3D = f["tail"]
	var c: Vector3 = f["c"]
	var ph: float = f["phase"]
	var a: float = now * float(f["speed"]) + ph
	var rx: float = f["rx"]
	var rz: float = f["rz"]
	var pos := c + Vector3(cos(a) * rx, sin(a * 2.0) * 0.18, sin(a) * rz)
	var vel := Vector3(-sin(a) * rx, cos(a * 2.0) * 0.36, cos(a) * rz)
	node.position = pos
	var parent_node := node.get_parent() as Node3D
	node.look_at(parent_node.to_global(pos + vel), Vector3.UP)
	tail.rotation.y = sin(now * 14.0 + ph) * 0.5
	node.visible = now >= float(f["vis"])


# ---------------------------------------------------------------- UI（字幕・選択肢・暗転）

func _build_ui() -> void:
	ui = CanvasLayer.new()
	ui.layer = 10
	add_child(ui)
	tint_rect = _full_rect(Color(0.0, 0.42, 0.52, 0.0))
	shade_rect = _full_rect(Color(0.02, 0.06, 0.12, 0.0))

	# S1 導入（0〜3秒）
	_caption("この海の未来、", 0.0, 3.0, 600.0, 88, Color.WHITE, 0.12)
	_caption("あなたが決める。", 0.35, 3.0, 720.0, 112, Color(1.0, 0.85, 0.2), 0.12, true)
	_card("投票でシリーズが決まる", 0.4, 3.0, 380.0, Color(1.0, 0.4, 0.35), 40, 640.0)
	# S2 企画紹介（3〜7秒）
	_caption("MARINK WORLD", 3.2, 7.1, 540.0, 100, Color(1.0, 0.96, 0.75))
	_caption("第0話｜はじまりの選択", 3.5, 7.1, 720.0, 60)
	_caption("みんなの投票で、世界が変わる。", 3.8, 7.1, 820.0, 46)
	# S3 3択（7〜12秒）
	_caption("どの世界を始める？", 7.2, 11.9, 600.0, 80)
	for i in range(3):
		_card(_opt_label(i), 9.2 + i * 0.6, 11.9, 960.0 + i * 130.0, _accent(i))
	# S4 海を育てる（12〜16秒）
	_caption("1｜海を育てる", 12.4, 16.0, 600.0, 84)
	_caption("小さな海から、\n生き物たちの世界へ。", 12.8, 16.0, 740.0, 50)
	# S5 水族館を作る（16〜20秒）
	_caption("2｜水族館を作る", 16.4, 20.0, 600.0, 84)
	_caption("何もない場所に、\n理想の水族館を。", 16.8, 20.0, 740.0, 50)
	# S6 海底を調査する（20〜25秒）
	_caption("3｜海底を調査する", 20.4, 25.0, 600.0, 84)
	_caption("海の中に、まだ知らない\n発見がある。", 20.8, 25.0, 740.0, 50)
	_card("発見：ヒトデ（浅い海の生き物）", 23.9, 25.0, 1280.0, Color(1.0, 0.6, 0.3), 44, 980.0)
	# S7 投票の説明（25〜32秒）
	_caption("あなたはどれを選ぶ？", 25.3, 32.0, 560.0, 74)
	for i in range(3):
		_card(_opt_label(i), 27.4 + i * 0.5, 32.0, 760.0 + i * 130.0, _accent(i))
	_caption("コメントに 1・2・3 を送って投票！", 29.4, 32.0, 1290.0, 52, Color(1.0, 0.86, 0.35))
	# S8 エンディング（32〜38秒）
	_caption("次回、あなたたちの選択で\n世界が動き出す。", 32.4, 35.0, 620.0, 66)
	_caption("第1話｜投票結果で決定", 35.0, 36.4, 640.0, 60, Color(1.0, 0.9, 0.5))
	_caption("フォローして、その先を見届けよう。", 35.2, 36.4, 760.0, 42)
	_caption("MARINK", 36.4, 38.0, 920.0, 150, Color(1.0, 0.96, 0.75))
	_caption("海の生き物を、もっと面白く。", 36.6, 38.0, 1110.0, 46)

	var vig := _full_rect(Color(1.0, 1.0, 1.0, 1.0))
	vig.material = ShaderMaterial.new()
	vig.material.shader = load("res://shaders/vignette.gdshader")
	flash_rect = _full_rect(Color(1.0, 1.0, 1.0, 0.0))
	fade_rect = _full_rect(Color(0.0, 0.0, 0.0, 1.0))


func _full_rect(c: Color) -> ColorRect:
	var r := ColorRect.new()
	r.color = c
	r.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(r)
	return r


func _caption(text: String, t0: float, t1: float, y: float, fsize: int, col: Color = Color.WHITE, fade: float = 0.35, punch: bool = false) -> void:
	var pc := PanelContainer.new()
	pc.position = Vector2(40.0, y)
	pc.custom_minimum_size = Vector2(1000.0, 0.0)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.02, 0.08, 0.13, 0.7)
	sb.set_corner_radius_all(18)
	sb.content_margin_left = 24.0
	sb.content_margin_right = 24.0
	sb.content_margin_top = 10.0
	sb.content_margin_bottom = 10.0
	pc.add_theme_stylebox_override("panel", sb)
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", fsize)
	l.add_theme_color_override("font_color", col)
	l.add_theme_color_override("font_outline_color", Color(0.02, 0.1, 0.16, 0.95))
	l.add_theme_constant_override("outline_size", int(fsize * 0.18))
	pc.add_child(l)
	pc.modulate.a = 0.0
	ui.add_child(pc)
	captions.append({"node": pc, "t0": t0, "t1": t1, "y": y, "fade": fade, "punch": punch})


func _card(text: String, t0: float, t1: float, y: float, accent: Color, fsize: int = 56, width: float = 900.0) -> void:
	var pc := PanelContainer.new()
	pc.position = Vector2((1080.0 - width) * 0.5, y)
	pc.custom_minimum_size = Vector2(width, fsize * 1.9)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.03, 0.16, 0.26, 0.88)
	sb.set_corner_radius_all(28)
	sb.border_width_left = 10
	sb.border_color = accent
	sb.content_margin_left = 28.0
	sb.content_margin_right = 28.0
	sb.content_margin_top = 14.0
	sb.content_margin_bottom = 14.0
	pc.add_theme_stylebox_override("panel", sb)
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", fsize)
	l.add_theme_color_override("font_color", Color.WHITE)
	pc.add_child(l)
	pc.modulate.a = 0.0
	ui.add_child(pc)
	cards.append({"node": pc, "t0": t0, "t1": t1, "y": y, "fade": 0.3})


func _update_captions() -> void:
	for c in captions:
		var node: Control = c["node"]
		var a := _win(t, float(c["t0"]), float(c["t1"]), float(c["fade"]))
		node.modulate.a = a
		node.position.y = float(c["y"]) + (1.0 - a) * 24.0
		if c.get("punch", false):
			node.pivot_offset = node.size * 0.5
			var pk := _ease_out(clampf((t - float(c["t0"])) / 0.3, 0.0, 1.0))
			node.scale = Vector2.ONE * (1.0 + 0.4 * (1.0 - pk))
	for c in cards:
		var node2: Control = c["node"]
		var a2 := _win(t, float(c["t0"]), float(c["t1"]), float(c["fade"]))
		node2.modulate.a = a2
		node2.position.y = float(c["y"]) + (1.0 - a2) * 24.0


func _update_overlays() -> void:
	var s := maxf(maxf(_win(t, 3.0, 7.1, 0.5), _win(t, 25.0, 32.0, 0.5)), _win(t, 32.0, 38.0, 0.5))
	shade_rect.color.a = 0.32 * s
	fade_rect.color.a = _fade_alpha(t)
	flash_rect.color.a = 0.85 * clampf(1.0 - t / 0.22, 0.0, 1.0)


## 区間 [a, b] の中で a→a+fade でフェードイン、b-fade→b でフェードアウトする値（0〜1）
func _win(x: float, a: float, b: float, fade: float) -> float:
	var inn := smoothstep(a, a + fade, x)
	var out := 1.0 - smoothstep(b - fade, b, x)
	return clampf(minf(inn, out), 0.0, 1.0)


## 冒頭のフェードイン、場面切り替えの暗転、終わりのフェードアウト
func _fade_alpha(x: float) -> float:
	var a := 0.0
	for b in CUT_TIMES:
		var d := absf(x - float(b))
		if d < 0.18:
			a = maxf(a, 1.0 - d / 0.18)
	if x > 37.2:
		a = maxf(a, (x - 37.2) / 0.8)
	return clampf(a, 0.0, 1.0)


func _ease_out(x: float) -> float:
	return 1.0 - pow(1.0 - clampf(x, 0.0, 1.0), 3.0)


func _ease_in_out(x: float) -> float:
	var v := clampf(x, 0.0, 1.0)
	return v * v * (3.0 - 2.0 * v)


func _ease_back(x: float) -> float:
	var c1 := 1.70158
	var c3 := c1 + 1.0
	var v := clampf(x, 0.0, 1.0)
	return 1.0 + c3 * pow(v - 1.0, 3.0) + c1 * pow(v - 1.0, 2.0)
