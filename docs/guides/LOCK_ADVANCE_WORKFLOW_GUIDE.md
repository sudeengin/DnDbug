# 🔒 Scene Lock & Advance Workflow Guide

## Overview

The Scene Lock & Advance workflow ensures proper sequential scene development by preventing users from progressing to the next scene until the current scene is finalized (locked). This maintains story continuity and prevents context inconsistencies.

## How It Works

### 1. **Scene States**
- **Draft**: Scene exists but no detail generated yet
- **Generated**: Scene detail has been generated
- **Edited**: Scene detail has been modified after generation
- **Locked**: Scene is finalized and cannot be edited (unless unlocked)
- **NeedsRegen**: Scene needs to be regenerated due to changes in previous scenes

### 2. **Workflow Steps**

#### Step 1: Generate Scene Detail
1. Navigate to the **Scenes** tab
2. Select Scene 1 from the scene list
3. Click **"Generate Detail"** to create detailed content
4. Scene status changes from **Draft** → **Generated**

#### Step 2: Edit Scene (Optional)
1. While the scene is **Generated** or **Edited**, you can modify the content
2. Use the **SceneDetailEditor** to make changes
3. Scene status changes to **Edited** when saved

#### Step 3: Lock Scene
1. When satisfied with the scene content, click **"Lock Scene"**
2. Scene status changes to **Locked**
3. The **"Generate Next"** button now becomes available
4. Scene becomes read-only (cannot be edited unless unlocked)

#### Step 4: Generate Next Scene
1. Click **"Generate Next"** to create the next scene
2. The system uses context from all **locked** previous scenes
3. Scene 2 becomes accessible and can be edited
4. Repeat the process for subsequent scenes

### 3. **Access Control**

#### Scene Gating Rules
- **Scene 1**: Always accessible (no prerequisites)
- **Scene N (N > 1)**: Only accessible if Scene N-1 is **Locked**
- **Disabled scenes**: Show "Lock previous scene first" tooltip

#### Visual Indicators
- **Green border**: Scene is locked
- **Grayed out**: Scene is disabled (previous scene not locked)
- **Status badges**: Show current state (Draft/Generated/Edited/Locked/NeedsRegen)

### 4. **Unlocking Scenes**

#### When to Unlock
- Need to make changes to a locked scene
- Want to update context for subsequent scenes

#### Unlock Process
1. Click **"Unlock Scene"** on a locked scene
2. Confirm the action in the dialog
3. Scene status changes to **Edited**
4. **All later scenes** automatically become **NeedsRegen**
5. Later scenes are disabled until the unlocked scene is re-locked

#### Impact of Unlocking
- Scene N unlocked → Scenes N+1, N+2, etc. become **NeedsRegen**
- Later scenes must be regenerated to maintain consistency
- Context from unlocked scenes is no longer used for next scene generation

## UI Components

### Scene List (Left Panel)
- Shows all scenes with status badges
- Disabled scenes have grayed appearance
- Click to select accessible scenes
- Tooltips explain why scenes are disabled

### Scene Workspace (Right Panel)
- **Lock Scene**: Available when scene has detail and is not locked
- **Unlock Scene**: Available when scene is locked
- **Generate Next**: Only visible when current scene is locked
- **Generate Detail**: Available for draft scenes
- **Re-generate**: Available for existing scenes

## Server Validation

### Defense-in-Depth
The server enforces the same rules as the UI:

- **Scene Generation**: Cannot generate Scene N without Scene N-1 being locked
- **Context Merging**: Only locked scenes contribute context to next scene
- **Status Updates**: Proper status transitions with version tracking

### API Endpoints
- `POST /api/scene/lock` - Lock a scene
- `POST /api/scene/unlock` - Unlock a scene and mark later scenes as NeedsRegen
- `POST /api/generate_detail` - Generate scene detail (with lock validation)

## Best Practices

### 1. **Sequential Development**
- Always lock scenes before moving to the next
- Don't skip scenes or jump ahead
- Use the visual indicators to understand current state

### 2. **Context Management**
- Lock scenes when you're satisfied with the content
- Only unlock when you need to make changes
- Be aware that unlocking affects all later scenes

### 3. **Quality Control**
- Review scene content before locking
- Use the "Generate Next" button to maintain context continuity
- Regenerate scenes marked as "NeedsRegen" after unlocking previous scenes

## Troubleshooting

### Scene Not Accessible
- **Problem**: Scene appears grayed out
- **Solution**: Lock the previous scene first

### Generate Next Not Available
- **Problem**: "Generate Next" button is disabled
- **Solution**: Lock the current scene first

### Context Not Updating
- **Problem**: Next scene doesn't reflect changes from previous scenes
- **Solution**: Ensure previous scenes are locked, not just edited

### Scene Shows "NeedsRegen"
- **Problem**: Scene status shows "NeedsRegen"
- **Solution**: Regenerate the scene after locking previous scenes

## Example Workflow

```
1. Generate Scene 1 detail → Status: Generated
2. Edit Scene 1 → Status: Edited
3. Lock Scene 1 → Status: Locked
4. Generate Next → Scene 2 becomes accessible
5. Generate Scene 2 detail → Status: Generated
6. Lock Scene 2 → Status: Locked
7. Generate Next → Scene 3 becomes accessible
8. (Later) Unlock Scene 1 → Scene 2,3 become NeedsRegen
9. Lock Scene 1 again → Scene 2,3 still need regeneration
10. Regenerate Scene 2 → Status: Generated
11. Lock Scene 2 → Scene 3 becomes accessible again
```

This workflow ensures story continuity and prevents context inconsistencies while providing flexibility for iterative improvements.
