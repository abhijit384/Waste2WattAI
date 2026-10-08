"""Small dependency-light visual descriptor for CPU research baselines."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

DESCRIPTOR_VERSION = "rgbhist16-gray16-dhash8-v1"


def extract_features(path: str | Path) -> list[float]:
    """Extract normalized color histogram, grayscale thumbnail and edge bits."""
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        histogram = image.histogram()
        pixels = image.width * image.height
        feature: list[float] = []
        for channel in range(3):
            values = histogram[channel * 256 : (channel + 1) * 256]
            for bucket in range(16):
                count = sum(values[bucket * 16 : (bucket + 1) * 16])
                feature.append(2.0 * count / pixels)

        gray = ImageOps.grayscale(image).resize((16, 16), Image.Resampling.LANCZOS)
        luminance = [value / 255.0 for value in gray.get_flattened_data()]
        feature.extend(luminance)

        # 8x8 difference hash, represented as numeric signs for Euclidean distance.
        edge = ImageOps.grayscale(image).resize((9, 8), Image.Resampling.LANCZOS)
        values = list(edge.get_flattened_data())
        for y in range(8):
            for x in range(8):
                feature.append(1.0 if values[y * 9 + x] > values[y * 9 + x + 1] else 0.0)
        return feature
