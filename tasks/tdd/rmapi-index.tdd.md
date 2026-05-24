# TDD 执行报告：apis/utils/rmapi.utils/index.ts

## 概要
- **测试文件**: `tests/apis/utils/rmapi.utils/index.test.ts`
- **被测文件**: `apis/utils/rmapi.utils/index.ts`
- **测试日期**: 2026-05-25
- **用例数量**: 25
- **覆盖率**: Stmts 100% | Branch 100% | Funcs 100% | Lines 100%

## 测试分组

### 1. function exports（5 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should export getRmToken as a function | 验证 getRmToken 是函数 |
| 2 | should export getRmResources as a function | 验证 getRmResources 是函数 |
| 3 | should export getAllRmResources as a function | 验证 getAllRmResources 是函数 |
| 4 | should export submitRmOrder as a function | 验证 submitRmOrder 是函数 |
| 5 | should export exactly 4 functions | 验证仅导出 4 个函数，无遗漏无多余 |

### 2. re-export identity（4 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should re-export getRmToken from auth.util | 验证与源模块同一引用 |
| 2 | should re-export getRmResources from resource.util | 验证与源模块同一引用 |
| 3 | should re-export getAllRmResources from resource.util | 验证与源模块同一引用 |
| 4 | should re-export submitRmOrder from order.util | 验证与源模块同一引用 |

### 3. type exports（8 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should make RmAuthParams usable as a type | TypeScript 类型导出在运行时为 undefined |
| 2 | should make RmAuthResponse usable as a type | 同上 |
| 3 | should make RmResourceParams usable as a type | 同上 |
| 4 | should make RmResourceResponse usable as a type | 同上 |
| 5 | should make RmResourceItem usable as a type | 同上 |
| 6 | should make RmResourcePagination usable as a type | 同上 |
| 7 | should make RmOrderParams usable as a type | 同上 |
| 8 | should make RmOrderResponse usable as a type | 同上 |

### 4. no side effects（3 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should not have default export | 验证无 default 导出 |
| 2 | should not export __esModule flag as own property | 验证无非函数自有属性 |
| 3 | should be safe to import multiple times without errors | 验证多次导入安全 |

### 5. import paths（2 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should be importable from parent directory | 验证目录级导入可用 |
| 2 | should resolve index.ts when importing directory | 验证目录导入与显式 index 导入一致 |

### 6. export completeness（3 用例）
| # | 用例 | 说明 |
|---|------|------|
| 1 | should not export functions from debug-getRmResources | 验证调试脚本不泄露 |
| 2 | should not export RMAPI_BASE constant | 验证内部常量不泄露 |
| 3 | should cover all 3 source modules | 验证覆盖所有 3 个子模块 |

## 覆盖率报告
```
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
index.ts  |     100 |      100 |     100 |     100 |
```
