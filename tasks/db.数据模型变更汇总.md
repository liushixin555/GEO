# db. 数据模型变更汇总

> 状态：✅ 全部已完成

---

## db001. User.company_id 改为可选

### 变更原因
用户不再绑定单一公司，可操作多家公司，具体权限由公司关联设置。

### Schema 变更
```prisma
// Before
companyId Int @map("company_id")
company   Company @relation(...)

// After
companyId Int? @map("company_id")
company   Company? @relation(...)
```

### 影响
- 后端：移除用户创建时的 company_id 必填校验和公司过滤
- 前端：移除用户卡片中的公司名显示和表单中的公司选择
- Entity/Map/Controller 全链路更新

---

## db002. User 新增 selected_company_id / selected_project_id

### 变更原因
支持公司/项目切换器的选择持久化。

### Schema 变更
```prisma
model User {
  // ... existing fields
  selectedCompanyId Int? @map("selected_company_id")
  selectedProjectId Int? @map("selected_project_id")
  selectedCompany   Company? @relation("UserSelectedCompany", ...)
  selectedProject   Project? @relation("UserSelectedProject", ...)
}
```

### 迁移
Prisma migrate 自动处理，新增两个可空字段。

---

## db003. Skills.company_id 改为可选

### 变更原因
技能不绑定单一公司，与用户一致。

### Schema 变更
```prisma
// Before
companyId Int @map("company_id")

// After
companyId Int? @map("company_id")
company   Company? @relation(...)
```

---

## db004. Skills 新增 created_by

### 变更原因
追踪技能创建者，实现 admin 只能修改/删除自己创建的技能。

### Schema 变更
```prisma
model Skills {
  // ... existing fields
  createdBy Int? @map("created_by")
  creator   User? @relation("SkillsCreator", fields: [createdBy], references: [id])
}

model User {
  // ... existing fields
  createdSkills Skills[] @relation("SkillsCreator")
}
```

### 完整更新链
1. `prisma/schema.prisma` — 字段 + 关系
2. `apis/entity/skills.entity.ts` — `created_by?: number | null`
3. `apis/map/index.ts` — `mapSkills()` 新增 `created_by` 映射
4. `apis/service/impl/skills.service.impl.ts` — `create()` 写入 `createdBy`
5. `apis/controller/skills.controller.ts` — 权限检查

### 迁移
`20260517025739_add_skills_created_by`

---

## db005. Project 模型

### 变更原因
新增项目管理功能。

### Schema 变更
```prisma
model Project {
  id          Int      @id @default(autoincrement())
  shortName   String   @db.VarChar(100)
  fullName    String   @db.VarChar(200)
  description String?  @db.VarChar(500)
  companyId   Int      @map("company_id")
  status      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  company    Company  @relation(fields: [companyId], references: [id])
  operators  ProjectOperator[]
  viewers    ProjectViewer[]

  @@map("projects")
}
```

---

## db006. project_operators / project_viewers 多对多关联

### 变更原因
项目支持多运营者和多查看者。

### Schema 变更
```prisma
model ProjectOperator {
  projectId Int     @map("project_id")
  userId    Int     @map("user_id")
  project   Project @relation("ProjectOperators", fields: [projectId], references: [id])
  user      User    @relation("UserProjectOperator", fields: [userId], references: [id])

  @@id([projectId, userId])
  @@map("project_operators")
}

model ProjectViewer {
  projectId Int     @map("project_id")
  userId    Int     @map("user_id")
  project   Project @relation("ProjectViewers", fields: [projectId], references: [id])
  user      User    @relation("UserProjectViewer", fields: [userId], references: [id])

  @@id([projectId, userId])
  @@map("project_viewers")
}
```

### 关键经验
- **Prisma 多对多必须命名关系**：双方都用 `@relation("关系名")`，名字必须匹配
- **更新关联表**：先 `deleteMany` 再 `create`，避免唯一约束冲突
