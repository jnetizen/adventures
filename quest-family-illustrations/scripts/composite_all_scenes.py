#!/usr/bin/env python3
"""
Batch script to composite all Dragon Knight Rescue scenes.

Runs the compositor for all 5 scenes defined in config/scenes/,
saving outputs to output/scene_N_final.png.
"""

import subprocess
import sys
from pathlib import Path

# Project root (where this script is run from)
PROJECT_ROOT = Path(__file__).parent.parent
SCENES_DIR = PROJECT_ROOT / "config" / "scenes"
OUTPUT_DIR = PROJECT_ROOT / "output"

def main():
    """Composite all scenes."""
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Find all scene config files
    scene_configs = sorted(SCENES_DIR.glob("scene_*.json"))
    
    if not scene_configs:
        print(f"Error: No scene configs found in {SCENES_DIR}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Found {len(scene_configs)} scene configs")
    
    # Composite each scene
    for config_path in scene_configs:
        scene_num = config_path.stem.split("_")[1]  # Extract number from "scene_1.json"
        output_path = OUTPUT_DIR / f"scene_{scene_num}_final.png"
        
        print(f"\nCompositing {config_path.name} -> {output_path.name}...")
        
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m", "src.compositor",
                    "--config", str(config_path),
                    "--output", str(output_path)
                ],
                cwd=PROJECT_ROOT,
                check=True,
                capture_output=True,
                text=True
            )
            print(f"  ✓ Saved: {output_path.name}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ Error compositing {config_path.name}:", file=sys.stderr)
            print(e.stderr, file=sys.stderr)
            sys.exit(1)
    
    print(f"\n✓ Successfully composited {len(scene_configs)} scenes")

if __name__ == "__main__":
    main()
