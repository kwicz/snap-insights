# Customer Insights Dashboard Style Guide for Lovable

## Overview

This style guide defines the visual and interaction patterns for a customer insights dashboard designed for e-commerce operators. The design emphasizes data clarity, intuitive analytics visualization, and actionable insights while maintaining an approachable and professional interface.

## Brand Personality & Voice

### Core Attributes

- **Plainspoken**: Clear communication of complex data insights without jargon
- **Genuine**: Authentic and trustworthy presentation of customer intelligence
- **Professional with personality**: Dry humor where appropriate in empty states or tooltips
- **Active voice**: Direct and actionable language for insights and recommendations
- **Data-driven**: Let numbers tell the story with clear context
- **Positive framing**: Focus on opportunities and improvements

### User Experience Goals

Users should feel:

- Confident in understanding their customer data
- Empowered to make data-driven decisions
- That insights are immediately actionable
- The dashboard anticipates their needs
- Complex data is made simple and accessible

## Color System

### Primary Colors

```css
--color-primary-blue: #0277c0;
--color-primary-dark: #1a1a1a;
```

### Secondary Colors

```css
--color-secondary-red: #f13429;
--color-secondary-orange: #fe650f;
--color-secondary-yellow: #feb82e;
--color-secondary-green: #77cd2c;
--color-secondary-purple: #6c19bd;
```

### Neutral Colors

```css
--color-light-gray: #f1efe2;
--color-white: #ffffff;
--color-black: #000000;
```

### Background Colors

```css
--color-background-primary: #ffffff;
--color-background-secondary: #f8f9fa;
--color-background-tertiary: #f1efe2;
```

### Text Colors

```css
--color-text-primary: #1a1a1a;
--color-text-secondary: #666666;
--color-text-tertiary: #999999;
--color-text-inverse: #ffffff;
```

### Color Usage Guidelines

#### Data Visualization

