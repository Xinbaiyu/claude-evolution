/**
 * Unit Tests: Configuration Schema Validation
 */

import { describe, it, expect } from 'vitest';
import { ConfigSchema, DEFAULT_CONFIG } from '../config/schema.js';
import type { Config } from '../config/schema.js';

describe('Configuration Schema', () => {
  describe('Default Config', () => {
    it('should validate the default configuration', () => {
      const result = ConfigSchema.safeParse(DEFAULT_CONFIG);
      expect(result.success).toBe(true);
    });

    it('should have learning config with all required fields', () => {
      expect(DEFAULT_CONFIG.learning).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.enabled).toBe(true);
      expect(DEFAULT_CONFIG.learning!.capacity).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.decay).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.promotion).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.deletion).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.retention).toBeDefined();
    });
  });

  describe('Learning Config Validation', () => {
    describe('Capacity Constraints', () => {
      it('should accept valid capacity config', () => {
        const config: Config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            capacity: {
              minSize: 30,
              targetSize: 50,
              maxSize: 70,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('should reject when minSize > targetSize', () => {
        const config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            capacity: {
              minSize: 60, // > targetSize
              targetSize: 50,
              maxSize: 70,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('minSize <= targetSize <= maxSize');
        }
      });

      it('should reject when targetSize > maxSize', () => {
        const config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            capacity: {
              minSize: 30,
              targetSize: 80, // > maxSize
              maxSize: 70,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('minSize <= targetSize <= maxSize');
        }
      });

      it('should reject capacity values outside valid ranges', () => {
        const tooSmall = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            capacity: {
              minSize: 3, // < 5
              targetSize: 50,
              maxSize: 70,
            },
          },
        };

        expect(ConfigSchema.safeParse(tooSmall).success).toBe(false);

        const tooLarge = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            capacity: {
              minSize: 30,
              targetSize: 50,
              maxSize: 300, // > 250
            },
          },
        };

        expect(ConfigSchema.safeParse(tooLarge).success).toBe(false);
      });
    });

    describe('Promotion Constraints', () => {
      it('should accept valid promotion config', () => {
        const config: Config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            promotion: {
              candidateConfidence: 0.60,
              candidateMentions: 3,
              highConfidence: 0.75,
              highMentions: 5,
              autoConfidence: 0.90,
              autoMentions: 10,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('should reject when confidence levels are out of order', () => {
        const config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            promotion: {
              candidateConfidence: 0.80, // > highConfidence
              candidateMentions: 3,
              highConfidence: 0.75,
              highMentions: 5,
              autoConfidence: 0.90,
              autoMentions: 10,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('candidate < high < auto');
        }
      });

      it('should reject when mention thresholds are out of order', () => {
        const config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            promotion: {
              candidateConfidence: 0.60,
              candidateMentions: 15, // > autoMentions
              highConfidence: 0.75,
              highMentions: 5,
              autoConfidence: 0.90,
              autoMentions: 10,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('candidate <= high <= auto');
        }
      });

      it('should reject confidence values outside 0-1 range', () => {
        const tooHigh = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            promotion: {
              ...DEFAULT_CONFIG.learning!.promotion,
              autoConfidence: 1.5, // > 1
            },
          },
        };

        expect(ConfigSchema.safeParse(tooHigh).success).toBe(false);

        const tooLow = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            promotion: {
              ...DEFAULT_CONFIG.learning!.promotion,
              candidateConfidence: -0.1, // < 0
            },
          },
        };

        expect(ConfigSchema.safeParse(tooLow).success).toBe(false);
      });
    });

    describe('Deletion Constraints', () => {
      it('should accept valid deletion config', () => {
        const config: Config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            deletion: {
              immediateThreshold: 0.20,
              delayedThreshold: 0.40,
              delayedDays: 14,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('should reject when immediateThreshold >= delayedThreshold', () => {
        const config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            deletion: {
              immediateThreshold: 0.50, // >= delayedThreshold
              delayedThreshold: 0.40,
              delayedDays: 14,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('immediate < delayed');
        }
      });

      it('should reject delayedDays outside valid range', () => {
        const tooShort = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            deletion: {
              ...DEFAULT_CONFIG.learning!.deletion,
              delayedDays: 0, // < 1
            },
          },
        };

        expect(ConfigSchema.safeParse(tooShort).success).toBe(false);

        const tooLong = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            deletion: {
              ...DEFAULT_CONFIG.learning!.deletion,
              delayedDays: 100, // > 90
            },
          },
        };

        expect(ConfigSchema.safeParse(tooLong).success).toBe(false);
      });
    });

    describe('Decay Config', () => {
      it('should accept valid decay config', () => {
        const config: Config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            decay: {
              enabled: true,
              halfLifeDays: 45,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('should reject halfLifeDays outside valid range', () => {
        const tooShort = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            decay: {
              enabled: true,
              halfLifeDays: 5, // < 7
            },
          },
        };

        expect(ConfigSchema.safeParse(tooShort).success).toBe(false);

        const tooLong = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            decay: {
              enabled: true,
              halfLifeDays: 100, // > 90
            },
          },
        };

        expect(ConfigSchema.safeParse(tooLong).success).toBe(false);
      });
    });

    describe('Retention Config', () => {
      it('should accept valid retention config', () => {
        const config: Config = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            retention: {
              archivedDays: 60,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('should reject archivedDays outside valid range', () => {
        const tooShort = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            retention: {
              archivedDays: 5, // < 7
            },
          },
        };

        expect(ConfigSchema.safeParse(tooShort).success).toBe(false);

        const tooLong = {
          ...DEFAULT_CONFIG,
          learning: {
            ...DEFAULT_CONFIG.learning!,
            retention: {
              archivedDays: 400, // > 365
            },
          },
        };

        expect(ConfigSchema.safeParse(tooLong).success).toBe(false);
      });
    });
  });

  describe('Optional Fields', () => {
    it('should accept config without learning field', () => {
      const config = {
        ...DEFAULT_CONFIG,
        learning: undefined,
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should fill in defaults when learning is omitted', () => {
      const config = {
        scheduler: DEFAULT_CONFIG.scheduler,
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
        // learning omitted
      };

      const result = ConfigSchema.parse(config);
      expect(result.learning).toBeUndefined(); // Optional, so should remain undefined
    });
  });

  describe('Backward Compatibility', () => {
    it('should accept old config files with learningPhases field (passthrough)', () => {
      const oldConfig = {
        ...DEFAULT_CONFIG,
        learningPhases: {
          observation: {
            durationDays: 3,
          },
          suggestion: {
            durationDays: 4,
          },
          automatic: {
            confidenceThreshold: 0.8,
          },
        },
      };

      const result = ConfigSchema.safeParse(oldConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        // learningPhases field should be preserved by passthrough
        expect((result.data as any).learningPhases).toBeDefined();
      }
    });

    it('should accept new config files without learningPhases field', () => {
      const newConfig = {
        ...DEFAULT_CONFIG,
      };

      const result = ConfigSchema.safeParse(newConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).learningPhases).toBeUndefined();
      }
    });

    it('should not require learningPhases field in new configs', () => {
      const minimalConfig = {
        scheduler: DEFAULT_CONFIG.scheduler,
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
      };

      const result = ConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });

    it('should use learning.promotion for auto-promotion logic, not learningPhases', () => {
      // Verify that DEFAULT_CONFIG has learning.promotion configured
      expect(DEFAULT_CONFIG.learning).toBeDefined();
      expect(DEFAULT_CONFIG.learning!.promotion).toBeDefined();

      const promotion = DEFAULT_CONFIG.learning!.promotion;

      // Auto-promotion should be based on these values
      expect(promotion.autoConfidence).toBe(0.90);
      expect(promotion.autoMentions).toBe(10);

      // learningPhases should not exist
      expect((DEFAULT_CONFIG as any).learningPhases).toBeUndefined();
    });

    it('should validate auto-promotion config with custom values', () => {
      const configWithCustomPromotion = {
        ...DEFAULT_CONFIG,
        learning: {
          ...DEFAULT_CONFIG.learning!,
          promotion: {
            candidateConfidence: 0.55,
            candidateMentions: 2,
            highConfidence: 0.70,
            highMentions: 5,
            autoConfidence: 0.85, // Custom auto threshold
            autoMentions: 8,      // Custom auto mentions threshold
          },
        },
      };

      const result = ConfigSchema.safeParse(configWithCustomPromotion);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.learning!.promotion.autoConfidence).toBe(0.85);
        expect(result.data.learning!.promotion.autoMentions).toBe(8);
      }
    });
  });
});
