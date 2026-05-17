import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import axios from 'axios';

interface SkillsItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  status: boolean;
}

interface SkillFormProps {
  item: SkillsItem | null;
  isSysadmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SkillForm: React.FC<SkillFormProps> = ({ item, isSysadmin, onClose, onSaved }) => {
  const isEdit = !!item;
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        name: item.name,
        category: item.category,
        description: item.description || '',
      });
    }
  }, [item]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        name: values.name?.trim(),
        category: values.category?.trim(),
        description: values.description?.trim() || null,
      };

      if (isEdit) {
        await axios.put(`/api/skills/${item!.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/skills', payload, {
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
      title={isEdit ? '编辑技能' : '添加技能'}
      open={true}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {error && <Alert type="error" message={error} className="form-alert" showIcon />}
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="name" label="技能名称" rules={[{ required: true, message: '技能名称不能为空' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="category" label="类别" rules={[{ required: true, message: '类别不能为空' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input />
        </Form.Item>
        <div className="form-actions">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
        </div>
      </Form>
    </Modal>
  );
};

export default SkillForm;
