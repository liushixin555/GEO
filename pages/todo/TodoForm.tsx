import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Select, App } from 'antd';
import apiClient from '../lib/apiClient';

interface TodoFormProps {
  visible: boolean;
  todo: {
    id: number;
    title: string;
    object_type: string;
    object_id: number | null;
    action: string;
    priority: string;
    company_id: number;
    project_id: number | null;
  } | null;
  onClose: (refresh?: boolean) => void;
}

interface OptionItem {
  id: number;
  name: string;
}

interface AssigneeItem {
  id: number;
  username: string;
  cn_name: string;
  role: string;
}

const OBJECT_TYPE_OPTIONS = [
  { value: 'keyword', label: '关键词' },
  { value: 'article', label: '文章' },
];

const ACTION_OPTIONS = [
  { value: 'add', label: '增' },
  { value: 'delete', label: '删' },
  { value: 'update', label: '改' },
  { value: 'restore', label: '误删恢复' },
];

const DUE_LABEL_OPTIONS = [
  { value: '2h', label: '2h内' },
  { value: '4h', label: '4h内' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'day_after', label: '后天' },
  { value: 'this_week', label: '本周' },
  { value: 'this_month', label: '本月' },
];

const ACTION_LABEL: Record<string, string> = {
  add: '新增',
  delete: '删除',
  update: '修改',
  restore: '恢复',
};

const OBJECT_TYPE_LABEL: Record<string, string> = {
  keyword: '关键词',
  article: '文章',
};

