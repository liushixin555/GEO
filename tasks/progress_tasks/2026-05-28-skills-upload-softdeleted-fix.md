# fix065: 技能上传已删除同名技能报400错误

## 问题描述

上传技能时，如果数据库中存在已软删除的同名技能（且磁盘上残留同名目录），接口返回：
```json
{"code":400,"message":"技能「ant-design」已存在，请先删除同名技能"}
```

## 根因分析

原流程中，controller 先查 DB 软删除记录，再调用 `extractSkillZip(path, !!softDeleted)` 解压。当目录存在于磁盘但 DB 中无匹配的软删除记录时，`overwriteDir=false`，文件系统层在解压前抛出 BusinessError。

问题在于**活跃重复检查放在了 service.create() 内部**（解压之后），导致文件系统层先于 DB 层拦截，报错信息不符合业务预期。

## 修复方案

调整 controller 检查顺序：**先查活跃重复，再解压，最后创建/复用记录**。

1. 新增 `findActiveByName()` 方法到 service 接口和实现
2. controller 在解压前先查活跃重复 → 若存在立即返回 409
3. 解压时始终 `overwriteDir=true`（已确认无活跃重复，安全覆盖）
4. service.create() 移除冗余的活跃重复检查

## 修改文件

| 文件 | 变更 |
|------|------|
| `apis/service/skills.service.ts` | 新增 `findActiveByName` 接口方法 |
| `apis/service/impl/skills.service.impl.ts` | 实现 `findActiveByName`；`create` 移除活跃重复检查 |
| `apis/controller/skills.controller.ts` | `createSkills` 先查活跃重复再解压，解压始终允许覆盖 |