- **Primary Green (#35C274)**: Positive metrics, growth, success states
- **Secondary Red (#DD3A6C)**: Alerts, attention needed, negative trends
- **Plue Blue (#3BB7E1)**: Neutral data, informational elements
- **Orange (#D59964)**: Warning states, medium priority
- **Yellow (#E3C34D)**: Highlights, new features, tips

#### UI Elements

- **Primary Dark (#1A1A1A)**: Headers, primary text
- **Light Gray (#F1EFE2)**: Backgrounds, subtle separators
- **White**: Primary backgrounds, cards
- **Gray scales**: Secondary text, disabled states

## Typography

### Font Families

```css
--font-primary: 'Orelega One', Georgia, serif;
--font-secondary: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI',
  sans-serif;
--font-mono: 'Monaco', 'Courier New', monospace;
```

### Type Scale

```css
--text-xs: 0.75rem; /* 12px - Micro labels, tooltips */
--text-sm: 0.875rem; /* 14px - Secondary text, captions */
--text-base: 1rem; /* 16px - Body text */
--text-lg: 1.125rem; /* 18px - Emphasized body */
--text-xl: 1.25rem; /* 20px - Widget headers */
--text-2xl: 1.5rem; /* 24px - Section headers */
--text-3xl: 1.875rem; /* 30px - Page titles */
--text-4xl: 2.25rem; /* 36px - Dashboard titles */
--text-5xl: 3rem; /* 48px - Hero metrics */
```

### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Text Hierarchy

- **Dashboard Titles**: Orelega One, 3xl/4xl, color-primary-dark
- **Section Headers**: Hanken Grotesk, 2xl, semibold, color-primary-dark
- **Widget Headers**: Hanken Grotesk, xl, medium, color-primary-dark
- **Metric Values**: Hanken Grotesk, 2xl-5xl, bold, contextual color
- **Body Text**: Hanken Grotesk, base, normal, color-primary-dark
- **Secondary Text**: Hanken Grotesk, sm, normal, color-text-secondary
- **Labels**: Hanken Grotesk, sm, medium, color-text-secondary

## Layout & Spacing

### Spacing Scale

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

### Dashboard Grid System

```css
--dashboard-gap: var(--space-6);
--widget-min-height: 320px;
--widget-max-width: 600px;
```

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
--container-full: 100%;
```

### Responsive Grid

- Desktop: 12-column grid with flexible widget spanning
- Tablet: 8-column grid
- Mobile: Single column stack
- Gap spacing: space-6 (24px) between widgets
- Margin: space-8 (32px) from viewport edges

## Dashboard Components

### Widget Container

```css
.widget {
  background: white;
  border-radius: 12px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: var(--widget-min-height);
  transition: box-shadow 0.2s ease;
}

.widget:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.widget-title {
  font-family: var(--font-secondary);
  font-size: var(--text-xl);
  font-weight: var(--font-medium);
  color: var(--color-primary-dark);
}
```

### Metric Display

```css
.metric-value {
  font-family: var(--font-secondary);
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.metric-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-change {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.metric-change.positive {
  color: var(--color-success);
}

.metric-change.negative {
  color: var(--color-error);
}
```

### Data Visualization Components

#### Charts Common Styles

```css
.chart-container {
  position: relative;
  height: 300px;
  margin-top: var(--space-4);
}

.chart-legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  font-size: var(--text-sm);
}

.chart-tooltip {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  font-size: var(--text-sm);
}
```

## Widget-Specific Guidelines

### UMUX Score Widget

- Scatter plot with quadrant labels
- Color gradient: Red (50) → Yellow (75) → Green (100)
- Interactive tooltips showing exact coordinates
- Benchmark line clearly marked
- Axes: Utility (x-axis) vs Usability (y-axis)

### Customer Satisfaction Dial

- Semi-circular gauge
- Color segments: Red (0-40), Yellow (40-70), Green (70-100)
- Large percentage display
- Animated transitions
- Needle indicator

### Industry Benchmarking

- Horizontal bar chart
- Company bar highlighted in primary green
- Industry average line
- Hover states show exact values
- Sort options available

### Trend Charts

- Consistent axis formatting
- Grid lines at 25% intervals
- Data point markers on hover
- Legend below chart
- Time period selector

### Affinity Brands Bubble Chart

- Bubble size = mention frequency
- Bubble color = category
- Minimum bubble size for legibility
- Maximum 20 brands displayed
- Interactive hover details

## Interactive Elements

### Buttons

```css
/* Primary Action */
.btn-primary {
  background: var(--color-primary-green);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  font-weight: var(--font-medium);
  transition: all 0.15s ease;
  font-family: var(--font-secondary);
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2ba05f;
  transform: translateY(-1px);
}

/* Secondary Action */
.btn-secondary {
  background: white;
  color: var(--color-primary-green);
  border: 2px solid var(--color-primary-green);
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  font-weight: var(--font-medium);
  cursor: pointer;
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: var(--color-primary-dark);
  padding: var(--space-2) var(--space-4);
  border: none;
  cursor: pointer;
}

/* Icon Button */
.btn-icon {
  background: transparent;
  border: none;
  padding: var(--space-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Form Elements

```css
/* Input Fields */
.input {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  font-family: var(--font-secondary);
  transition: border-color 0.15s ease;
  width: 100%;
}

.input:focus {
  border-color: var(--color-primary-green);
  outline: none;
  box-shadow: 0 0 0 3px rgba(53, 194, 116, 0.1);
}

/* Select Dropdown */
.select {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-primary-dark);
  cursor: pointer;
  font-family: var(--font-secondary);
}

.select:focus {
  border-color: var(--color-primary-green);
  outline: none;
}
```

### Navigation Components

#### Top Navigation

```css
.top-nav {
  background: white;
  border-bottom: 1px solid var(--color-light-gray);
  padding: var(--space-4) var(--space-8);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  font-family: var(--font-primary);
  font-size: var(--text-2xl);
  color: var(--color-primary-green);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
```

#### Dashboard Tabs

```css
.tab-nav {
  display: flex;
  gap: var(--space-6);
  border-bottom: 2px solid var(--color-light-gray);
  margin-bottom: var(--space-8);
}

.tab {
  padding: var(--space-3) 0;
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  cursor: pointer;
}

.tab.active {
  color: var(--color-primary-green);
  border-bottom-color: var(--color-primary-green);
}

.tab:hover:not(.active) {
  color: var(--color-primary-dark);
}
```

## Icons & Imagery

### Icon System

- Use Fluent UI System Icons for consistency
- Icon sizes: 16px (small), 20px (default), 24px (large)
- Maintain 1.5px stroke width
- Match icon color to accompanying text

### Icon Usage Guidelines

- **Navigation**: Outline style, 20px
- **Actions**: Filled style for primary actions
- **Metrics**: Use directional arrows for trends (↑↓)
- **Status**: Color-coded (green check, red x, yellow warning)
- **Always** pair with text labels for clarity

### Common Icons

```
- Dashboard: grid icon
- Settings: gear icon
- Filter: funnel icon
- Export: download icon
- Help: question circle
- Info: info circle
- Success: check circle
- Error: x circle
- Warning: exclamation triangle
- Trend up: arrow up
- Trend down: arrow down
```

## Interaction Patterns

### Loading States

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Widget Loading */
.widget-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.spinner {
  border: 3px solid var(--color-light-gray);
  border-top-color: var(--color-primary-green);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Empty States

```css
.empty-state {
  text-align: center;
  padding: var(--space-12);
  color: var(--color-text-secondary);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
  opacity: 0.3;
}

.empty-state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  margin-bottom: var(--space-2);
  color: var(--color-primary-dark);
}

.empty-state-message {
  font-size: var(--text-base);
  margin-bottom: var(--space-6);
}
```

### Hover & Focus States

- Cards: Elevate shadow on hover
- Buttons: Darken by 10% and slight translate
- Links: Underline on hover
- Charts: Highlight specific data point
- All focusable elements: 3px green outline

### Transitions

```css
--transition-fast: 0.15s ease;
--transition-base: 0.2s ease;
--transition-slow: 0.3s ease;
```

## Responsive Design

### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Mobile Adaptations

```css
/* Mobile First Approach */
.dashboard-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .widget-large {
    grid-column: span 2;
  }

  .widget-full {
    grid-column: span 3;
  }
}
```

### Touch Optimization

- Minimum touch target: 44px × 44px
- Increased padding on mobile
- Bottom sheet for filters and options
- Swipeable widget carousel for space efficiency

## Accessibility

### WCAG 2.1 AA Compliance

- Minimum contrast ratio: 4.5:1 (normal text), 3:1 (large text)
- All charts must have data tables as alternatives
- Keyboard navigation for all interactions
- Screen reader announcements for data updates

### Chart Accessibility

```html
<!-- Example accessible chart -->
<div role="img" aria-label="Customer satisfaction trend showing 15% increase">
  <canvas id="satisfaction-chart"></canvas>
  <table class="sr-only">
    <caption>
      Customer satisfaction data
    </caption>
    <thead>
      <tr>
        <th>Month</th>
        <th>Satisfaction %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>January</td>
        <td>72%</td>
      </tr>
      <!-- More data rows -->
    </tbody>
  </table>
</div>
```

### Focus Management

- Logical tab order
- Focus trap in modals
- Skip links for navigation
- Clear focus indicators

## Animation Guidelines

### Entrance Animations

```css
/* Widget entrance */
.widget-enter {
  animation: fadeUp 0.3s ease-out;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Data update */
.metric-update {
  animation: pulse 0.6s ease;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

### Chart Animations

- Initial load: Animate from left to right or bottom to top
- Data updates: Smooth transitions between states
- Hover effects: Immediate response (no delay)
- Keep animations under 300ms for responsiveness

## Implementation Notes for Lovable

### Component Structure

```
/components
  /dashboard
    /widgets
      - UMUXScore.jsx
      - SatisfactionDial.jsx
      - BenchmarkChart.jsx
      - AffinityBubbles.jsx
      - TrendChart.jsx
      - MetricCard.jsx
    /layout
      - DashboardGrid.jsx
      - WidgetContainer.jsx
      - DashboardHeader.jsx
    /navigation
      - TopNav.jsx
      - TabNav.jsx
      - UserMenu.jsx
    /common
      - Button.jsx
      - Select.jsx
      - Input.jsx
      - Tooltip.jsx
      - LoadingState.jsx
      - EmptyState.jsx
  /charts
    - ScatterPlot.jsx
    - GaugeChart.jsx
    - BarChart.jsx
    - BubbleChart.jsx
    - LineChart.jsx
```

### State Management Recommendations

- Widget data should be centralized
- Loading states per widget
- Error boundaries for widget failures
- Optimistic updates for interactions
- Cache API responses appropriately

### Performance Optimization

- Lazy load chart libraries
- Virtualize long data lists
- Debounce real-time updates
- Progressive enhancement for charts
- Use React.memo for expensive components

### Chart Library Recommendations

- Chart.js for standard charts
- D3.js for complex visualizations
- Recharts for React-specific needs
- Always provide SVG output for clarity

### Data Fetching Pattern

```jsx
// Example widget data fetching
const useWidgetData = (widgetType, params) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWidgetData(widgetType, params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [widgetType, params]);

  return { data, loading, error };
};
```

### Error Handling

```jsx
// Widget error boundary
<WidgetContainer>
  <ErrorBoundary
    fallback={
      <EmptyState
        icon='error'
        title='Widget unavailable'
        message="We couldn't load this widget. Please try again."
        action={<Button onClick={retry}>Retry</Button>}
      />
    }
  >
    <UMUXScore data={data} />
  </ErrorBoundary>
</WidgetContainer>
```

### Utility Classes (Tailwind-compatible)

```css
/* Spacing */
.p-4 {
  padding: var(--space-4);
}
.m-4 {
  margin: var(--space-4);
}
.space-y-4 > * + * {
  margin-top: var(--space-4);
}

/* Text */
.text-sm {
  font-size: var(--text-sm);
}
.font-medium {
  font-weight: var(--font-medium);
}
.text-primary {
  color: var(--color-primary-green);
}

/* Layout */
.flex {
  display: flex;
}
.items-center {
  align-items: center;
}
.justify-between {
  justify-content: space-between;
}
.grid {
  display: grid;
}

/* Visual */
.rounded {
  border-radius: 8px;
}
.shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

## Testing Checklist

### Visual Testing

- [ ] All colors meet contrast requirements
- [ ] Typography hierarchy is clear
- [ ] Spacing is consistent
- [ ] Responsive breakpoints work correctly

### Interaction Testing

- [ ] All interactive elements have hover states
- [ ] Focus states are visible
- [ ] Loading states display correctly
- [ ] Empty states are helpful

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color blind safe
- [ ] Touch targets are adequate on mobile

### Performance Testing

- [ ] Initial load under 3 seconds
- [ ] Smooth animations (60fps)
- [ ] No layout shifts
- [ ] Efficient re-renders

This style guide provides a comprehensive foundation for building a consistent, accessible, and user-friendly customer insights dashboard. The visual language emphasizes clarity of data presentation while maintaining an approachable and modern interface that makes complex analytics accessible to all users.
