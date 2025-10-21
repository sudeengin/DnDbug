# GM Intent Regeneration Feature

## New Workflow: Iterative Scene Refinement

You can now delete generated scenes and re-trigger GM Intent to generate new variations!

### Updated UI

#### For Locked Scenes:
- ✅ **"Scene Locked"** badge (green, read-only indicator)
- 🔄 **"Generate Next Scene"** button (purple, clickable)
  - Re-opens the GM Intent modal
  - Allows generating the next scene again with new intent

#### For Draft/Unlocked Scenes:
- 🔒 **"Lock Scene"** button (blue, primary action)
- 🗑️ **"Delete Scene"** button (red, secondary action)
  - Allows deleting draft scenes even outside edit mode
  - Perfect for removing scenes you don't like

### Example Usage Flow

1. **Lock Scene 1**
   - Click "Lock Scene" button
   - GM Intent modal appears

2. **Generate Scene 2**
   - Enter: "The party discovers a hidden passage..."
   - Click "Generate Next Scene"
   - Scene 2 appears

3. **Don't Like It? Delete & Retry!**
   - Click "Delete Scene" on Scene 2
   - Scene 2 is removed
   - Scene 1 is still locked

4. **Generate Again**
   - Click "Generate Next Scene" on Scene 1
   - GM Intent modal appears again
   - Enter new intent: "The party is ambushed by bandits..."
   - Generate a completely different Scene 2!

5. **Continue Building**
   - Like the new Scene 2? Lock it!
   - Generate Scene 3
   - Repeat the process infinitely

### Technical Details

**State Management:**
- Tracks which scenes are locked (`lockedMacroScenes`)
- Maintains `lastLockedScene` for GM Intent context
- Automatically updates when scenes are deleted
- Finds the highest remaining locked scene after deletion

**Delete Behavior:**
- Removes scene from chain
- Reorders remaining scenes
- Cleans up locked state
- Updates `lastLockedScene` intelligently

**Generate Next Behavior:**
- Works from any locked scene
- Opens GM Intent modal
- Uses the locked scene as context
- Generates the next scene in sequence

## Benefits

✅ **Flexibility**: Don't like a generated scene? Delete and try again!
✅ **Iteration**: Refine your story until it's perfect
✅ **No Waste**: Locked scenes stay safe, only delete what you don't want
✅ **Control**: Always generate from the last locked scene you're happy with
✅ **Infinite Building**: Keep expanding your story scene by scene

## UI Colors & Indicators

- 🟢 **Green**: Scene is locked (safe, won't change)
- 🔵 **Blue**: Lock a scene (primary action)
- 🟣 **Purple**: Generate next scene (creative action)
- 🔴 **Red**: Delete scene (destructive action)

