/**
 * Lower Thirds - Type definitions for text overlay system
 */

/**
 * Lower third template
 */
export interface LowerThirdTemplate {
  id: string;
  name: string;
  description?: string;
  style: {
    fontSize: number;          // Font size in pixels
    fontFamily: string;        // Font family name
    fontWeight: 'normal' | 'bold' | '600' | '700' | '800';
    textColor: string;         // Hex color for text
    backgroundColor: string;   // Hex color for background
    backgroundOpacity: number; // 0-100 opacity percentage
    padding: number;           // Padding in pixels
    borderRadius: number;      // Border radius in pixels
    position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';
    offsetX: number;           // X offset in pixels
    offsetY: number;           // Y offset in pixels
  };
  animation: {
    fadeIn: number;            // Fade in duration in ms
    fadeOut: number;           // Fade out duration in ms
  };
}

/**
 * Lower third instance
 */
export interface LowerThird {
  id: string;
  templateId: string;
  primaryText: string;         // Main text (e.g., cohost name)
  secondaryText?: string;      // Optional secondary text (e.g., social handle)
  autoHideDuration?: number;   // Auto-hide after X milliseconds (0 = manual hide)
  createdAt: Date;
  lastShown?: Date;
}

/**
 * Lower third queue item
 */
export interface QueuedLowerThird {
  lowerThird: LowerThird;
  template: LowerThirdTemplate;
  showDuration: number;        // How long to show this item (in ms)
}

/**
 * Lower thirds state
 */
export interface LowerThirdsState {
  activeItem: QueuedLowerThird | null;
  queue: QueuedLowerThird[];
  isShowing: boolean;
  autoRotateEnabled: boolean;
  rotateInterval: number;      // Rotation interval in ms (default: 8000)
}

/**
 * OBS text source settings for lower thirds
 */
export interface OBSTextSourceSettings {
  sourceName: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: number;               // ABGR color format for OBS
  backgroundColor: number;     // ABGR color format for OBS
  opacity: number;             // 0-100
  visible: boolean;
}

/**
 * Default template presets
 */
export const DEFAULT_TEMPLATES: LowerThirdTemplate[] = [
  {
    id: 'default-modern',
    name: 'Modern',
    description: 'Clean modern design with subtle background',
    style: {
      fontSize: 24,
      fontFamily: 'Inter',
      fontWeight: '600',
      textColor: '#FFFFFF',
      backgroundColor: '#1A1D29',
      backgroundOpacity: 90,
      padding: 16,
      borderRadius: 8,
      position: 'bottom-left',
      offsetX: 40,
      offsetY: 80,
    },
    animation: {
      fadeIn: 400,
      fadeOut: 400,
    },
  },
  {
    id: 'default-bold',
    name: 'Bold',
    description: 'High-contrast bold text with strong background',
    style: {
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: '700',
      textColor: '#FFFFFF',
      backgroundColor: '#3B82F6',
      backgroundOpacity: 95,
      padding: 20,
      borderRadius: 12,
      position: 'bottom-left',
      offsetX: 40,
      offsetY: 80,
    },
    animation: {
      fadeIn: 300,
      fadeOut: 300,
    },
  },
  {
    id: 'default-minimal',
    name: 'Minimal',
    description: 'Subtle text-only design with minimal background',
    style: {
      fontSize: 20,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      textColor: '#E5E7EB',
      backgroundColor: '#0A0C14',
      backgroundOpacity: 60,
      padding: 12,
      borderRadius: 4,
      position: 'bottom-center',
      offsetX: 0,
      offsetY: 60,
    },
    animation: {
      fadeIn: 600,
      fadeOut: 600,
    },
  },
  {
    id: 'default-social',
    name: 'Social',
    description: 'Optimized for social handles and usernames',
    style: {
      fontSize: 22,
      fontFamily: 'Inter',
      fontWeight: '600',
      textColor: '#10B981',
      backgroundColor: '#064E3B',
      backgroundOpacity: 85,
      padding: 14,
      borderRadius: 6,
      position: 'bottom-right',
      offsetX: 40,
      offsetY: 80,
    },
    animation: {
      fadeIn: 400,
      fadeOut: 400,
    },
  },
];

/**
 * Convert hex color to OBS ABGR format
 */
export function hexToABGR(hex: string, opacity: number = 100): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.round((opacity / 100) * 255);
  // ABGR format: (alpha << 24) | (blue << 16) | (green << 8) | red
  return (a << 24) | (b << 16) | (g << 8) | r;
}

/**
 * Convert OBS ABGR to hex color
 */
export function abgrToHex(abgr: number): { hex: string; opacity: number } {
  const r = abgr & 0xff;
  const g = (abgr >> 8) & 0xff;
  const b = (abgr >> 16) & 0xff;
  const a = (abgr >> 24) & 0xff;
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const opacity = Math.round((a / 255) * 100);
  return { hex: hex.toUpperCase(), opacity };
}
