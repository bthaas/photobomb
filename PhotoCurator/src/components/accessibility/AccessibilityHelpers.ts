import { AccessibilityInfo } from 'react-native';

export const AccessibilityHelpers = {
  // Announce messages to screen readers
  announce: (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  },

  // Generate descriptive labels for photos
  generatePhotoLabel: (photo: any, index?: number): string => {
    let label = index !== undefined ? `Photo ${index + 1}` : 'Photo';
    
    if (photo.metadata?.timestamp) {
      const date = new Date(photo.metadata.timestamp);
      label += `, taken on ${date.toLocaleDateString()}`;
    }
    
    if (photo.faces?.length > 0) {
      const count = photo.faces.length;
      label += `, contains ${count} ${count === 1 ? 'person' : 'people'}`;
    }
    
    if (photo.qualityScore?.overall) {
      const quality = photo.qualityScore.overall > 0.8 ? 'high quality' :
                     photo.qualityScore.overall > 0.6 ? 'medium quality' : 'low quality';
      label += `, ${quality}`;
    }
    
    return label;
  },

  // Generate hints for interactive elements
  generateActionHint: (actions: string[]): string => {
    return actions.join('. ');
  },

  // Format numbers for accessibility
  formatNumber: (num: number, unit?: string): string => {
    const formatted = num.toLocaleString();
    return unit ? `${formatted} ${unit}` : formatted;
  },

  // Format duration for accessibility
  formatDuration: (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return remainingSeconds > 0 
        ? `${minutes} minutes and ${remainingSeconds} seconds`
        : `${minutes} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0
        ? `${hours} hours and ${minutes} minutes`
        : `${hours} hours`;
    }
  },

  // Generate progress announcements
  announceProgress: (current: number, total: number, operation: string) => {
    const percentage = Math.round((current / total) * 100);
    const message = `${operation} ${percentage}% complete. ${current} of ${total} items processed.`;
    AccessibilityHelpers.announce(message);
  },

  // Generate cluster descriptions
  generateClusterLabel: (cluster: any): string => {
    let label = `Photo cluster with ${cluster.photos?.length || 0} photos`;
    
    if (cluster.label) {
      label = `${cluster.label} cluster with ${cluster.photos?.length || 0} photos`;
    }
    
    if (cluster.timeRange) {
      const start = new Date(cluster.timeRange.start).toLocaleDateString();
      const end = new Date(cluster.timeRange.end).toLocaleDateString();
      label += `, from ${start} to ${end}`;
    }
    
    return label;
  },

  // Generate curation result descriptions
  generateCurationResultLabel: (result: any): string => {
    const score = Math.round((result.score || 0) * 100);
    let label = `Curated photo with ${score}% quality score`;
    
    if (result.reasons?.length > 0) {
      label += `. Selected because: ${result.reasons.join(', ')}`;
    }
    
    return label;
  },

  // Check if accessibility features are enabled
  checkAccessibilityFeatures: async () => {
    const [
      isScreenReaderEnabled,
      isReduceMotionEnabled,
      isReduceTransparencyEnabled
    ] = await Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isReduceTransparencyEnabled?.() || Promise.resolve(false)
    ]);

    return {
      isScreenReaderEnabled,
      isReduceMotionEnabled,
      isReduceTransparencyEnabled
    };
  }
};