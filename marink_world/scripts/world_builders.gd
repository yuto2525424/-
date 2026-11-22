class_name WorldBuilders
extends RefCounted
## 低ポリゴンの部品（箱・円柱・球）から海・島・船・生き物を組み立てる関数集。
## 外部の3Dモデルや素材は使わず、すべて手続き的に生成する（権利的に安全・差し替えも容易）。
## 生き物は実在種の特徴（カクレクマノミの白帯、ナンヨウハギの青と黄の尾、ヒトデ、コンブ、枝状のサンゴ）を簡略化して再現する。


static func mat(color: Color, rough: float = 0.85, alpha: float = 1.0, emit: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color.r, color.g, color.b, alpha)
	m.roughness = rough
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emit
	return m


static func part(parent: Node3D, mesh: Mesh, color: Color, pos: Vector3 = Vector3.ZERO, rot: Vector3 = Vector3.ZERO, scl: Vector3 = Vector3.ONE, alpha: float = 1.0, emit: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat(color, 0.85, alpha, emit)
	mi.position = pos
	mi.rotation = rot
	mi.scale = scl
	parent.add_child(mi)
	return mi


static func box_mesh(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b


static func cyl_mesh(r_top: float, r_bot: float, h: float, segs: int = 6) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = r_top
	c.bottom_radius = r_bot
	c.height = h
	c.radial_segments = segs
	c.rings = 1
	return c


static func sphere_mesh(r: float, segs: int = 8, rings: int = 4) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = segs
	s.rings = rings
	return s


## 高さをノイズで決めた地形。面ごとに色を変えて低ポリゴン風にする。
## sink_radius > 0 のときは中心から離れるほど沈む（島の周りを海に沈める）。
static func terrain(parent: Node3D, size: float, res: int, amp: float, seed_val: int, low: Color, high: Color, sink_radius: float = 0.0, sink: float = 0.0) -> MeshInstance3D:
	var noise := FastNoiseLite.new()
	noise.seed = seed_val
	noise.frequency = 0.07
	var half := size * 0.5
	var step := size / float(res)
	var n := res + 1
	var heights: Array = []
	for j in range(n):
		for i in range(n):
			var x := -half + i * step
			var z := -half + j * step
			var y := noise.get_noise_2d(x, z) * amp
			if sink_radius > 0.0:
				y -= smoothstep(sink_radius * 0.55, sink_radius, Vector2(x, z).length()) * sink
			heights.append(y)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	for j in range(res):
		for i in range(res):
			var corners: Array = [
				Vector3(-half + i * step, heights[j * n + i], -half + j * step),
				Vector3(-half + (i + 1) * step, heights[j * n + i + 1], -half + j * step),
				Vector3(-half + i * step, heights[(j + 1) * n + i], -half + (j + 1) * step),
				Vector3(-half + (i + 1) * step, heights[(j + 1) * n + i + 1], -half + (j + 1) * step),
			]
			for tri in [[0, 2, 1], [1, 2, 3]]:
				var avg := 0.0
				for k in tri:
					avg += corners[k].y
				avg /= 3.0
				var f := clampf((avg + amp) / (amp * 2.0), 0.0, 1.0)
				var col: Color = low.lerp(high, f) * (0.93 + rng.randf() * 0.14)
				col.a = 1.0
				for k in tri:
					st.set_color(col)
					st.add_vertex(corners[k])
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var vm := StandardMaterial3D.new()
	vm.vertex_color_use_as_albedo = true
	vm.roughness = 0.95
	vm.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = vm
	parent.add_child(mi)
	return mi


## 海藻（コンブ風）。関節を重ねて、根元から揺れるようにする。
static func kelp(parent: Node3D, pos: Vector3, segments: int, seg_h: float, color: Color) -> Dictionary:
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	var joints: Array = []
	var cur: Node3D = root
	for i in range(segments):
		var joint := Node3D.new()
		joint.position = Vector3(0.0, seg_h if i > 0 else 0.0, 0.0)
		cur.add_child(joint)
		part(joint, cyl_mesh(0.07, 0.11, seg_h * 1.02, 5), color, Vector3(0.0, seg_h * 0.5, 0.0))
		part(joint, box_mesh(Vector3(0.5, 0.05, 0.18)), color.lightened(0.15), Vector3(0.16, seg_h * 0.55, 0.0), Vector3(0.0, 0.0, -0.45))
		joints.append(joint)
		cur = joint
	return {"root": root, "joints": joints}


## 枝状のサンゴ（ミドリイシ風の簡略形）。
static func coral(parent: Node3D, pos: Vector3, color: Color, seed_val: int) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	for k in range(7):
		var ang := rng.randf() * TAU
		var tilt := rng.randf_range(0.2, 0.7)
		var length := rng.randf_range(0.6, 1.3)
		var br := Node3D.new()
		br.rotation = Vector3(cos(ang) * tilt, 0.0, sin(ang) * tilt)
		root.add_child(br)
		part(br, cyl_mesh(0.04, 0.09, length, 5), color, Vector3(0.0, length * 0.5, 0.0))
		part(br, sphere_mesh(0.09, 5, 3), color.lightened(0.2), Vector3(0.0, length, 0.0))
	return root


static func rock(parent: Node3D, pos: Vector3, r: float, color: Color, seed_val: int) -> MeshInstance3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val * 97
	var scl := Vector3(rng.randf_range(0.9, 1.4), rng.randf_range(0.5, 0.8), rng.randf_range(0.8, 1.2)) * r
	return part(parent, sphere_mesh(1.0, 6, 3), color, pos, Vector3(0.0, rng.randf() * TAU, 0.0), scl)


## 魚。進行方向は -Z。尾は tail ノードの回転で振る。
static func fish(parent: Node3D, body_color: Color, fin_color: Color, stripe: bool, size_f: float) -> Dictionary:
	var root := Node3D.new()
	root.scale = Vector3.ONE * size_f
	parent.add_child(root)
	part(root, sphere_mesh(0.5, 8, 4), body_color, Vector3.ZERO, Vector3.ZERO, Vector3(0.38, 0.58, 0.95))
	var tail := Node3D.new()
	tail.position = Vector3(0.0, 0.0, 0.5)
	root.add_child(tail)
	part(tail, box_mesh(Vector3(0.05, 0.5, 0.3)), fin_color, Vector3(0.0, 0.0, 0.14))
	part(root, box_mesh(Vector3(0.06, 0.22, 0.3)), fin_color, Vector3(0.0, 0.33, 0.0))
	part(root, sphere_mesh(0.07, 4, 2), Color.WHITE, Vector3(0.26, 0.1, -0.42))
	part(root, sphere_mesh(0.07, 4, 2), Color.WHITE, Vector3(-0.26, 0.1, -0.42))
	if stripe:
		part(root, box_mesh(Vector3(0.9, 0.62, 0.12)), Color(0.98, 0.98, 0.95), Vector3(0.0, 0.0, -0.05))
		part(root, box_mesh(Vector3(0.9, 0.62, 0.1)), Color(0.98, 0.98, 0.95), Vector3(0.0, 0.0, 0.3))
	return {"root": root, "tail": tail}


## ヒトデ（浅い海の生き物）。
static func sea_star(parent: Node3D, pos: Vector3, r: float) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.scale = Vector3.ONE * r
	parent.add_child(root)
	var c := Color(0.95, 0.45, 0.2)
	part(root, sphere_mesh(0.28, 6, 3), c, Vector3.ZERO, Vector3.ZERO, Vector3(1.0, 0.35, 1.0))
	for k in range(5):
		var a := TAU * k / 5.0
		part(root, box_mesh(Vector3(0.24, 0.08, 0.95)), c, Vector3(sin(a) * 0.55, 0.0, cos(a) * 0.55), Vector3(0.0, a, 0.0))
	return root


## 調査船。船の向きは +X を進行方向として扱う（船体は長手方向を Z に置く）。
## 戻り値: root（船全体）, rov（水中ロボット）, cable（ケーブル用 ImmediateMesh）, crane（クレーン先端のローカル座標）
static func research_ship(parent: Node3D) -> Dictionary:
	var root := Node3D.new()
	root.position = Vector3(26.0, 0.2, 0.0)
	parent.add_child(root)
	var hull := Color(0.94, 0.95, 0.97)
	var accent := Color(0.95, 0.42, 0.14)
	part(root, box_mesh(Vector3(2.0, 1.0, 4.8)), hull, Vector3(0.0, 0.0, 0.0))
	part(root, box_mesh(Vector3(2.04, 0.22, 4.84)), accent, Vector3(0.0, -0.36, 0.0))
	part(root, box_mesh(Vector3(1.6, 1.1, 2.0)), hull, Vector3(0.0, 1.05, -0.9))
	part(root, box_mesh(Vector3(1.66, 0.22, 2.06)), accent, Vector3(0.0, 1.72, -0.9))
	part(root, cyl_mesh(0.05, 0.05, 2.0, 6), Color(0.35, 0.36, 0.4), Vector3(0.0, 2.6, -1.2))
	part(root, box_mesh(Vector3(0.14, 0.14, 2.2)), Color(0.25, 0.27, 0.32), Vector3(0.6, 1.6, 0.9), Vector3(-0.35, 0.0, 0.0))

	var rov := Node3D.new()
	rov.position = Vector3(0.6, 1.0, 2.2)
	root.add_child(rov)
	part(rov, box_mesh(Vector3(0.7, 0.4, 0.5)), Color(1.0, 0.8, 0.12), Vector3.ZERO)
	part(rov, box_mesh(Vector3(0.5, 0.12, 0.3)), Color(0.2, 0.2, 0.22), Vector3(0.0, 0.25, 0.0))
	part(rov, cyl_mesh(0.03, 0.03, 0.4, 4), Color(0.2, 0.2, 0.22), Vector3(0.3, 0.2, 0.0))
	var spot := SpotLight3D.new()
	spot.position = Vector3(0.0, -0.2, 0.0)
	spot.rotation = Vector3(-1.3, 0.0, 0.0)
	spot.light_color = Color(1.0, 0.95, 0.8)
	spot.light_energy = 2.5
	spot.spot_range = 16.0
	spot.spot_angle = 32.0
	rov.add_child(spot)

	var cable := MeshInstance3D.new()
	var im := ImmediateMesh.new()
	cable.mesh = im
	var cm := StandardMaterial3D.new()
	cm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cm.albedo_color = Color(0.9, 0.9, 0.95)
	cable.material_override = cm
	root.add_child(cable)
	return {"root": root, "rov": rov, "cable": im, "crane": Vector3(0.6, 1.7, 2.0)}
