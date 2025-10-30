# Theme System Documentation

## Overview

This application uses a **centralized theme system** to prevent accidental loss of styling during refactors, merges, or code updates. All theme colors, spacing, and common styling patterns are defined in a single location.

## 🎨 Theme Constants

All theme values are defined in `src/lib/theme.ts`. This file contains:

- **Background colors** - Primary, secondary, overlay, card backgrounds
- **Border colors** - Primary border color used throughout
- **Text colors** - Primary, secondary, muted, placeholder, input text
- **Component styling** - Pre-configured classes for inputs, textareas, selects, modals, cards
- **Utility classes** - Common class combinations for reuse

## 📦 Styled Components

Pre-styled components are available that automatically apply theme styling:

- `StyledInput` - Dark theme input with proper contrast
- `StyledTextarea` - Dark theme textarea with proper contrast  
- `StyledLabel` - Dark theme label with proper text color

### Usage Example

```tsx
// ❌ DON'T: Hard-coded classes (can be lost)
<Input className="rounded-[12px] bg-[#0f141b] border-[#2A3340] text-[#E0E0E0]" />

// ✅ DO: Use styled component
import { StyledInput } from '@/components/ui/styled-input';
<StyledInput placeholder="Enter name" />

// ✅ OR: Use theme constants
import { themeClasses } from '@/lib/theme';
<Input className={themeClasses.inputText} />
```

## 🔧 Modifying Theme

**When adding new styling:**

1. **Check `src/lib/theme.ts` first** - Does a similar pattern already exist?
2. **Add to theme.ts if needed** - Don't create one-off classes
3. **Use theme constants** - Reference `theme.*` or `themeClasses.*`
4. **Update this doc** - Document any new patterns

**When refactoring components:**

1. **Look for hard-coded theme classes** - Search for `bg-[#151A22]`, `border-[#2A3340]`, etc.
2. **Replace with theme constants** - Use `themeClasses.*` or styled components
3. **Test styling** - Ensure dark theme is preserved
4. **Check git diff** - Verify no theme classes were accidentally removed

## 🚨 Preventing Style Loss

### Before Committing

1. **Review git diff** - Look for removed theme classes
2. **Check for white backgrounds** - Search for `bg-white` in diffs
3. **Verify dark theme** - Quick visual check in browser
4. **Run search** - `grep -r "bg-white" src/components` to catch regressions

### Common Mistakes to Avoid

1. ❌ **Removing className props** during refactors
2. ❌ **Using default component styles** without theme
3. ❌ **Copy-pasting from other projects** with different themes
4. ❌ **Auto-formatting removing custom classes**

### Recovery Checklist

If styling is lost:

1. ✅ Check `src/lib/theme.ts` - Theme constants are preserved
2. ✅ Check git history - `git log --all --grep="theme\|dark\|styling"`
3. ✅ Use styled components - Replace raw components with styled versions
4. ✅ Reference this doc - Re-apply patterns documented here

## 📋 Component Styling Patterns

### Modal Container
```tsx
import { themeClasses } from '@/lib/theme';

<div className={themeClasses.modalOverlay}>
  <div className={themeClasses.modalContainerLarge}>
    {/* content */}
  </div>
</div>
```

### Form Input
```tsx
import { StyledInput, StyledLabel } from '@/components/ui/styled-input';

<StyledLabel htmlFor="name">Name</StyledLabel>
<StyledInput id="name" placeholder="Enter name" />
```

### Form Textarea
```tsx
import { StyledTextarea } from '@/components/ui/styled-textarea';

<StyledTextarea rows={3} placeholder="Description" />
```

### Select/Dropdown
```tsx
import { themeClasses } from '@/lib/theme';

<Select>
  <SelectTrigger className={themeClasses.selectTrigger}>
    <SelectValue />
  </SelectTrigger>
  <SelectContent className={themeClasses.selectContent}>
    {/* items */}
  </SelectContent>
</Select>
```

## 🔍 Finding Theme Issues

### Search Commands

```bash
# Find components with white backgrounds (potential issues)
grep -r "bg-white" src/components

# Find hard-coded theme colors (should use constants)
grep -r "#151A22\|#0f141b\|#2A3340" src/components

# Find components missing theme styling
grep -r "className=" src/components | grep -v "theme\|Styled"
```

### Git Commands

```bash
# Find commits that modified theme
git log --all --grep="theme\|dark\|styling" --oneline

# See what styling was removed
git log -p --all -S "bg-white" -- src/components
```

## 📝 Best Practices

1. **Always use theme constants** for colors and styling
2. **Use styled components** when available
3. **Document new patterns** in this guide
4. **Review diffs carefully** before committing
5. **Test visual appearance** after refactors
6. **Centralize custom styling** in `theme.ts`

## 🎯 Migration Guide

To migrate existing components to use the theme system:

1. **Replace hard-coded classes:**
   ```tsx
   // Before
   <Input className="rounded-[12px] bg-[#0f141b] border-[#2A3340]" />
   
   // After
   <StyledInput />  // or
   <Input className={themeClasses.inputText} />
   ```

2. **Replace modal containers:**
   ```tsx
   // Before
   <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px]">
   
   // After
   <div className={themeClasses.modalContainer}>
   ```

3. **Update labels:**
   ```tsx
   // Before
   <Label className="text-gray-300">
   
   // After
   <StyledLabel>  // or
   <Label className={themeClasses.label}>
   ```

---

**Remember:** The goal is to make styling changes **intentional and centralized**. If styling is lost, it should be easily recoverable from `theme.ts`.

