/**
 * Custom Jest transform that wraps ts-jest's TsJestTransformer and replaces
 * `import.meta.env.BASE_URL` with a string literal "/" so that
 * Vite-specific syntax works in Jest's CommonJS environment.
 */
const { TsJestTransformer } = require("ts-jest");

const VITE_META_RE = /import\.meta\.env\.BASE_URL/g;

const transformer = new TsJestTransformer({
  tsconfig: {
    jsx: "react-jsx",
    module: "commonjs",
    esModuleInterop: true,
    lib: ["ES2020", "DOM", "DOM.Iterable"],
  },
  diagnostics: false,
});

module.exports = {
  process(src, filePath, jestConfig) {
    const patched = src.replace(VITE_META_RE, '"/"');
    return transformer.process(patched, filePath, jestConfig);
  },
};
