import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import axios from 'axios';

interface LlmModelItem {
  id: number;
  provider: string;
  base_url: string;
  api_key: string;
  model_name: string;
  status: boolean;
}

interface LlmModelFormProps {
  item: LlmModelItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const LlmModelForm: React.FC<LlmModelFormProps> = ({ item, onClose, onSaved }) => {
  const isEdit = !!item;
  const isDisabled = isEdit && !item!.status;
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        provider: item.provider,
        base_url: item.base_url,
        api_key: item.api_key,
        model_name: item.model_name,
      });
    }
  }, [item, form]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        provider: values.provider?.trim(),
        base_url: values.base_url?.trim(),
        api_key: values.api_key?.trim(),
        model_name: values.model_name?.trim(),
      };

      if (isEdit) {
        await axios.put(`/api/v1/llm-models/${item!.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/v1/llm-models', payload, {
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
      title={isEdit ? '编辑LLM模型' : '添加LLM模型'}
      open={true}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {isDisabled && <Alert type="warning" title="该模型已被禁用，无法编辑" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert type="error" title={error} className="form-alert" showIcon />}
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="provider" label="供应商" rules={[{ required: true, message: '供应商不能为空' }]}>
          <Input placeholder="如 OpenAI、Anthropic、DeepSeek" disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="base_url" label="Base URL" rules={[{ required: true, message: 'Base URL不能为空' }]}>
          <Input placeholder="https://api.openai.com/v1" disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="api_key" label="API Key" rules={[{ required: true, message: 'API Key不能为空' }]}>
          <Input.Password placeholder="请输入API Key" disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="model_name" label="模型名称" rules={[{ required: true, message: '模型名称不能为空' }]}>
          <Input placeholder="如 gpt-4o、claude-3-sonnet" disabled={isDisabled} />
        </Form.Item>
        <div className="form-actions">
          <Button onClick={onClose}>取消</Button>
          {!isDisabled && <Button type="primary" htmlType="submit" loading={saving}>保存</Button>}
        </div>
      </Form>
    </Modal>
  );
};

export default LlmModelForm;
