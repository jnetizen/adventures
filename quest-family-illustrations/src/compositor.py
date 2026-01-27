"""
Quest Family compositor: composite sprite-sheet poses onto backgrounds.

Takes a background PNG and character placement configs (each with their own
sprite sheet path), outputs a composited scene PNG.

Multi-sprite-sheet format: each character in the config specifies its own
sprite_sheet path, allowing different characters with different faces.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter

NUM_POSES = 5
# Alpha masking transition band (feathered edges)
WHITE_LOW = 220
WHITE_HIGH = 245
ALPHA_BLUR_RADIUS = 1  # Very slight blur for anti-aliasing
# Shadow settings
SHADOW_OFFSET = (4, 6)
SHADOW_BLUR_RADIUS = 8
SHADOW_OPACITY = 0.35  # Fixed 30-40% opacity
# Ground alignment
FEET_ALPHA_THRESHOLD = 10  # Minimum alpha to consider a pixel "opaque"


def _crop_poses(sheet: Image.Image) -> list[Image.Image]:
    """Split sprite sheet into 5 equal-width columns."""
    w, h = sheet.size
    if w < NUM_POSES or h < 1:
        raise ValueError(f"Sprite sheet too small: {w}x{h}")
    col_width = w // NUM_POSES
    poses = []
    for i in range(NUM_POSES):
        left = i * col_width
        right = (i + 1) * col_width if i < NUM_POSES - 1 else w
        poses.append(sheet.crop((left, 0, right, h)).copy())
    return poses


def _remove_white_background(img: Image.Image) -> Image.Image:
    """
    Make near-white pixels transparent with feathered/anti-aliased edges.
    Uses a transition band for smooth alpha falloff. Returns RGBA.
    """
    rgb = img.convert("RGB")
    rgba = img.convert("RGBA")
    data = list(rgba.getdata())
    out = []
    
    for (r, g, b), (_, _, _, orig_a) in zip(rgb.getdata(), data):
        # Use max(R,G,B) as luminance-like value
        L = max(r, g, b)
        
        if L >= WHITE_HIGH:
            # Fully transparent
            out.append((r, g, b, 0))
        elif L <= WHITE_LOW:
            # Keep original alpha
            out.append((r, g, b, orig_a))
        else:
            # Transition band: linear falloff
            falloff = (WHITE_HIGH - L) / (WHITE_HIGH - WHITE_LOW)
            new_alpha = int(orig_a * falloff)
            out.append((r, g, b, new_alpha))
    
    rgba.putdata(out)
    
    # Apply very slight blur to alpha channel only for anti-aliasing
    if ALPHA_BLUR_RADIUS > 0:
        alpha_channel = rgba.split()[3]
        alpha_blurred = alpha_channel.filter(ImageFilter.GaussianBlur(radius=ALPHA_BLUR_RADIUS))
        # Recombine RGB with blurred alpha
        rgb_channels = rgba.split()[:3]
        rgba = Image.merge("RGBA", (*rgb_channels, alpha_blurred))
    
    return rgba


def _lowest_opaque_row(pose_rgba: Image.Image) -> int:
    """
    Find the lowest row (closest to bottom) with any opaque pixels.
    This represents where the feet are - the bottom of the visible sprite.
    Returns row index (0-based from top), or image height if none found.
    """
    w, h = pose_rgba.size
    alpha_channel = pose_rgba.split()[3]
    
    # Scan from bottom to top, return the first (lowest) row with opaque pixels
    # This gives us the bottom edge of the visible sprite
    for y in range(h - 1, -1, -1):
        for x in range(w):
            if alpha_channel.getpixel((x, y)) >= FEET_ALPHA_THRESHOLD:
                return y
    
    # No opaque pixels found, return bottom
    return h


def _resize_pose(pose: Image.Image, bg_width: int, bg_height: int, scale: float) -> Image.Image:
    """Resize pose so height = scale * bg_height; width proportional."""
    h_new = max(1, int(scale * bg_height))
    w, h = pose.size
    ratio = h_new / h
    w_new = max(1, int(w * ratio))
    return pose.resize((w_new, h_new), Image.Resampling.LANCZOS)


def _sample_shadow_color(background: Image.Image, region: tuple[int, int, int, int]) -> tuple[int, int, int]:
    """
    Sample dark tones from a region of the background for shadow color.
    Returns (R, G, B) tuple.
    """
    x0, y0, x1, y1 = region
    x0 = max(0, x0)
    y0 = max(0, y0)
    x1 = min(background.width, x1)
    y1 = min(background.height, y1)
    
    if x1 <= x0 or y1 <= y0:
        # Invalid region, return dark gray
        return (50, 50, 50)
    
    # Crop region
    crop = background.crop((x0, y0, x1, y1))
    pixels = list(crop.getdata())
    
    if not pixels:
        return (50, 50, 50)
    
    # Calculate luminance for each pixel: (R + G + B) / 3
    luminances = [(r + g + b) / 3 for r, g, b in pixels]
    
    # Get 10th-25th percentile range (dark tones)
    sorted_lums = sorted(luminances)
    n = len(sorted_lums)
    if n == 0:
        return (50, 50, 50)
    
    p10_idx = max(0, int(n * 0.1))
    p25_idx = min(n - 1, int(n * 0.25))
    
    # Find pixels in this luminance range
    dark_pixels = [
        pixels[i] for i in range(n)
        if sorted_lums[p10_idx] <= luminances[i] <= sorted_lums[p25_idx]
    ]
    
    if not dark_pixels:
        # Fallback: use median of all pixels
        dark_pixels = pixels
    
    # Average the dark pixels
    avg_r = sum(p[0] for p in dark_pixels) // len(dark_pixels)
    avg_g = sum(p[1] for p in dark_pixels) // len(dark_pixels)
    avg_b = sum(p[2] for p in dark_pixels) // len(dark_pixels)
    
    return (avg_r, avg_g, avg_b)


def _shadow_from_alpha(
    alpha: Image.Image,
    offset: tuple[int, int],
    blur: int,
    shadow_color: tuple[int, int, int] | None = None,
) -> tuple[Image.Image, int]:
    """
    Create a shadow layer from alpha channel: offset, blur, with optional color.
    If shadow_color is None, uses dark gray. Returns (shadow, pad).
    """
    w, h = alpha.size
    ox, oy = offset
    pad = blur * 2 + max(abs(ox), abs(oy))
    tw, th = w + 2 * pad, h + 2 * pad
    layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    layer.paste(alpha, (pad + ox, pad + oy), alpha)
    blurred = layer.filter(ImageFilter.GaussianBlur(radius=blur))
    shadow = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    pix = blurred.load()
    
    # Use provided color or default dark gray
    if shadow_color is None:
        shadow_color = (50, 50, 50)
    
    r, g, b = shadow_color
    opacity = int(255 * SHADOW_OPACITY)
    
    for y in range(th):
        for x in range(tw):
            _, _, _, a = pix[x, y]
            if a > 0:
                # Use blurred alpha for shape, but apply fixed opacity
                final_alpha = int(a * SHADOW_OPACITY)
                shadow.putpixel((x, y), (r, g, b, final_alpha))
    
    return shadow, pad


def _composite_one(
    canvas: Image.Image,
    background: Image.Image,
    pose_rgba: Image.Image,
    x_frac: float,
    y_frac: float,
    bg_width: int,
    bg_height: int,
    feet_row: int,
) -> None:
    """
    Composite a single pose onto canvas. (x_frac, y_frac) = feet position (bottom-center).
    Draws shadow first, then sprite. Uses feet_row as the anchor point.
    """
    bw, bh = bg_width, bg_height
    pw, ph = pose_rgba.size
    anchor_x = pw // 2
    anchor_y = feet_row  # Use feet row instead of image bottom
    cx = int(x_frac * bw)
    cy = int(y_frac * bh)
    paste_x = cx - anchor_x
    paste_y = cy - anchor_y

    # Sample shadow color from background region
    # Shadow will be offset down-right, so sample from that region
    ox, oy = SHADOW_OFFSET
    # Estimate shadow region: under the sprite, offset by shadow offset
    shadow_x0 = max(0, paste_x - pw // 4)
    shadow_y0 = max(0, paste_y + ph // 2)
    shadow_x1 = min(bw, paste_x + pw + pw // 4)
    shadow_y1 = min(bh, paste_y + ph + ph // 2 + oy * 2)
    shadow_region = (shadow_x0, shadow_y0, shadow_x1, shadow_y1)
    shadow_color = _sample_shadow_color(background, shadow_region)

    alpha = pose_rgba.split()[3]
    shadow_img, pad = _shadow_from_alpha(
        alpha, SHADOW_OFFSET, SHADOW_BLUR_RADIUS, shadow_color
    )
    sx = paste_x + ox - (pad + ox)
    sy = paste_y + oy - (pad + oy)
    canvas.paste(shadow_img, (sx, sy), shadow_img)
    canvas.paste(pose_rgba, (paste_x, paste_y), pose_rgba)


def _validate_config(config: dict) -> None:
    """
    Validate config and raise if invalid.
    
    Multi-sprite-sheet format:
    {
        "background": "path/to/bg.png",
        "characters": [
            {
                "sprite_sheet": "path/to/sprite.png",
                "pose_index": 0,
                "x": 0.5,
                "y": 0.8,
                "scale": 0.3
            },
            ...
        ]
    }
    """
    if "background" not in config:
        raise ValueError("Config must include 'background'")
    if "characters" not in config:
        raise ValueError("Config must include 'characters'")
    
    bg_path = Path(config["background"])
    if not bg_path.is_file():
        raise FileNotFoundError(f"Background not found: {bg_path}")
    
    for i, c in enumerate(config["characters"]):
        # Validate sprite_sheet per character
        if "sprite_sheet" not in c:
            raise ValueError(f"character[{i}]: missing 'sprite_sheet'")
        sheet_path = Path(c["sprite_sheet"])
        if not sheet_path.is_file():
            raise FileNotFoundError(f"character[{i}]: sprite sheet not found: {sheet_path}")
        
        # Validate pose_index
        pi = c.get("pose_index")
        if pi is None or not (0 <= pi < NUM_POSES):
            raise ValueError(f"character[{i}]: pose_index must be 0–{NUM_POSES - 1}, got {pi}")
        
        # Validate x, y
        x, y = c.get("x"), c.get("y")
        if x is None or y is None:
            raise ValueError(f"character[{i}]: missing 'x' or 'y'")
        if not (0 <= x <= 1 and 0 <= y <= 1):
            raise ValueError(f"character[{i}]: x,y must be 0–1, got ({x}, {y})")
        
        # Validate scale or scale_override
        has_scale = "scale" in c
        has_override = "scale_override" in c
        
        if "base_scale" in config:
            # When base_scale exists, scale is optional, scale_override is optional
            if has_scale:
                # Old format: still allow but warn (could be deprecated)
                pass
            if has_override:
                so = c.get("scale_override")
                if so is None or not (0 < so <= 2):
                    # Allow up to 2.0 for "closer" characters (larger scale)
                    raise ValueError(f"character[{i}]: scale_override must be in (0, 2], got {so}")
        else:
            # When no base_scale, scale is required
            s = c.get("scale")
            if s is None or not (0 < s <= 1):
                raise ValueError(f"character[{i}]: scale must be in (0, 1], got {s}")
    
    # Validate base_scale (if present) - config-level validation
    if "base_scale" in config:
        bs = config["base_scale"]
        if not (0 < bs <= 1):
            raise ValueError(f"base_scale must be in (0, 1], got {bs}")


def composite(config: dict) -> Image.Image:
    """
    Load assets, apply placements, return composited PIL Image.
    
    Multi-sprite-sheet config format:
    {
        "background": "path/to/bg.png",
        "characters": [
            {
                "sprite_sheet": "path/to/char1_sprite.png",
                "pose_index": 0,
                "x": 0.5,
                "y": 0.8,
                "scale": 0.32
            },
            {
                "sprite_sheet": "path/to/char2_sprite.png",
                "pose_index": 2,
                "x": 0.25,
                "y": 0.80,
                "scale": 0.30
            }
        ]
    }
    """
    _validate_config(config)
    
    bg_path = Path(config["background"])
    background = Image.open(bg_path).convert("RGB")
    bg_w, bg_h = background.size
    canvas = background.convert("RGBA")

    # Determine base scale if present
    base_scale = config.get("base_scale")

    for c in config["characters"]:
        # Load this character's sprite sheet
        sheet_path = Path(c["sprite_sheet"])
        sheet = Image.open(sheet_path).convert("RGB")
        poses = _crop_poses(sheet)
        
        # Get the specific pose
        idx = c["pose_index"]
        pose = poses[idx].copy()
        pose_rgba = _remove_white_background(pose)
        
        # Find feet row in original pose (before resize)
        feet_row_orig = _lowest_opaque_row(pose_rgba)
        
        # Determine scale: use base_scale if present, else per-character scale
        if base_scale is not None:
            scale_override = c.get("scale_override", 1.0)
            scale = base_scale * scale_override
        else:
            scale = float(c["scale"])
        
        pose_scaled = _resize_pose(pose_rgba, bg_w, bg_h, scale)
        
        # Calculate feet row in scaled pose
        orig_h = pose_rgba.height
        scaled_h = pose_scaled.height
        if orig_h > 0:
            feet_row_scaled = int(feet_row_orig * (scaled_h / orig_h))
        else:
            feet_row_scaled = scaled_h
        
        _composite_one(
            canvas,
            background,  # Pass original background for shadow sampling
            pose_scaled,
            float(c["x"]),
            float(c["y"]),
            bg_w,
            bg_h,
            feet_row_scaled,
        )

    return canvas.convert("RGB")


def composite_to_file(config: dict, output_path: str) -> None:
    """Composite and save to output_path."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img = composite(config)
    img.save(output_path, "PNG")


