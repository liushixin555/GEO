# TDD 执行报告：document-validator.ts

## 源文件
`apis/utils/document-validator.ts`

## 测试文件
`tests/apis/utils/document-validator.test.ts`

## 测试结果
- **测试数量**: 65 个
- **通过**: 65 个
- **失败**: 0 个

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖 (Statements) | 98.97% |
| 分支覆盖 (Branches) | 98.18% |
| 函数覆盖 (Functions) | 100% |
| 行覆盖 (Lines) | 100% |

## 未覆盖项
- 第99行 `getCanonicalType` 的 `if (ext === 'yml')` 分支 — 私有方法，仅在类型不匹配时内部调用，属于防御性代码

## 测试分类

### 静态属性 (3个)
- ALLOWED_EXTENSIONS 验证
- MAX_FILE_SIZE (30MB) 验证
- MIME_MAP 完整性验证

### getExtension (5个)
- 简单文件名、大小写转换、多扩展名、无扩展名、多级点号

### validateExtension (3个)
- 支持/不支持的扩展名、无扩展名

### validateFileSize (4个)
- 有效大小、零、负数、超限

### validateContent - PDF (2个)
- 正确PDF验证、非PDF内容拒绝

### validateContent - OLE2 (4个)
- DOC/XLS/PPT 接受、非OLE2扩展名拒绝

### validateContent - ZIP格式 (5个)
- DOCX/XLSX/PPTX 验证、通用ZIP拒绝、扩展名不匹配

### validateContent - JSON (3个)
- 对象/数组验证、无效JSON拒绝

### validateContent - YAML (5个)
- YAML/YML验证、空内容拒绝、无效YAML

### validateContent - XML (2个)
- 正确XML验证、边界情况

### validateContent - CSV (5个)
- 逗号/制表符/分号分隔符、空文件、无分隔符

### validateContent - Markdown (8个)
- 标题/粗体/链接/列表/引用/代码块/纯文本/空内容

### 边界情况 (6个)
- 短buffer、PDF短buffer、类型不匹配、异常处理、大小写不敏感、损坏ZIP

### 防御性错误路径 (7个)
- detectType非Error异常、detectType Error异常、buffer toString失败
- XMLParser返回非对象、yaml.load非Error异常、XMLParser非Error异常
- getCanonicalType非yml扩展名

## 依赖库
- `adm-zip` — 创建测试用ZIP/DOCX/XLSX/PPTX buffer
- `fast-xml-parser` — XMLParser spy
- `js-yaml` — yaml.load spy
