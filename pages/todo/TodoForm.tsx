import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, App } from 'antd';
import axios from 'axios';

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
  } | null;
  onClose: (refresh?: boolean) => void;
}

interface UserItem {
  id: number;
  username: string;
  cn_name: string;
  role: string;
}

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 紧急' },
  { value: 'P1', label: 'P1 高' },
  { value: 'P2', label: 'P2 中' },
  { value: 'P3', label: 'P3 低' },
  { value: 'P4', label: 'P4 最低' },
];

const TodoForm: React.FC<TodoFormProps> = ({ visible, todo, onClose }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);

  const isEdit = !!todo;

  useEffect(() => {
    if (visible) {
      if (todo) {
        form.setFieldsValue({
          title: todo.title,
          priority: todo.priority,
          object_type: todo.object_type,
          object_id: todo.object_id,
          action: todo.action,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ priority: 'P2' });
      }
      // Load users for assignee selection
      fetchUsers();
    }
  }, [visible, todo]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: { pageSize: 200 },
      });
      setUsers(res.data.data.list);
    } catch {
      setUsers([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (isEdit) {
        await axios.put(`/api/todos/${todo!.id}`, {
          title: values.title,
          priority: values.priority,
          object_type: values.object_type,
          object_id: values.object_id || null,
          action: values.action,
        }, { headers: { Authorization: `Bearer ${token}` } });
        message.success('待办更新成功');
      } else {
        await axios.post('/api/todos', {
          title: values.title,
          priority: values.priority || 'P2',
          object_type: values.object_type,
          object_id: values.object_id || null,
          action: values.action,
          company_id: user.company_id || values.company_id,
          assignee_id: values.assignee_id,
        }, { headers: { Authorization: `Bearer ${token}` } });
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

  return (
    <Modal
      title={isEdit ? '编辑待办' : '新建待办'}
      open={visible}
      onOk={handleSubmit}
      onCancel={() => onClose()}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label="任务名称"
          name="title"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="请输入任务名称" maxLength={500} />
        </Form.Item>

        <Form.Item label="优先级" name="priority">
          <Select options={PRIORITY_OPTIONS} placeholder="选择优先级" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            label="责任人"
            name="assignee_id"
            rules={[{ required: true, message: '请选择责任人' }]}
          >
            <Select
              placeholder="选择责任人"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={users.map(u => ({ value: u.id, label: u.username }))}
            />
          </Form.Item>
        )}

        <Form.Item
          label="对象类别"
          name="object_type"
          rules={[{ required: true, message: '请输入对象类别' }]}
        >
          <Input placeholder="如：文章、关键词、画像等" maxLength={100} />
        </Form.Item>

        <Form.Item label="对象 ID" name="object_id">
          <Input placeholder="可选，对象的 ID" type="number" />
        </Form.Item>

        <Form.Item
          label="操作描述"
          name="action"
          rules={[{ required: true, message: '请输入操作描述' }]}
        >
          <Input.TextArea placeholder="描述需要执行的操作" maxLength={500} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TodoForm;
