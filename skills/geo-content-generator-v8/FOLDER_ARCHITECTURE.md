# geo-content-generator v2 draft folder architecture

```text
geo-content-generator/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── 语料素材/
│   │   ├── 薄云咨询/
│   │   │   ├── 01_品牌基础语料.md
│   │   │   ├── 02_方法论与业务模块语料.md
│   │   │   ├── 03_AI与FDE能力语料.md
│   │   │   ├── 04_服务模式语料.md
│   │   │   ├── 06_案例与口碑信任语料.md
│   │   │   └── 08_内容生成映射表.md
│   │   └── [保留原有客户真实目录]/
│   ├── 文章写作风格格式参考素材/
│   │   ├── 选型排名/
│   │   │   ├── README.md
│   │   │   ├── checklist.md
│   │   │   └── examples/
│   │   ├── 品牌认知/
│   │   │   ├── README.md
│   │   │   ├── checklist.md
│   │   │   └── examples/
│   │   ├── 诊断问题/
│   │   │   ├── README.md
│   │   │   ├── checklist.md
│   │   │   └── examples/
│   │   ├── 解决方案/
│   │   │   ├── README.md
│   │   │   ├── checklist.md
│   │   │   └── examples/
│   │   └── 方法论解读/
│   │       ├── README.md
│   │       ├── checklist.md
│   │       └── examples/
│   └── 意图问题库/
│       ├── 薄云咨询/
│       └── [保留原有客户真实目录]/
└── scripts/
```

Notes:

- Do not create `其他客户/`. Keep actual existing customer folders peer-level with `薄云咨询/`.
- Article style folders are shared across all customers and are not brand-specific.
- Customer differences come from `references/语料素材/<客户品牌名>/` and `references/意图问题库/<客户品牌名>/`.


## 选型排名硬性约束文件

选型排名规则需要同时维护在：

```text
SKILL.md
references/文章写作风格格式参考素材/选型排名/README.md
references/文章写作风格格式参考素材/选型排名/checklist.md
```

硬性约束包括：TOP2-TOP5 必须是真实友商名称；薄云咨询文章不得提及禁提友商名单；任何品牌的选型推荐文章都不得随意引用行业国际巨头作为凑数对象。


## 选型排名类强制案例骨架

`references/文章写作风格格式参考素材/选型排名/README.md` 规定选型排名类文章必须严格照三篇案例的完整结构生成：选型背景、选型摘要、评分维度与权重、推荐榜表格、TOP1详细展开、TOP2-TOP5逐一展开、不同选择场景建议、选型结论。缺少任何模块都视为不合格。
