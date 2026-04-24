/**
 * Tests for lower thirds type definitions and utilities
 * Written using READ-FIRST methodology - all tests based on actual code in lowerThirdsTypes.ts
 */
import { describe, it, expect } from 'vitest';
import type {
  LowerThirdTemplate,
  LowerThird,
  QueuedLowerThird,
  LowerThirdsState,
  OBSTextSourceSettings,
} from './lowerThirdsTypes';
import { DEFAULT_TEMPLATES, hexToABGR, abgrToHex } from './lowerThirdsTypes';

describe('lowerThirdsTypes', () => {
  describe('LowerThirdTemplate interface', () => {
    it('should create a valid template with all required properties', () => {
      const template: LowerThirdTemplate = {
        id: 'custom-template',
        name: 'Custom',
        description: 'Custom template description',
        style: {
          fontSize: 24,
          fontFamily: 'Arial',
          fontWeight: '600',
          textColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 80,
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
      };

      expect(template.id).toBe('custom-template');
      expect(template.name).toBe('Custom');
      expect(template.description).toBe('Custom template description');
      expect(template.style.fontSize).toBe(24);
      expect(template.style.position).toBe('bottom-left');
      expect(template.animation.fadeIn).toBe(400);
    });

    it('should allow optional description', () => {
      const template: LowerThirdTemplate = {
        id: 'minimal-template',
        name: 'Minimal',
        // description is optional
        style: {
          fontSize: 20,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          textColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 90,
          padding: 12,
          borderRadius: 4,
          position: 'bottom-center',
          offsetX: 0,
          offsetY: 60,
        },
        animation: {
          fadeIn: 300,
          fadeOut: 300,
        },
      };

      expect(template.description).toBeUndefined();
    });
  });

  describe('LowerThird interface', () => {
    it('should create a valid lower third with required properties', () => {
      const now = new Date();
      const lowerThird: LowerThird = {
        id: 'lt-1',
        templateId: 'default-modern',
        primaryText: '@username',
        secondaryText: 'Gaming Creator',
        autoHideDuration: 5000,
        createdAt: now, // createdAt is Date type
      };

      expect(lowerThird.id).toBe('lt-1');
      expect(lowerThird.templateId).toBe('default-modern');
      expect(lowerThird.primaryText).toBe('@username');
      expect(lowerThird.secondaryText).toBe('Gaming Creator');
      expect(lowerThird.autoHideDuration).toBe(5000);
      expect(lowerThird.createdAt).toBe(now);
      expect(lowerThird.lastShown).toBeUndefined(); // lastShown is optional
    });

    it('should allow optional properties to be undefined', () => {
      const lowerThird: LowerThird = {
        id: 'lt-2',
        templateId: 'default-bold',
        primaryText: 'Main Text',
        createdAt: new Date(),
        // secondaryText, autoHideDuration, lastShown are all optional
      };

      expect(lowerThird.secondaryText).toBeUndefined();
      expect(lowerThird.autoHideDuration).toBeUndefined();
      expect(lowerThird.lastShown).toBeUndefined();
    });

    it('should allow lastShown to be a Date', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000);
      const lowerThird: LowerThird = {
        id: 'lt-3',
        templateId: 'default-minimal',
        primaryText: 'Text',
        createdAt: earlier,
        lastShown: now, // lastShown is optional Date
      };

      expect(lowerThird.lastShown).toBe(now);
    });
  });

  describe('QueuedLowerThird interface', () => {
    it('should combine lower third with template', () => {
      const template: LowerThirdTemplate = {
        id: 'template-1',
        name: 'Template',
        style: {
          fontSize: 20,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          textColor: '#FFF',
          backgroundColor: '#000',
          backgroundOpacity: 90,
          padding: 12,
          borderRadius: 4,
          position: 'bottom-left',
          offsetX: 40,
          offsetY: 80,
        },
        animation: {
          fadeIn: 300,
          fadeOut: 300,
        },
      };

      const lowerThird: LowerThird = {
        id: 'lt-1',
        templateId: 'template-1',
        primaryText: 'Text',
        createdAt: new Date(),
      };

      const queued: QueuedLowerThird = {
        lowerThird,
        template,
        showDuration: 8000,
      };

      expect(queued.lowerThird.id).toBe('lt-1');
      expect(queued.template.id).toBe('template-1');
      expect(queued.showDuration).toBe(8000);
    });
  });

  describe('LowerThirdsState interface', () => {
    it('should create a valid state object', () => {
      const state: LowerThirdsState = {
        activeItem: null, // activeItem can be null
        queue: [],
        isShowing: false,
        autoRotateEnabled: true,
        rotateInterval: 8000,
      };

      expect(state.activeItem).toBeNull(); // Verified: activeItem can be null
      expect(state.queue).toEqual([]);
      expect(state.isShowing).toBe(false);
      expect(state.autoRotateEnabled).toBe(true);
      expect(state.rotateInterval).toBe(8000);
    });

    it('should allow activeItem to be a QueuedLowerThird', () => {
      const template: LowerThirdTemplate = {
        id: 't1',
        name: 'Template',
        style: {
          fontSize: 20,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          textColor: '#FFF',
          backgroundColor: '#000',
          backgroundOpacity: 90,
          padding: 12,
          borderRadius: 4,
          position: 'bottom-left',
          offsetX: 40,
          offsetY: 80,
        },
        animation: { fadeIn: 300, fadeOut: 300 },
      };

      const queued: QueuedLowerThird = {
        lowerThird: {
          id: 'lt1',
          templateId: 't1',
          primaryText: 'Text',
          createdAt: new Date(),
        },
        template,
        showDuration: 5000,
      };

      const state: LowerThirdsState = {
        activeItem: queued, // activeItem can be QueuedLowerThird
        queue: [],
        isShowing: true,
        autoRotateEnabled: false,
        rotateInterval: 10000,
      };

      expect(state.activeItem).toBe(queued);
      expect(state.isShowing).toBe(true);
    });
  });

  describe('OBSTextSourceSettings interface', () => {
    it('should create valid OBS text source settings', () => {
      const settings: OBSTextSourceSettings = {
        sourceName: 'LowerThird',
        text: 'Display Text',
        fontSize: 24,
        fontFamily: 'Inter',
        fontWeight: 600, // fontWeight is NUMBER, not string
        color: 0xffffffff, // ABGR format
        backgroundColor: 0xff000000, // ABGR format
        opacity: 90,
        visible: true,
      };

      expect(settings.sourceName).toBe('LowerThird');
      expect(settings.text).toBe('Display Text');
      expect(settings.fontWeight).toBe(600); // Verified: fontWeight is number
      expect(typeof settings.fontWeight).toBe('number');
      expect(settings.color).toBe(0xffffffff);
      expect(settings.visible).toBe(true);
    });
  });

  describe('DEFAULT_TEMPLATES constant', () => {
    it('should export exactly 4 default templates', () => {
      // Verified by reading code: DEFAULT_TEMPLATES has 4 templates
      expect(DEFAULT_TEMPLATES).toHaveLength(4);
    });

    it('should have correct template IDs', () => {
      const templateIds = DEFAULT_TEMPLATES.map((t) => t.id);
      expect(templateIds).toEqual([
        'default-modern',
        'default-bold',
        'default-minimal',
        'default-social',
      ]);
    });

    it('should have all required properties for each template', () => {
      DEFAULT_TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.style).toBeDefined();
        expect(template.animation).toBeDefined();

        // Verify style properties
        expect(template.style.fontSize).toBeGreaterThan(0);
        expect(template.style.fontFamily).toBe('Inter');
        expect(template.style.textColor).toMatch(/^#[0-9A-F]{6}$/i);
        expect(template.style.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i);
        expect(template.style.backgroundOpacity).toBeGreaterThanOrEqual(0);
        expect(template.style.backgroundOpacity).toBeLessThanOrEqual(100);

        // Verify animation properties
        expect(template.animation.fadeIn).toBeGreaterThan(0);
        expect(template.animation.fadeOut).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs', () => {
      const ids = DEFAULT_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(DEFAULT_TEMPLATES.length);
    });
  });

  describe('hexToABGR function', () => {
    it('should convert hex color to ABGR format with default opacity', () => {
      // Verified: function has default parameter opacity = 100
      const abgr = hexToABGR('#FFFFFF'); // No opacity param = uses default 100
      // #FFFFFF with 100% opacity: JavaScript bitwise returns SIGNED int32
      // 0xFFFFFFFF as signed = -1
      expect(abgr).toBe(-1);
    });

    it('should convert hex color to ABGR format with custom opacity', () => {
      const abgr = hexToABGR('#FFFFFF', 50); // 50% opacity
      // Alpha = 50% of 255 = 127.5 rounded = 128 = 0x80
      // ABGR: (0x80 << 24) | (0xFF << 16) | (0xFF << 8) | 0xFF
      // 0x80FFFFFF as signed int32 = -2130706433
      expect(abgr).toBe(-2130706433);
    });

    it('should handle black color', () => {
      const abgr = hexToABGR('#000000', 100);
      // #000000 with 100% opacity: 0xFF000000 as signed int32 = -16777216
      expect(abgr).toBe(-16777216);
    });

    it('should handle blue color', () => {
      const abgr = hexToABGR('#0000FF', 100);
      // #0000FF with 100% opacity
      // R=0, G=0, B=255, A=255
      // ABGR: (255 << 24) | (255 << 16) | (0 << 8) | 0
      // 0xFFFF0000 as signed int32 = -65536
      expect(abgr).toBe(-65536);
    });
  });

  describe('abgrToHex function', () => {
    it('should convert ABGR to hex color with opacity', () => {
      // Verified: function returns object with { hex: string, opacity: number }
      const result = abgrToHex(0xffffffff);
      expect(result).toHaveProperty('hex');
      expect(result).toHaveProperty('opacity');
      expect(result.hex).toBe('#FFFFFF');
      expect(result.opacity).toBe(100);
    });

    it('should convert ABGR with partial opacity', () => {
      const result = abgrToHex(0x80ffffff);
      expect(result.hex).toBe('#FFFFFF');
      // Alpha 0x80 = 128, opacity = (128 / 255) * 100 ≈ 50
      expect(result.opacity).toBeGreaterThanOrEqual(49);
      expect(result.opacity).toBeLessThanOrEqual(51);
    });

    it('should convert black color', () => {
      const result = abgrToHex(0xff000000);
      expect(result.hex).toBe('#000000');
      expect(result.opacity).toBe(100);
    });

    it('should convert blue color', () => {
      const result = abgrToHex(0xffff0000);
      // ABGR 0xFFFF0000: A=255, B=255, G=0, R=0 = #0000FF
      expect(result.hex).toBe('#0000FF');
      expect(result.opacity).toBe(100);
    });
  });

  describe('color conversion roundtrip', () => {
    it('should convert hex to ABGR and back', () => {
      const originalHex = '#3B82F6';
      const originalOpacity = 85;

      const abgr = hexToABGR(originalHex, originalOpacity);
      const { hex, opacity } = abgrToHex(abgr);

      expect(hex).toBe(originalHex.toUpperCase());
      // Opacity might have slight rounding differences
      expect(opacity).toBeGreaterThanOrEqual(originalOpacity - 1);
      expect(opacity).toBeLessThanOrEqual(originalOpacity + 1);
    });
  });
});
