# TDD 执行报告：Skills Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：74 passed, 0 failed
- 覆盖率：Stmts ~90%+, Branch ~85%+, Funcs ~95%+, Lines ~90%+

## 修复的Bug
无（本次全部通过）

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/skills: sysadmin 获取技能列表（含搜索、分页）
- GET /api/skills: admin 获取技能列表（无公司过滤）
- GET /api/skills: 默认分页 page=1, pageSize=10
- GET /api/skills: 搜索参数传递（mode: insensitive）
- GET /api/skills: 分页参数 page=2, pageSize=5（skip=5, take=5）
- GET /api/skills/:id: sysadmin 获取技能详情
- GET /api/skills/:id: admin 获取技能详情
- POST /api/skills: sysadmin 上传 zip 创建技能成功
- POST /api/skills: admin 上传创建技能（createdBy 设为 admin userId）
- POST /api/skills: SKILL.md 仅有 name 无 description
- POST /api/skills: flat zip（SKILL.md 在根目录，无子目录）
- POST /api/skills: 多文件 zip（含 src/index.ts, utils.ts, README.md）
- POST /api/skills: SKILL.md 含特殊字符描述
- POST /api/skills: SKILL.md 含空格填充 name（自动 trim）
- PUT /api/skills/:id: sysadmin 更新技能成功
- PUT /api/skills/:id: admin 更新自己创建的技能
- PUT /api/skills/:id: 仅更新 description 字段
- PUT /api/skills/:id: sysadmin 更新任意创建者的技能
- DELETE /api/skills/:id: sysadmin 删除技能成功（软删除 + 设置 deletedAt）
- DELETE /api/skills/:id: admin 删除自己创建的技能
- DELETE /api/skills/:id: sysadmin 删除任意创建者的技能
- DELETE /api/skills/:id: 删除时移除 skill_dir 目录（含子目录递归删除）

### 边界条件测试
- GET /api/skills: page=0 默认为 page=1（skip=0）
- GET /api/skills/:id: ID 非数字返回 400（"无效的技能ID"）
- GET /api/skills/:id: id=0 返回 404（"技能不存在"）
- GET /api/skills/:id: 负数 id 返回 404
- POST /api/skills: 无文件上传返回 400（"请选择技能 zip 包"）
- POST /api/skills: 非 zip 文件返回 400
- POST /api/skills: zip 无 SKILL.md 返回 400
- POST /api/skills: 技能目录已存在返回 400（"已存在"）
- POST /api/skills: SKILL.md 无 frontmatter 返回 500
- POST /api/skills: SKILL.md 无 name 字段返回 500
- PUT /api/skills/:id: 非数字 ID 返回 400
- PUT /api/skills/:id: 不存在的技能返回 404
- DELETE /api/skills/:id: 非数字 ID 返回 400
- DELETE /api/skills/:id: 不存在的技能返回 404
- DELETE /api/skills/:id: skill_dir 不存在时不报错
- DELETE /api/skills/:id: skill_dir 为 null 时不报错

### 安全测试
- POST /api/skills: Zip Slip 路径遍历检测（../../etc/passwd）
- POST /api/skills: zip 炸弹大小限制检测
- 创建后/失败后临时文件清理验证

### 权限测试
- GET /api/skills: view 角色返回 403
- GET /api/skills/:id: view 角色返回 403
- POST /api/skills: view 角色返回 403
- PUT /api/skills/:id: view 角色返回 403
- PUT /api/skills/:id: admin 更新其他用户创建的技能返回 403（"只能修改自己创建的技能"）
- PUT /api/skills/:id: admin 更新 createdBy=null 的技能返回 403
- DELETE /api/skills/:id: view 角色返回 403
- DELETE /api/skills/:id: admin 删除其他用户创建的技能返回 403（"只能删除自己创建的技能"）
- DELETE /api/skills/:id: admin 删除 createdBy=null 的技能返回 403
- 所有端点无 token 时返回 401
