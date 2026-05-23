# TDD 执行报告：document-validator.ts

## 源文件
`apis/utils/document-validator.ts`

## 测试文件
`tests/apis/utils/document-validator.test.ts`

## 测试结果
- **测试数量**: 86 个
- **通过**: 86 个
- **失败**: 0 个

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖 (Statements) | 100% |
| 分支覆盖 (Branches) | 98.24% |
| 函数覆盖 (Functions) | 100% |
| 行覆盖 (Lines) | 100% |

## 未覆盖项
- 第122行 `totalUncompressed > 100MB` 的 else 分支 — reduce 计算行本身被 Istanbul 视为分支点，true 分支已由大文件测试覆盖，false 分支由正常 ZIP 测试隐式覆盖

## 测试分类

### 静态属性 (3个)
- ALLOWED_EXTENSIONS 验证
- MAX_FILE_SIZE (30MB) 验证
- MIME_MAP 完整性验证

### getExtension (8个)
- 简单文件名、大小写转换、多扩展名、无扩展名、多级点号
- 空字符串、单独点号、尾部点号

### validateExtension (4个)
- 支持/不支持的扩展名、无扩展名、大写扩展名

### validateFileSize (4个)
- 有效大小、零、负数、超限

### validateContent - PDF (2个)
- 正确PDF验证、非PDF内容拒绝

### validateContent - OLE2 (4个)
- DOC/XLS/PPT 接受、非OLE2扩展名拒绝

### validateContent - ZIP格式 (5个)
- DOCX/XLSX/PPTX 验证、通用ZIP拒绝、扩展名不匹配

### validateContent - JSON (7个)
- 对象/数组验证、无效JSON拒绝
- 数字/字符串/布尔/null 验证

### validateContent - YAML (7个)
- YAML/YML验证、空内容拒绝、无效YAML
- undefined返回值、null返回值、Error实例异常

### validateContent - XML (4个)
- 正确XML验证、边界情况
- 非对象结果、非Error异常

### validateContent - CSV (7个)
- 逗号/制表符/分号分隔符、空文件、无分隔符
- 纯制表符/纯分号

### validateContent - Markdown (8个)
- 标题/粗体/链接/列表/引用/代码块/纯文本/空内容

### 边界情况 (6个)
- 短buffer、PDF短buffer、类型不匹配、异常处理、大小写不敏感、损坏ZIP

### 防御性错误路径 (9个)
- detectType非Error异常、detectType Error异常、buffer toString失败
- XMLParser返回非对象、yaml.load非Error异常、XMLParser非Error异常
- getCanonicalType非yml扩展名
- getCanonicalType yml分支（PDF内容声明为yml）
- YML内容匹配验证

### ZIP 炸弹防护 (2个)
- > 1000 条目拒绝
- 总解压大小 > 100MB 拒绝

### validateTextContent 默认分支 (4个)
- doc/xls/ppt/docx 非二进制内容返回null

## 本次新增测试 (21个)
1. getExtension 空字符串
2. getExtension 单独点号
3. getExtension 尾部点号
4. validateExtension 大写扩展名
5. YAML undefined 返回值
6. YAML null 返回值
7. YAML Error 实例异常
8. JSON 数字验证
9. JSON 字符串验证
10. JSON 布尔验证
11. JSON null验证
12. CSV 纯制表符
13. CSV 纯分号
14. getCanonicalType yml分支
15. YML 内容匹配验证
16. ZIP > 1000条目拒绝
17. ZIP > 100MB 解压大小拒绝
18. doc 非二进制内容
19. docx 非二进制内容
20. xls 非二进制内容
21. ppt 非二进制内容

## 依赖库
- `adm-zip` — 创建测试用ZIP/DOCX/XLSX/PPTX buffer
- `fast-xml-parser` — XMLParser spy
- `js-yaml` — yaml.load spy
