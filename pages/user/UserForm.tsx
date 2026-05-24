import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Alert } from 'antd';
import axios from 'axios';

interface UserItem {
  id: number;
  username: string;
  cn_name: string;
  role: string;
  status: boolean;
}

interface UserFormProps {
  item: UserItem | null;
  isSysadmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ item, isSysadmin, onClose, onSaved }) => {
  const isEdit = !!item;
  const isDisabled = isEdit && !item!.status;
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        username: item.username,
        cn_name: item.cn_name,
        role: item.role,
      });
    } else {
      form.setFieldsValue({ role: 'view' });
    }
  }, [item]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        username: values.username?.trim(),
        cn_name: values.cn_name?.trim(),
        role: values.role,
      };
      if (values.password?.trim()) payload.password = values.password.trim();

      if (isEdit) {
        delete payload.username;
        await axios.put(`/api/v1/users/${item!.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/v1/users', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑用户' : '添加用户'}
      open={true}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {isDisabled && <Alert type="warning" title="该用户已被禁用，无法编辑" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert type="error" title={error} className="form-alert" showIcon />}
      <Form form={form} onFinish={handleSubmit} layout="vertical" initialValues={{ role: 'view' }}>
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '用户名不能为空' }]}>
          <Input disabled={isEdit} />
        </Form.Item>
        <Form.Item name="password" label={isEdit ? '密码（留空则不修改）' : '密码'} rules={isEdit ? [] : [{ required: true, message: '密码不能为空' }]}>
          <Input.Password placeholder={isEdit ? '留空则不修改' : ''} disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="cn_name" label="姓名" rules={[{ required: true, message: '姓名不能为空' }]}>
          <Input disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
          <Select disabled={isEdit && item?.role === 'sysadmin'}>
            <Select.Option value="admin">运营者</Select.Option>
            <Select.Option value="view">查看者</Select.Option>
            {isSysadmin && <Select.Option value="sysadmin">系统管理员</Select.Option>}
          </Select>
        </Form.Item>
        <div className="form-actions">
          <Button onClick={onClose}>取消</Button>
          {!isDisabled && <Button type="primary" htmlType="submit" loading={saving}>保存</Button>}
        </div>
      </Form>
    </Modal>
  );
};

export default UserForm;
