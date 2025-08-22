# UI Remodeling Plan for SnapContext Extension

## Overview

This plan outlines the steps needed to implement the new modern UI design for the SnapContext extension. The new design features a clean, professional look with improved navigation, better visual hierarchy, and enhanced user interaction elements.

## Reference Files

These files contain example HTML and screenshots of what the final result should look like for the UI. Use these to style the new UI:
/.cursor/assets/\*

## Task Breakdown

### 1. Theme and Global Styles

- [ ] Create new theme variables in `src/styles/theme.css`
  - Colors (primary blue #0277C0, text colors, backgrounds)
  - Typography (font families, sizes, weights)
  - Spacing and layout constants
  - Shadow styles
  - Border radius values
- [ ] Update global styles for consistent base styling
- [ ] Implement CSS reset/normalize styles

### 2. Component Updates

#### Header Component

- [ ] Create new Header component
  - Logo with SVG icon
  - Status indicator
  - Responsive layout
- [ ] Style header with border and proper spacing
- [ ] Implement status indicator animation

#### Tab Navigation

- [ ] Create new TabNav component
  - Tab buttons with icons
  - Active state handling
  - Smooth transitions
- [ ] Implement SVG icons for each tab
- [ ] Add tab switching logic
- [ ] Style tab navigation with proper spacing and transitions

#### Settings Components

- [ ] Update MarkerColorPicker component
  - New color options
  - Improved selection UI
  - Checkmark indicator for selected color
- [ ] Create new SettingGroup component
  - Label
  - Description
  - Content area
- [ ] Create new Toggle component
  - Sliding animation
  - Active state styling
- [ ] Create new Select component
  - Custom styling
  - Dropdown appearance
- [ ] Create new StatCard component
  - Number display
  - Label styling
  - Grid layout

#### Action Buttons

- [ ] Create new Button component variants
  - Primary button
  - Secondary button
  - Hover and active states
- [ ] Implement action buttons container
  - Fixed positioning
  - Proper spacing
  - Background blur effect

### 3. Layout and Structure

- [ ] Update popup dimensions (340x480)
- [ ] Implement main container structure
- [ ] Add proper padding and spacing
- [ ] Ensure scrollable content area
- [ ] Fix header and action buttons positioning

### 4. Functionality

- [ ] Implement tab switching logic
- [ ] Add color picker selection handling
- [ ] Add toggle state management
- [ ] Implement settings persistence
- [ ] Add voice test functionality
- [ ] Ensure proper form handling

### 5. Responsive Behavior

- [ ] Test popup at different sizes
- [ ] Ensure proper scrolling behavior
- [ ] Verify touch interactions
- [ ] Test button and input interactions

### 6. Cross-browser Testing

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Edge
- [ ] Verify proper rendering
- [ ] Check animations and transitions

### 7. Optimization

- [ ] Optimize SVG icons
- [ ] Minimize CSS
- [ ] Ensure proper asset loading
- [ ] Verify performance metrics

### 8. Documentation

- [ ] Update component documentation
- [ ] Document new theme variables
- [ ] Add usage examples
- [ ] Update README with new UI information

## Implementation Notes

- Use CSS modules for component styling
- Maintain accessibility standards
- Follow BEM naming convention
- Ensure proper TypeScript typing
- Keep bundle size optimized
- Maintain proper commenting

## Dependencies

- React for components
- CSS Modules for styling
- TypeScript for type safety
- SVG icons from design system
