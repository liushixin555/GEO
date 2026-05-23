# skills.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/skills.controller.test.ts
- **源文件**: apis/controller/skills.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 34 个测试
- **测试结果**: 34 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 95.79% | - |
| Branch | 79.66% | - |
| Functions | 100% | - |
| Lines | 96.22% | 133-137 |

## 测试用例清单

### GET /api/skills (7个)
1. should return 401 without token
2. should return 403 for view role
3. should return skills list for sysadmin
4. should return all skills for admin (no company filtering)
5. should support search parameter
6. should support pagination parameters
7. should return 500 on database error

### GET /api/skills/:id (4个)
1. should return 400 for invalid id
2. should return skill detail for sysadmin
3. should return 404 for non-existent skill
4. should return 500 on database error

### POST /api/skills (7个)
1. should return 400 when no file uploaded
2. should return 400 when zip has no SKILL.md
3. should create skill successfully with zip file
4. should create skill for admin and set created_by
5. should return 400 when skill directory already exists
6. should return 400 for non-zip file
7. should return 400 when SKILL.md has no frontmatter
8. should return 400 when SKILL.md has no name field

### PUT /api/skills/:id (6个)
1. should return 400 for invalid id
2. should update skill successfully for sysadmin
3. should allow admin to update their own skill
4. should reject admin updating other user skill
5. should reject admin updating skill with null created_by
6. should return 404 for non-existent skill
7. should return 500 on database error during update

### DELETE /api/skills/:id (8个)
1. should return 400 for invalid id
2. should return 404 for non-existent skill
3. should delete skill successfully for sysadmin
4. should allow admin to delete their own skill
5. should reject admin deleting other user skill
6. should reject admin deleting skill with null created_by
7. should remove skill directory when skill_dir exists
8. should return 500 on database error

## 修复的问题
1. **POST 测试修复**: 原测试发送 JSON 数据但 controller 需要 zip 文件上传。改用 `AdmZip` 创建真实 zip buffer 并通过 `attach()` 上传
2. **DELETE 测试修复**: 原测试 mock 了 `delete` 方法但 service 使用软删除（`update` + `deletedAt`）。修正 mock 使用 `update` 并让 `findFirst` 返回多次
3. **文件清理**: 添加 beforeEach/afterEach 清理 skills 目录，避免测试间相互影响
4. **新增 getSkills (GET /:id)**: 补充获取单个技能详情的测试
5. **新增 uploadSkillMiddleware 测试**: 覆盖文件上传中间件的各种场景
