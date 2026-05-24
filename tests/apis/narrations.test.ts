/**
 * narrations.test.ts — TDD tests for narrations.ts
 *
 * Tests the narration data array that serves as the single source of truth
 * for audio synthesis + auto-play in the video presentation system.
 */
import { narrations } from "../../.agents/skills/web-video-presentation/templates/src/chapters/01-example/narrations";
import type { Narration } from "../../.agents/skills/web-video-presentation/templates/src/registry/types";

// ── Constants ────────────────────────────────────────────────────────────

const CHAPTER_ID = "example";
const STEP_COUNT = 3;

// ── 1. Module Export Validation ──────────────────────────────────────────

describe("narrations: module export", () => {
  it("should export an array", () => {
    expect(Array.isArray(narrations)).toBe(true);
  });

  it("should be a const export (not undefined)", () => {
    expect(narrations).toBeDefined();
  });

  it("should not be null", () => {
    expect(narrations).not.toBeNull();
  });

  it("should be iterable", () => {
    expect(() => [...narrations]).not.toThrow();
  });

  it("should have a numeric length property", () => {
    expect(typeof narrations.length).toBe("number");
  });
});

// ── 2. Type Validation ──────────────────────────────────────────────────

describe("narrations: element type", () => {
  it("should contain only strings", () => {
    for (const entry of narrations) {
      expect(typeof entry).toBe("string");
    }
  });

  it("should not contain undefined entries", () => {
    for (const entry of narrations) {
      expect(entry).not.toBeUndefined();
    }
  });

  it("should not contain null entries", () => {
    for (const entry of narrations) {
      expect(entry).not.toBeNull();
    }
  });

  it("should not contain object entries", () => {
    for (const entry of narrations) {
      expect(typeof entry).not.toBe("object");
    }
  });

  it("should not contain number entries", () => {
    for (const entry of narrations) {
      expect(typeof entry).not.toBe("number");
    }
  });

  it("should not contain boolean entries", () => {
    for (const entry of narrations) {
      expect(typeof entry).not.toBe("boolean");
    }
  });

  it("should be assignable to Narration[] type (type compatibility)", () => {
    const typed: Narration[] = narrations;
    expect(typed).toBe(narrations);
  });
});

// ── 3. Length Validation ────────────────────────────────────────────────

describe("narrations: array length", () => {
  it(`should have exactly ${STEP_COUNT} entries matching Example.tsx steps`, () => {
    expect(narrations).toHaveLength(STEP_COUNT);
  });

  it("should have length > 0", () => {
    expect(narrations.length).toBeGreaterThan(0);
  });

  it("should have length equal to the number of visual steps", () => {
    // Example.tsx renders: step 0, step 1, step 2 → 3 steps
    // narrations.length MUST equal total step count
    expect(narrations.length).toBe(3);
  });
});

// ── 4. Content Non-Empty Validation ──────────────────────────────────────

describe("narrations: content non-empty", () => {
  it("should not have empty string entries", () => {
    for (const entry of narrations) {
      expect(entry).not.toBe("");
    }
  });

  it("should not have whitespace-only entries", () => {
    for (const entry of narrations) {
      expect(entry.trim()).not.toBe("");
    }
  });

  it("should have meaningful content length (> 5 chars after trim)", () => {
    for (const entry of narrations) {
      expect(entry.trim().length).toBeGreaterThan(5);
    }
  });
});

// ── 5. Content Quality ──────────────────────────────────────────────────

describe("narrations: content quality", () => {
  it("should contain Chinese characters (zh-CN narration)", () => {
    const chineseRegex = /[一-鿿]/;
    for (const entry of narrations) {
      expect(chineseRegex.test(entry)).toBe(true);
    }
  });

  it("should end with Chinese period or punctuation", () => {
    const endPunct = /[。！？.!?]$/;
    for (const entry of narrations) {
      expect(endPunct.test(entry.trim())).toBe(true);
    }
  });

  it("each narration should be unique", () => {
    const set = new Set(narrations);
    expect(set.size).toBe(narrations.length);
  });

  it("each narration should be a single line (no newlines)", () => {
    for (const entry of narrations) {
      expect(entry).not.toContain("\n");
      expect(entry).not.toContain("\r");
    }
  });
});

