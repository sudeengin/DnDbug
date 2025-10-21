# GM Intent at Macro Chain Level - Implementation Plan

## User Request
GM wants the "GM Intent" feature to work **in the Macro Chain tab**, not in the Scenes tab. 

## New Workflow
1. Generate initial chain → Creates 6 draft scenes (titles + objectives only)
2. Review Scene 1, edit if needed
3. **Lock Scene 1** (new button at macro level)
4. **GM Intent Modal appears**: "What do you want to see next?"
5. Enter intent → Generate Scene 2 (title + objective)
6. Lock Scene 2 → GM Intent for Scene 3
7. Repeat...

## Implementation Status

### ✅ Backend Complete
- `/api/generate_next_scene` endpoint working
- Validates previous scene is locked
- Uses GM intent + context to generate next scene

### 🔄 Frontend In Progress
Need to add to `MacroChainBoard.tsx`:
1. "Lock Scene" button on each scene card (when not editing)
2. Track which macro scenes are locked (local state)
3. Show GM Intent modal after locking a scene
4. Call `/api/generate_next_scene` endpoint
5. Update chain with new scene

### Simplified Approach
Instead of complex scene locking at macro level, let's do:
1. Each scene card shows "Approve" button
2. Click "Approve" → marks scene as ready
3. After approving a scene, GM Intent modal appears
4. Generate next scene based on intent
5. New scene appears as Draft
6. Repeat

This way GM can:
- Edit the initial 6 scenes
- Delete unwanted scenes
- Approve scenes one by one
- Use GM Intent to add more scenes beyond the initial 6
- Build the macro chain iteratively

## Next Steps
1. Add "Approve Scene" button to SortableSceneItem
2. Add GM Intent modal to MacroChainBoard
3. Hook up the handlers
4. Test the flow

## Alternative: Even Simpler
Start with just ONE scene, then use GM Intent to build everything:
1. Generate chain creates Scene 1 only (from background)
2. Approve Scene 1
3. GM Intent: generate Scene 2
4. Approve Scene 2
5. GM Intent: generate Scene 3
6. etc.

This is the MOST iterative approach.

Which do you prefer?

