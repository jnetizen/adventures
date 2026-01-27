# Story Templates

This directory contains JSON templates for adventure stories. Each template defines:

1. **Characters** - Who appears in the story, with sprite generation prompts
2. **Poses** - Standard pose index mapping
3. **Scenes** - Background prompts and character placements for each scene

## Template Structure

```json
{
  "story_id": "dragon-knight-rescue",
  "title": "The Dragon Knight Rescue",
  "description": "A baby dragon is lost...",
  
  "characters": {
    "character-id": {
      "name": "Display Name",
      "description": "Visual description",
      "signature_item": "Key visual element",
      "sprite_prompt": "Full prompt for Flux+PuLID sprite generation"
    }
  },
  
  "poses": {
    "0": "standing/ready",
    "1": "running/action",
    "2": "pointing",
    "3": "cheering",
    "4": "kneeling/special"
  },
  
  "scenes": [
    {
      "scene_id": "scene-1",
      "name": "Scene Name",
      "narration": "Story text for this scene",
      "background_prompt": "Prompt for Flux Schnell background generation",
      "characters": [
        {
          "character_id": "character-id",
          "pose_index": 0,
          "x": 0.5,
          "y": 0.8,
          "scale": 0.3
        }
      ],
      "notes": "Director's notes for the scene"
    }
  ],
  
  "replicate_settings": {
    "sprite_sheets": { ... },
    "backgrounds": { ... }
  }
}
```

## Current Templates

- **dragon-knight-rescue.json** - Three knights rescue a baby dragon from Stormy Peaks

## Usage

These templates are used by:

1. **Manual generation** - Use prompts in Replicate Playground
2. **Scene Builder (Phase 3)** - Automated scene generation reads these templates
