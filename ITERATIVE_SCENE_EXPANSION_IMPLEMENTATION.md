# Iterative Scene Expansion with GM Intent - Implementation Summary

## Overview
Implemented a new workflow that allows GMs to iteratively expand their scene chain one scene at a time using GM intent, replacing the rigid 6-scene upfront generation with a flexible "idea bank" + iterative expansion approach.

## Key Changes

### 1. **Initial Chain as Draft Idea Bank**
- **File:** `api/generate_chain.js`
- **Change:** Initial chains now marked as `status: 'Draft'` with `meta.isDraftIdeaBank: true`
- **Purpose:** These 6 scenes serve as inspiration, not a rigid plan

### 2. **New API Endpoint: Generate Next Scene**
- **File:** `api/generate_next_scene.js` (NEW)
- **Route:** `POST /api/generate_next_scene`
- **Input:**
  ```json
  {
    "sessionId": "string",
    "previousSceneId": "string",
    "gmIntent": "string"
  }
  ```
- **Behavior:**
  - Validates that previous scene is `Locked`
  - Builds effective context from all locked predecessors
  - Uses background, characters, and GM intent to generate next scene
  - Returns new scene with `status: 'Draft'`
- **Validation:** Returns 409 if previous scene not locked
- **Output:**
  ```json
  {
    "ok": true,
    "scene": { /* new MacroScene */ },
    "chain": { /* updated MacroChain */ }
  }
  ```

### 3. **New Prompt Template**
- **File:** `api/lib/prompt.js`
- **Function:** `renderNextScenePrompt()`
- **Purpose:** Creates prompts that incorporate:
  - Background context (tone, stakes, mysteries, NPCs, locations, motifs)
  - Characters (motivations, conflicts)
  - Previous scene (title, objective, sequence)
  - Effective context (merged from all locked predecessors)
  - GM intent (what the GM wants to see next)

### 4. **Type Updates**
- **File:** `src/types/macro-chain.ts`
- **Changes:**
  - `MacroScene.meta` now includes optional `gmIntent`, `generatedFrom`, `generatedAt`
  - `MacroChain.meta` now includes optional `isDraftIdeaBank`

### 5. **UI: Draft Idea Bank Helper**
- **File:** `src/components/MacroChainBoard.tsx`
- **Change:** Added blue info banner when `chain.meta.isDraftIdeaBank === true`
- **Content:** Explains that scenes are draft ideas and directs users to Scenes tab for iterative expansion

### 6. **UI: GM Intent Panel**
- **File:** `src/components/SceneWorkspace.tsx`
- **Changes:**
  - After locking a scene (if not the last), shows modal: "What do you want to see next?"
  - Textarea for GM intent input
  - "Generate Next Scene" button calls `/api/generate_next_scene`
  - On success, navigates to the newly created scene (Draft status)

### 7. **Server Configuration**
- **File:** `server.js`
- **Change:** Added route handler for `/api/generate_next_scene`
- **Change:** Updated endpoint lists in root handler and startup logs

## Workflow

### Standard Flow
1. **Generate Initial Chain** (Macro Chain tab)
   - Creates 6 draft scenes (idea bank)
   - Shows helper text about draft nature
   - GM can edit/delete/add scenes freely

2. **Lock Chain & Start Expansion** (Scenes tab)
   - Lock the macro chain
   - Generate detail for Scene 1
   - Lock Scene 1

3. **Iterative Expansion**
   - After locking Scene N:
     - GM Intent modal appears: "What do you want to see next?"
     - GM describes desired next scene
     - System generates Scene N+1 (title + objective only, status: Draft)
     - GM navigates to Scene N+1
     - Generate detail for Scene N+1
     - Lock Scene N+1
     - Repeat...

4. **Continuity Maintained**
   - Each new scene uses effectiveContext from ALL locked predecessors
   - Ensures story continuity and prevents contradictions
   - GM intent guides the direction while respecting established context

## Key Benefits

1. **Flexibility:** GMs not locked into initial 6-scene structure
2. **GM Control:** Each scene driven by explicit GM intent
3. **Continuity:** Effective context ensures coherent narrative
4. **Iterative:** Build the story scene by scene, adjusting as needed
5. **Guardrails:** Lock & Advance enforced (Scene N must be locked before creating N+1)

## Validation & Guardrails

### API Level
- `/generate_next_scene` requires previous scene to be `Locked` (409 if not)
- Builds effective context only from `Locked` scenes
- Validates GM intent is non-empty

### UI Level
- Chain must be `Locked` before accessing Scenes tab
- GM Intent modal only shows after locking current scene
- "Generate Next Scene" button disabled if GM intent is empty
- Scene navigation respects Lock & Advance rules

## Files Changed

### Backend (API)
1. `api/generate_chain.js` - Mark as Draft
2. `api/generate_next_scene.js` - NEW endpoint
3. `api/lib/prompt.js` - New prompt template
4. `server.js` - Route registration

### Frontend (UI)
1. `src/types/macro-chain.ts` - Type updates
2. `src/components/MacroChainBoard.tsx` - Draft helper text
3. `src/components/SceneWorkspace.tsx` - GM Intent panel

## Testing Checklist

- [ ] Generate initial chain → verify scenes are Draft status
- [ ] Edit/delete draft scenes → verify reindex works
- [ ] Lock chain → verify can access Scenes tab
- [ ] Generate detail for Scene 1 → verify works
- [ ] Lock Scene 1 → verify GM Intent panel appears
- [ ] Enter GM intent and generate next scene → verify Scene 2 created as Draft
- [ ] Navigate to Scene 2 → verify displays correctly
- [ ] Generate detail for Scene 2 → verify uses context from Scene 1
- [ ] Lock Scene 2 → verify GM Intent panel appears again
- [ ] Verify effectiveContext includes both Scene 1 and Scene 2 data
- [ ] Try to generate next scene without locking current → verify 409 error
- [ ] Verify sequence numbers remain contiguous

## Notes

- Initial draft scenes can still be deleted/edited (idea bank flexibility)
- Once a scene is generated via GM intent, it follows normal workflow (Draft → Generate Detail → Lock)
- The chain status remains 'Draft' until all scenes are locked (future enhancement could track this)
- GM intent is stored in scene metadata for audit purposes
- Effective context builder uses ALL locked predecessors (not just previous 2)

