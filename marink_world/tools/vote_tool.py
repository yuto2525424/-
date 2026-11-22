#!/usr/bin/env python3
"""MARINK WORLD 投票管理ツール（標準ライブラリのみ・外部APIなし）。

コメント数・いいね数は当面手動で入力する。
  python3 tools/vote_tool.py show
      現在の集計と、暫定の判定結果を表示する（保存しない）
  python3 tools/vote_tool.py set --o1 12 --o2 30 --o3 7 --likes 180
      手動で集計値を入力する（保存する）
  python3 tools/vote_tool.py decide
      暫定判定を表示する（保存しない）
  python3 tools/vote_tool.py decide --final
      確定判定を保存する。同点・投票0件のときは selected_route を undecided のままにする

判定ルール:
  - 投票数0件、または最多得票が複数ある場合は勝者を確定しない（selected_route = "undecided"）
  - development_points = total_likes × config/vote_config.json の points_per_like
"""
import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOTES = ROOT / "data" / "votes" / "episode00.json"
CONFIG = ROOT / "config" / "vote_config.json"
OPTIONS = ROOT / "config" / "options.json"


def load(path: pathlib.Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path: pathlib.Path, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def judge(votes: dict, config: dict) -> tuple[str, int, str]:
    """(selected_route, development_points, 理由) を返す。"""
    counts = {k: int(votes[f"option_{k}_votes"]) for k in (1, 2, 3)}
    total = sum(counts.values())
    points = int(votes["total_likes"]) * int(config["points_per_like"])
    if total == 0:
        return "undecided", points, "投票数が0件のため未決定"
    top = max(counts.values())
    winners = [k for k, v in counts.items() if v == top]
    if len(winners) > 1:
        return "undecided", points, f"同点（{', '.join(str(w) for w in winners)}）のため未決定"
    return f"option_{winners[0]}", points, f"最多得票は選択肢{winners[0]}"


def validate(votes: dict) -> None:
    for key in ("option_1_votes", "option_2_votes", "option_3_votes", "total_likes"):
        value = votes.get(key)
        if not isinstance(value, int) or value < 0:
            sys.exit(f"エラー: {key} は0以上の整数で入力してください（現在: {value!r}）")


def cmd_show(_: argparse.Namespace) -> None:
    votes = load(VOTES)
    config = load(CONFIG)
    options = {o["id"]: o["name"] for o in load(OPTIONS)["options"]}
    print(f"第{votes['episode']}話 集計")
    for k in (1, 2, 3):
        print(f"  {k} {options[k]}: {votes[f'option_{k}_votes']} 票")
    print(f"  いいね合計: {votes['total_likes']}")
    print(f"保存済みの確定状況: {votes['selected_route']} / 発展ポイント {votes['development_points']}")
    route, points, reason = judge(votes, config)
    print(f"暫定判定: {route}（{reason}） / 発展ポイント {points}")


def cmd_set(args: argparse.Namespace) -> None:
    votes = load(VOTES)
    if args.o1 is not None:
        votes["option_1_votes"] = args.o1
    if args.o2 is not None:
        votes["option_2_votes"] = args.o2
    if args.o3 is not None:
        votes["option_3_votes"] = args.o3
    if args.likes is not None:
        votes["total_likes"] = args.likes
    validate(votes)
    save(VOTES, votes)
    print("保存しました。")
    cmd_show(args)


def cmd_decide(args: argparse.Namespace) -> None:
    votes = load(VOTES)
    config = load(CONFIG)
    validate(votes)
    route, points, reason = judge(votes, config)
    print(f"判定: {route}（{reason}） / 発展ポイント {points}")
    if not args.final:
        print("（--final を付けるまで保存しません）")
        return
    votes["selected_route"] = route
    votes["development_points"] = points
    save(VOTES, votes)
    print("確定結果を保存しました。")


def main() -> None:
    parser = argparse.ArgumentParser(description="MARINK WORLD 投票管理")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("show").set_defaults(func=cmd_show)
    p_set = sub.add_parser("set")
    p_set.add_argument("--o1", type=int)
    p_set.add_argument("--o2", type=int)
    p_set.add_argument("--o3", type=int)
    p_set.add_argument("--likes", type=int)
    p_set.set_defaults(func=cmd_set)
    p_decide = sub.add_parser("decide")
    p_decide.add_argument("--final", action="store_true")
    p_decide.set_defaults(func=cmd_decide)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