def _cli() -> None:
    parser = argparse.ArgumentParser(
        description="Quest Family compositor - composite sprite poses onto backgrounds",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Using config file (recommended for multi-character scenes):
  python -m src.compositor --config config/scenes/scene_1.json --output output/scene_1.png

  # Using CLI arguments:
  python -m src.compositor \\
      --background backgrounds/scene_1.png \\
      --characters '[{"sprite_sheet": "sprites/char1.png", "pose_index": 0, "x": 0.5, "y": 0.8, "scale": 0.3}]' \\
      --output output/scene.png
"""
    )
    parser.add_argument(
        "--config",
        help="Path to JSON config file containing background and characters array"
    )
    parser.add_argument(
        "--background",
        help="Path to background PNG (ignored if --config provided)"
    )
    parser.add_argument(
        "--characters",
        help='JSON array of placements, each with sprite_sheet, pose_index, x, y, scale (ignored if --config provided)'
    )
    parser.add_argument("--output", required=True, help="Output PNG path")
    args = parser.parse_args()

    # Build config from either --config file or CLI args
    if args.config:
        # Config file mode
        config_path = Path(args.config)
        if not config_path.is_file():
            print(f"Error: Config file not found: {config_path}", file=sys.stderr)
            sys.exit(1)
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in config file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # CLI args mode
        if not args.background:
            print("Error: --background is required when not using --config", file=sys.stderr)
            sys.exit(1)
        if not args.characters:
            print("Error: --characters is required when not using --config", file=sys.stderr)
            sys.exit(1)
        
        try:
            characters = json.loads(args.characters)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid --characters JSON: {e}", file=sys.stderr)
            sys.exit(1)

        config = {
            "background": args.background,
            "characters": characters,
        }

    try:
        composite_to_file(config, args.output)
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"Saved: {args.output}")


if __name__ == "__main__":
    _cli()
