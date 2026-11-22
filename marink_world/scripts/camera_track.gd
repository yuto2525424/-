class_name CameraTrack
extends RefCounted
## カメラの移動経路。キーフレーム（時刻・位置・注視点・画角）をCatmull-Rom風に補間する。
## 同じ時刻のキーを並べると0除算になるので、キーの時刻は必ず単調増加にすること。

var keys: Array = []


func add(time: float, pos: Vector3, target: Vector3, fov: float = 55.0) -> CameraTrack:
	keys.append({"t": time, "pos": pos, "target": target, "fov": fov})
	return self


func sample(time: float) -> Dictionary:
	if time <= float(keys[0]["t"]):
		return _values(keys[0])
	for i in range(keys.size() - 1):
		var a: Dictionary = keys[i]
		var b: Dictionary = keys[i + 1]
		if time <= float(b["t"]):
			var k0: Dictionary = keys[maxi(i - 1, 0)]
			var k3: Dictionary = keys[mini(i + 2, keys.size() - 1)]
			var u: float = (time - float(a["t"])) / (float(b["t"]) - float(a["t"]))
			var pa: Vector3 = a["pos"]
			var pb: Vector3 = b["pos"]
			var p0: Vector3 = k0["pos"]
			var p3: Vector3 = k3["pos"]
			var ta: Vector3 = a["target"]
			var tb: Vector3 = b["target"]
			var t0: Vector3 = k0["target"]
			var t3: Vector3 = k3["target"]
			return {
				"pos": pa.cubic_interpolate(pb, p0, p3, u),
				"target": ta.cubic_interpolate(tb, t0, t3, u),
				"fov": lerpf(float(a["fov"]), float(b["fov"]), u),
			}
	return _values(keys[keys.size() - 1])


func _values(k: Dictionary) -> Dictionary:
	return {"pos": k["pos"], "target": k["target"], "fov": float(k["fov"])}
