import React from 'react';
import { render, screen, fireEvent } from '../../utils';
import '@testing-library/jest-dom';
import TabNav, { TabIcons } from '@/components/TabNav';

const mockTabs = [
  { id: 'tab1', label: 'Tab 1', icon: TabIcons.Snap },
  { id: 'tab2', label: 'Tab 2', icon: TabIcons.Annotate },
  { id: 'tab3', label: 'Tab 3', icon: TabIcons.Record },
];

describe('TabNav Component', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it('renders all tabs', () => {
    render(
      <TabNav tabs={mockTabs} activeTab='tab1' onTabChange={mockOnTabChange} />
    );

    mockTabs.forEach((tab) => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('shows active tab correctly', () => {
    render(
      <TabNav tabs={mockTabs} activeTab='tab2' onTabChange={mockOnTabChange} />
    );

    const activeTab = screen.getByRole('button', { name: /tab 2/i });
    expect(activeTab).toHaveClass('active');
  });

  it('calls onTabChange when clicking a tab', () => {
    render(
      <TabNav tabs={mockTabs} activeTab='tab1' onTabChange={mockOnTabChange} />
    );

    const tab2 = screen.getByRole('button', { name: /tab 2/i });
    fireEvent.click(tab2);

    expect(mockOnTabChange).toHaveBeenCalledWith('tab2');
  });

  it('renders tab icons', () => {
    render(
      <TabNav tabs={mockTabs} activeTab='tab1' onTabChange={mockOnTabChange} />
    );

    const tabs = screen.getAllByRole('button');
    tabs.forEach((tab) => {
      expect(tab.querySelector('svg')).toBeInTheDocument();
    });
  });
});