function computeDueAt(label: string): string {
  const now = new Date();
  const chinaOffset = 8 * 60 * 60 * 1000;
  const chinaNow = new Date(now.getTime() + chinaOffset + now.getTimezoneOffset() * 60 * 1000);

  const endOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  };

  switch (label) {
    case '2h': {
      const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return d.toISOString();
    }
    case '4h': {
      const d = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      return d.toISOString();
    }
    case 'today':
      return endOfDay(chinaNow).toISOString();
    case 'tomorrow': {
      const d = new Date(chinaNow);
      d.setDate(d.getDate() + 1);
      return endOfDay(d).toISOString();
    }
    case 'day_after': {
      const d = new Date(chinaNow);
      d.setDate(d.getDate() + 2);
      return endOfDay(d).toISOString();
    }
    case 'this_week': {
      const day = chinaNow.getDay();
      const daysToSun = day === 0 ? 0 : 7 - day;
      const d = new Date(chinaNow);
      d.setDate(d.getDate() + daysToSun);
      return endOfDay(d).toISOString();
    }
    case 'this_month': {
      const d = new Date(chinaNow.getFullYear(), chinaNow.getMonth() + 1, 0, 23, 59, 59, 999);
      return d.toISOString();
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

function generateTitle(action: string, objectType: string, objectName?: string): string {
  const act = ACTION_LABEL[action] || action;
  const obj = OBJECT_TYPE_LABEL[objectType] || objectType;
  if (action === 'add' || !objectName) {
    return `${act}${obj}`;
  }
  return `${act}${obj}: ${objectName}`;
}

const TodoForm: React.FC<TodoFormProps> = ({ visible, todo, onClose }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<OptionItem[]>([]);
  const [projects, setProjects] = useState<OptionItem[]>([]);
  const [objectOptions, setObjectOptions] = useState<OptionItem[]>([]);
  const [assignees, setAssignees] = useState<AssigneeItem[]>([]);

  const isEdit = !!todo;

  // Load companies on open
  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    setObjectOptions([]);
    setAssignees([]);
    if (todo) {
      form.setFieldsValue({
        company_id: todo.company_id,
        project_id: todo.project_id,
        object_type: todo.object_type,
        object_id: todo.object_id,
        action: todo.action,
        priority: todo.priority,
      });
    }
    loadCompanies();
  }, [visible]);

  const loadCompanies = async () => {
    try {
      const res = await apiClient.get('/auth/companies');
      const list = res.data.data || [];
      setCompanies(list.map((c: any) => ({ id: c.id, name: c.short_name || c.full_name })));
      if (todo?.company_id) {
        const projList = await loadProjects(todo.company_id);
        if (todo.project_id) {
          await Promise.all([
            loadObjectOptions(todo.project_id, todo.object_type, todo.action),
            loadAssignees(todo.project_id),
          ]);
        }
      }
    } catch {
      setCompanies([]);
    }
  };

  const loadProjects = async (companyId: number) => {
    try {
      const res = await apiClient.get('/auth/projects', {
        params: { company_id: companyId },
      });
      const list = res.data.data || [];
      setProjects(list.map((p: any) => ({ id: p.id, name: p.short_name || p.full_name })));
      return list;
    } catch {
      setProjects([]);
      return [];
    }
  };

  const loadObjectOptions = useCallback(async (projectId: number, objectType: string, action: string) => {
    if (action === 'add' || !projectId || !objectType) {
      setObjectOptions([]);
      return;
    }
    try {
      const res = await apiClient.get('/todos/object-options', {
        params: { projectId, objectType, action },
      });
      setObjectOptions(res.data.data || []);
    } catch {
      setObjectOptions([]);
    }
  }, []);

  const loadAssignees = async (projectId: number) => {
    try {
      const res = await apiClient.get('/todos/assignee-candidates', {
        params: { projectId },
      });
      setAssignees(res.data.data || []);
    } catch {
      setAssignees([]);
    }
  };

  const handleCompanyChange = (companyId: number) => {
    form.setFieldsValue({ project_id: undefined, object_id: undefined, assignee_id: undefined });
    setProjects([]);
    setObjectOptions([]);
    setAssignees([]);
    if (companyId) loadProjects(companyId);
  };

  const handleProjectChange = (projectId: number) => {
    form.setFieldsValue({ object_id: undefined, assignee_id: undefined });
    setObjectOptions([]);
    setAssignees([]);
    if (projectId) {
      const objectType = form.getFieldValue('object_type');
      const action = form.getFieldValue('action');
      loadObjectOptions(projectId, objectType, action);
      loadAssignees(projectId);
    }
  };

  const handleObjectActionChange = () => {
    form.setFieldsValue({ object_id: undefined });
    setObjectOptions([]);
    const projectId = form.getFieldValue('project_id');
    const objectType = form.getFieldValue('object_type');
    const action = form.getFieldValue('action');
    if (projectId) loadObjectOptions(projectId, objectType, action);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      // Find selected object name for title
      const selectedObj = objectOptions.find(o => o.id === values.object_id);
      const title = generateTitle(values.action, values.object_type, selectedObj?.name);

      if (isEdit) {
        await apiClient.put(`/todos/${todo!.id}`, {
          title,
          object_type: values.object_type,
          object_id: values.object_id || null,
          action: values.action,
          priority: values.priority,
          due_at: computeDueAt(values.due_label),
        });
        message.success('待办更新成功');
      } else {
        await apiClient.post('/todos', {
          title,
          company_id: values.company_id,
          project_id: values.project_id || null,
          object_type: values.object_type,
          object_id: values.object_id || null,
          action: values.action,
          priority: values.priority || 'P2',
          assignee_id: values.assignee_id,
          due_at: computeDueAt(values.due_label),
        });
        message.success('待办创建成功');
      }

      onClose(true);
    } catch (err: any) {
      if (err.response?.data?.message) {
        message.error(err.response.data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentAction = Form.useWatch('action', form);
  const requireObjectId = currentAction && currentAction !== 'add';

  return (
    <Modal
      title={isEdit ? '编辑待办' : '新建待办'}
      open={visible}
      onOk={handleSubmit}
      onCancel={() => onClose()}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      confirmLoading={loading}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="公司" name="company_id" rules={[{ required: true, message: '请选择公司' }]}>
          <Select
            placeholder="选择公司"
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            onChange={handleCompanyChange}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item label="项目" name="project_id" rules={[{ required: true, message: '请选择项目' }]}>
          <Select
            placeholder="选择项目"
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            onChange={handleProjectChange}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item label="业务对象" name="object_type" rules={[{ required: true, message: '请选择业务对象' }]}>
          <Select
            placeholder="选择业务对象"
            options={OBJECT_TYPE_OPTIONS}
            onChange={handleObjectActionChange}
          />
        </Form.Item>

        <Form.Item label="动作" name="action" rules={[{ required: true, message: '请选择动作' }]}>
          <Select
            placeholder="选择动作"
            options={ACTION_OPTIONS}
            onChange={handleObjectActionChange}
          />
        </Form.Item>

        {requireObjectId && (
          <Form.Item label="操作对象" name="object_id" rules={[{ required: true, message: '请选择操作对象' }]}>
            <Select
              placeholder="选择操作对象"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={objectOptions.map(o => ({ value: o.id, label: o.name }))}
              notFoundContent="暂无可选对象"
            />
          </Form.Item>
        )}

        {!isEdit && (
          <Form.Item label="责任人" name="assignee_id" rules={[{ required: true, message: '请选择责任人' }]}>
            <Select
              placeholder="选择责任人"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={assignees.map(a => ({ value: a.id, label: a.username }))}
            />
          </Form.Item>
        )}

        <Form.Item label="优先级" name="priority" initialValue="P2">
          <Select
            placeholder="选择优先级"
            options={[
              { value: 'P0', label: 'P0 紧急' },
              { value: 'P1', label: 'P1 高' },
              { value: 'P2', label: 'P2 中' },
              { value: 'P3', label: 'P3 低' },
              { value: 'P4', label: 'P4 最低' },
            ]}
          />
        </Form.Item>

        <Form.Item label="完成时间" name="due_label" rules={[{ required: true, message: '请选择完成时间' }]}>
          <Select placeholder="选择完成时间" options={DUE_LABEL_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TodoForm;
