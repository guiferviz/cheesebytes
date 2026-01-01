# /// script
# dependencies = [
#   "pillow",
#   "fire"
# ]
# ///

from PIL import Image
import os
import fire
from pathlib import Path


def _load_image(input_path: Path) -> Image.Image:
    return Image.open(input_path).convert("RGBA")


def _resize_image_thumbnail(img: Image.Image, target_size: tuple[int, int]) -> None:
    img.thumbnail(target_size, Image.Resampling.LANCZOS)


def _create_transparent_canvas(target_size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", target_size, (0, 0, 0, 0))


def _paste_on_canvas(canvas: Image.Image, img: Image.Image) -> Image.Image:
    x = (canvas.width - img.width) // 2
    y = (canvas.height - img.height) // 2
    canvas.paste(img, (x, y))
    return canvas


def _save_image(img: Image.Image, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)


def _generate_output_path(input_path: Path, size: int) -> Path:
    base_name = input_path.stem
    extension = input_path.suffix
    return input_path.parent / f"{base_name}_{size}{extension}"


def _is_supported_image_type(file_path: Path) -> bool:
    return file_path.suffix.lower() in [".png", ".webp"]


def _process_single_image_file(
    input_file_path: Path, output_file_path: Path, target_size: tuple[int, int]
):
    try:
        img = _load_image(input_file_path)

        # Directly call Image methods here
        bbox = img.getbbox()

        if not bbox:
            print(
                f"⚠️ Warning: Empty or fully transparent image: {input_file_path}. Skipping."
            )
            return

        cropped_img = img.crop(bbox)  # Direct call
        _resize_image_thumbnail(cropped_img, target_size)

        final_canvas = _create_transparent_canvas(target_size)
        final_image = _paste_on_canvas(final_canvas, cropped_img)

        _save_image(final_image, output_file_path)
        print(f"✅ Processed: {input_file_path} -> {output_file_path}")

    except Exception as e:
        print(f"❌ Error processing {input_file_path}: {e}")


def crop_and_resize(path: str, size: int = 512, output: str = None):
    """
    Crops transparent areas from PNG/WebP images and resizes them to a specified square dimension.

    Args:
        path (str): Path to the image file or a directory containing images.
        size (int): Desired square dimension (width and height in pixels) for the output image.
                    Defaults to 512.
        output (str, optional): Output directory for processed images.
                                If processing a single file and not specified, the output will be
                                named 'original_name_SIZE.extension' in the same directory.
    """
    input_path = Path(path).resolve()
    target_size = (size, size)

    if not input_path.exists():
        print(f"❌ Error: The specified path does not exist: {input_path}")
        return

    if input_path.is_file():
        if not _is_supported_image_type(input_path):
            print(
                f"❌ Error: File '{input_path}' is not a supported image type (.png or .webp)."
            )
            return

        output_path = (
            Path(output).resolve() / input_path.name
            if output
            else _generate_output_path(input_path, size)
        )
        _process_single_image_file(input_path, output_path, target_size)

    elif input_path.is_dir():
        input_folder = input_path
        output_folder = (
            Path(output).resolve() if output else input_folder / f"cropped_{size}"
        )
        output_folder.mkdir(parents=True, exist_ok=True)

        print(f"Processing images in: {input_folder}")
        print(f"Saving cropped images to: {output_folder}")

        found_images = False
        for filename in os.listdir(input_folder):
            file_path = input_folder / filename
            if file_path.is_file() and _is_supported_image_type(file_path):
                found_images = True
                output_file_path = output_folder / filename
                _process_single_image_file(file_path, output_file_path, target_size)

        if not found_images:
            print(f"⚠️ No .png or .webp images found in directory: {input_folder}")
    else:
        print(
            f"❌ The specified path is neither a valid file nor a directory: {input_path}"
        )
        return

    print("\n✅ Process completed.")


if __name__ == "__main__":
    fire.Fire(crop_and_resize)
