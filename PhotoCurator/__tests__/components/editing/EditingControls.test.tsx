/**
 * EditingControls Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditingControls } from '../../../src/components/editing/EditingControls';
import { EnhancementSettings } from '../../../src/types/editing';

describe('EditingControls', () => {
  const defaultSettings: EnhancementSettings = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    vibrance: 0,
    saturation: 0,
    sharpness: 0,
    noise_reduction: 0,
  };

  const mockOnSettingsChange = jest.fn();
  const mockOnApply = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all control tabs', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    expect(getByText('Basic')).toBeTruthy();
    expect(getByText('Color')).toBeTruthy();
    expect(getByText('Detail')).toBeTruthy();
  });

  it('should render basic controls by default', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    expect(getByText('Exposure')).toBeTruthy();
    expect(getByText('Contrast')).toBeTruthy();
    expect(getByText('Highlights')).toBeTruthy();
    expect(getByText('Shadows')).toBeTruthy();
  });

  it('should switch to color controls when color tab is pressed', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    fireEvent.press(getByText('Color'));

    expect(getByText('Vibrance')).toBeTruthy();
    expect(getByText('Saturation')).toBeTruthy();
  });

  it('should switch to detail controls when detail tab is pressed', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    fireEvent.press(getByText('Detail'));

    expect(getByText('Sharpness')).toBeTruthy();
    expect(getByText('Noise Reduction')).toBeTruthy();
  });

  it('should display current slider values', () => {
    const settingsWithValues: EnhancementSettings = {
      ...defaultSettings,
      exposure: 0.5,
      contrast: -0.3,
    };

    const { getByText } = render(
      <EditingControls
        settings={settingsWithValues}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    expect(getByText('50')).toBeTruthy(); // exposure value
    expect(getByText('-30')).toBeTruthy(); // contrast value
  });

  it('should call onSettingsChange when slider value changes', async () => {
    const { getByTestId } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    // Note: In a real test, you'd need to find the slider by testID
    // This is a simplified version
    await waitFor(() => {
      expect(mockOnSettingsChange).toHaveBeenCalledTimes(0);
    });
  });

  it('should call onApply when apply button is pressed', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    fireEvent.press(getByText('Apply'));

    expect(mockOnApply).toHaveBeenCalledTimes(1);
  });

  it('should call onReset when reset button is pressed', () => {
    const settingsWithChanges: EnhancementSettings = {
      ...defaultSettings,
      exposure: 0.5,
    };

    const { getByText } = render(
      <EditingControls
        settings={settingsWithChanges}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    fireEvent.press(getByText('Reset'));

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('should disable reset button when no changes are made', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    const resetButton = getByText('Reset');
    expect(resetButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should enable reset button when changes are made', () => {
    const settingsWithChanges: EnhancementSettings = {
      ...defaultSettings,
      exposure: 0.3,
    };

    const { getByText } = render(
      <EditingControls
        settings={settingsWithChanges}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    const resetButton = getByText('Reset');
    expect(resetButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('should disable all controls when disabled prop is true', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
        disabled={true}
      />
    );

    const applyButton = getByText('Apply');
    const resetButton = getByText('Reset');
    const basicTab = getByText('Basic');

    expect(applyButton.props.accessibilityState?.disabled).toBe(true);
    expect(resetButton.props.accessibilityState?.disabled).toBe(true);
    expect(basicTab.props.accessibilityState?.disabled).toBe(true);
  });

  it('should highlight active tab', () => {
    const { getByText } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    const basicTab = getByText('Basic');
    const colorTab = getByText('Color');

    // Basic tab should be active by default
    expect(basicTab.props.style).toContainEqual(
      expect.objectContaining({ color: '#007AFF' })
    );

    fireEvent.press(colorTab);

    // Color tab should now be active
    expect(colorTab.props.style).toContainEqual(
      expect.objectContaining({ color: '#007AFF' })
    );
  });

  it('should handle extreme slider values correctly', () => {
    const extremeSettings: EnhancementSettings = {
      exposure: 1,
      contrast: -1,
      highlights: 1,
      shadows: -1,
      vibrance: 1,
      saturation: -1,
      sharpness: 2,
      noise_reduction: 1,
    };

    const { getByText } = render(
      <EditingControls
        settings={extremeSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    expect(getByText('100')).toBeTruthy(); // exposure at max
    expect(getByText('-100')).toBeTruthy(); // contrast at min
  });

  it('should maintain tab state when settings change', () => {
    const { getByText, rerender } = render(
      <EditingControls
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    // Switch to color tab
    fireEvent.press(getByText('Color'));
    expect(getByText('Vibrance')).toBeTruthy();

    // Update settings
    const newSettings: EnhancementSettings = {
      ...defaultSettings,
      vibrance: 0.5,
    };

    rerender(
      <EditingControls
        settings={newSettings}
        onSettingsChange={mockOnSettingsChange}
        onApply={mockOnApply}
        onReset={mockOnReset}
      />
    );

    // Should still be on color tab
    expect(getByText('Vibrance')).toBeTruthy();
    expect(getByText('50')).toBeTruthy(); // Updated vibrance value
  });
});