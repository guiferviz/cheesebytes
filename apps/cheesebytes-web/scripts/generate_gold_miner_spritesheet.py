# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pillow>=11.0.0",
# ]
# ///

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


DEFAULT_SOURCE = Path(
    "/Users/me/temp/Top-down_pixel_art_gold_miner_character_for_a_retr"
)
DEFAULT_OUTPUT = Path(
    "/Users/me/apps/cheesebytes-web/public/cave/greedy-gold-miner/gold-miner-walk.png"
)
DEFAULT_METADATA_OUTPUT = Path(
    "/Users/me/apps/cheesebytes-web/public/cave/greedy-gold-miner/gold-miner-walk.json"
)
ROW_ORDER = ["south", "west", "east", "north"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a Phaser-ready spritesheet from separate miner PNG frames.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Folder containing metadata.json and animations/walk/* frames.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Destination spritesheet PNG.",
    )
    parser.add_argument(
        "--metadata-output",
        type=Path,
        default=DEFAULT_METADATA_OUTPUT,
        help="Destination JSON metadata file.",
    )
    return parser.parse_args()


def load_character_size(source_dir: Path) -> tuple[int, int]:
    metadata_path = source_dir / "metadata.json"
    metadata = json.loads(metadata_path.read_text())
    size = metadata["character"]["size"]
    return int(size["width"]), int(size["height"])


def collect_frames(source_dir: Path, direction: str) -> list[Path]:
    frame_dir = source_dir / "animations" / "walk" / direction
    frames = sorted(frame_dir.glob("frame_*.png"))
    if not frames:
        raise FileNotFoundError(f"No frames found in {frame_dir}")
    return frames


def build_sheet(
    source_dir: Path,
    output_path: Path,
    metadata_output_path: Path,
) -> None:
    frame_width, frame_height = load_character_size(source_dir)
    frame_map = {
        direction: collect_frames(source_dir, direction) for direction in ROW_ORDER
    }
    columns = max(len(paths) for paths in frame_map.values())
    rows = len(ROW_ORDER)

    sheet = Image.new(
        "RGBA", (columns * frame_width, rows * frame_height), (0, 0, 0, 0)
    )

    for row_index, direction in enumerate(ROW_ORDER):
        for col_index, frame_path in enumerate(frame_map[direction]):
            with Image.open(frame_path) as sprite:
                sprite_rgba = sprite.convert("RGBA")
                if sprite_rgba.size != (frame_width, frame_height):
                    raise ValueError(
                        f"Unexpected frame size for {frame_path}: {sprite_rgba.size}"
                    )
                sheet.alpha_composite(
                    sprite_rgba,
                    dest=(col_index * frame_width, row_index * frame_height),
                )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)

    metadata_output = {
        "image": output_path.name,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "rows": ROW_ORDER,
        "framesPerRow": columns,
        "animations": {
            f"walk-{direction}": {
                "start": row_index * columns,
                "end": row_index * columns + len(frame_map[direction]) - 1,
            }
            for row_index, direction in enumerate(ROW_ORDER)
        },
    }
    metadata_output_path.write_text(json.dumps(metadata_output, indent=2) + "\n")


def main() -> None:
    args = parse_args()
    build_sheet(args.source, args.output, args.metadata_output)
    print(f"Spritesheet written to {args.output}")
    print(f"Metadata written to {args.metadata_output}")


if __name__ == "__main__":
    main()