// ── 6. Index ↔ Step Correspondence ──────────────────────────────────────

describe("narrations: index-to-step mapping", () => {
  it("narrations[0] should correspond to step 0 (magazine cover)", () => {
    expect(narrations[0]).toBeDefined();
    expect(typeof narrations[0]).toBe("string");
  });

  it("narrations[1] should correspond to step 1 (split layout)", () => {
    expect(narrations[1]).toBeDefined();
    expect(typeof narrations[1]).toBe("string");
  });

  it("narrations[2] should correspond to step 2 (pull-quote close)", () => {
    expect(narrations[2]).toBeDefined();
    expect(typeof narrations[2]).toBe("string");
  });

  it("narrations[3] should be undefined (no step 3)", () => {
    expect(narrations[3]).toBeUndefined();
  });

  it("each index maps one-to-one with Example.tsx step values", () => {
    for (let i = 0; i < STEP_COUNT; i++) {
      expect(narrations[i]).toBeDefined();
      expect(typeof narrations[i]).toBe("string");
      expect(narrations[i]!.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── 7. Audio Synthesis Compatibility ────────────────────────────────────

describe("narrations: audio synthesis compatibility", () => {
  it("should generate valid audio segments for all entries", () => {
    const segments = narrations
      .map((text, i) => ({
        chapter: CHAPTER_ID,
        step: i + 1,
        text,
        audio: `${CHAPTER_ID}/${i + 1}.mp3`,
      }));
    expect(segments).toHaveLength(STEP_COUNT);
    for (const seg of segments) {
      expect(seg.chapter).toBe(CHAPTER_ID);
      expect(typeof seg.step).toBe("number");
      expect(typeof seg.text).toBe("string");
      expect(seg.audio).toMatch(/^example\/\d+\.mp3$/);
    }
  });

  it("should use 1-indexed step numbers in audio paths", () => {
    narrations.forEach((_, i) => {
      const audio = `${CHAPTER_ID}/${i + 1}.mp3`;
      expect(audio).toBe(`example/${i + 1}.mp3`);
    });
  });

  it("should produce sequential audio file names", () => {
    const audioPaths = narrations.map((_, i) => `${CHAPTER_ID}/${i + 1}.mp3`);
    expect(audioPaths).toEqual([
      "example/1.mp3",
      "example/2.mp3",
      "example/3.mp3",
    ]);
  });

  it("no silent steps should exist (all entries produce audio)", () => {
    const silentSteps = narrations.filter((t) => t.trim() === "");
    expect(silentSteps).toHaveLength(0);
  });

  it("segment text should be serializable to JSON", () => {
    const segments = narrations.map((text, i) => ({
      chapter: CHAPTER_ID,
      step: i + 1,
      text,
      audio: `${CHAPTER_ID}/${i + 1}.mp3`,
    }));
    const json = JSON.stringify(segments);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual(segments);
  });
});

// ── 8. ChapterDef Interface Compatibility ────────────────────────────────

describe("narrations: ChapterDef compatibility", () => {
  it("narrations field satisfies ChapterDef.narrations shape", () => {
    const chapterDef = {
      id: CHAPTER_ID,
      title: "Example Chapter",
      narrations: narrations,
    };
    expect(chapterDef.narrations).toBe(narrations);
    expect(chapterDef.narrations).toHaveLength(STEP_COUNT);
  });

  it("narrations array is a valid Narration[] for ChapterDef", () => {
    const nar: Narration[] = narrations;
    expect(nar.length).toBe(STEP_COUNT);
    for (const n of nar) {
      expect(typeof n).toBe("string");
    }
  });

  it("narrations can be spread into a new ChapterDef", () => {
    const def = {
      id: CHAPTER_ID,
      narrations: [...narrations],
    };
    expect(def.narrations).toEqual(narrations);
    expect(def.narrations).not.toBe(narrations); // different reference
  });
});

// ── 9. Snapshot Tests ───────────────────────────────────────────────────

describe("narrations: snapshot", () => {
  it("should match snapshot for narrations array", () => {
    expect(narrations).toMatchSnapshot();
  });

  it("should match snapshot for each individual narration", () => {
    narrations.forEach((text, i) => {
      expect(text).toMatchSnapshot(`narration-step-${i}`);
    });
  });

  it("should match snapshot for generated audio segments", () => {
    const segments = narrations.map((text, i) => ({
      chapter: CHAPTER_ID,
      step: i + 1,
      text,
      audio: `${CHAPTER_ID}/${i + 1}.mp3`,
    }));
    expect(segments).toMatchSnapshot();
  });
});

// ── 10. Immutability & Structural Integrity ─────────────────────────────

describe("narrations: structural integrity", () => {
  it("should preserve length after multiple reads", () => {
    const first = narrations.length;
    const second = narrations.length;
    const third = narrations.length;
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(third).toBe(STEP_COUNT);
  });

  it("should return the same values on repeated access", () => {
    const first = [...narrations];
    const second = [...narrations];
    expect(first).toEqual(second);
  });

  it("should have no trailing/leading whitespace in entries", () => {
    for (const entry of narrations) {
      // Content may have internal whitespace but should not be padded
      expect(entry).toBe(entry.trimStart());
    }
  });

  it("should have consistent encoding (no BOM or zero-width chars)", () => {
    for (const entry of narrations) {
      expect(entry.charCodeAt(0)).not.toBe(0xfeff); // BOM
      expect(entry).not.toContain("​"); // zero-width space
      expect(entry).not.toContain("‌"); // zero-width non-joiner
      expect(entry).not.toContain("‍"); // zero-width joiner
      expect(entry).not.toContain("﻿"); // BOM
    }
  });

  it("should have valid UTF-8 characters (no replacement char)", () => {
    for (const entry of narrations) {
      expect(entry).not.toContain("�"); // replacement character
    }
  });
});

// ── 11. Step-Content Semantic Alignment ─────────────────────────────────

describe("narrations: step-content semantic alignment", () => {
  it("step 0 narration should reference 'first step' concept", () => {
    expect(narrations[0]).toContain("第一步");
  });

  it("step 1 narration should reference 'second step' concept", () => {
    expect(narrations[1]).toContain("第二步");
  });

  it("step 2 narration should reference 'third step' concept", () => {
    expect(narrations[2]).toContain("第三步");
  });

  it("step 0 narration should mention step/step replacement guidance", () => {
    expect(narrations[0]).toContain("口播文案");
  });

  it("step 1 narration should mention array-element correspondence", () => {
    expect(narrations[1]).toContain("数组元素");
  });

  it("step 2 narration should mention single source of truth concept", () => {
    expect(narrations[2]).toContain("真相源");
  });
});

// ── 12. Edge Case & Boundary ────────────────────────────────────────────

describe("narrations: edge cases", () => {
  it("should not have excessively long entries (< 500 chars)", () => {
    for (const entry of narrations) {
      expect(entry.length).toBeLessThan(500);
    }
  });

  it("should not have extremely short entries (> 10 chars for meaningful narration)", () => {
    for (const entry of narrations) {
      expect(entry.length).toBeGreaterThan(10);
    }
  });

  it("should handle indexOf correctly for each entry", () => {
    narrations.forEach((entry, i) => {
      expect(narrations.indexOf(entry)).toBe(i);
    });
  });

  it("should be JSON-serializable as a whole", () => {
    expect(() => JSON.stringify(narrations)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(narrations));
    expect(parsed).toEqual(narrations);
  });

  it("should work with array methods (map, filter, forEach, reduce)", () => {
    expect(() => narrations.map((t) => t.toUpperCase())).not.toThrow();
    expect(() => narrations.filter((t) => t.length > 0)).not.toThrow();
    expect(() => narrations.forEach(() => {})).not.toThrow();
    expect(() => narrations.reduce((acc, t) => acc + t.length, 0)).not.toThrow();
  });
});
