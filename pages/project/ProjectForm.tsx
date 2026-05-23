import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, Select } from 'antd';
import axios from 'axios';

interface ProjectItem {
  id: number;
  short_name: string;
  full_name: string;
  description: string | null;
  company_id: number;
  company_name: string;
  operator_ids: number[];
  operator_names: string[];
  viewer_ids: number[];
  viewer_names: string[];
  status: boolean;
}

interface CompanyOption {
  id: number;
  short_name: string;
}

interface UserRef {
  id: number;
  cn_name: string;
  username: string;
}

interface ProjectFormProps {
  item: ProjectItem | null;
  companies: CompanyOption[];
  onClose: () => void;
  onSaved: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ item, companies, onClose, onSaved }) => {
  const isEdit = !!item;
  const isDisabled = isEdit && !item!.status;
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [operators, setOperators] = useState<UserRef[]>([]);
  const [viewers, setViewers] = useState<UserRef[]>([]);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        short_name: item.short_name,
        full_name: item.full_name,
        description: item.description || '',
        company_id: item.company_id,
        operator_ids: item.operator_ids,
        viewer_ids: item.viewer_ids,
      });
      if (item.company_id) {
        fetchCompanyUsers(item.company_id);
      }
    }
  }, [item]);

  const fetchCompanyUsers = async (companyId: number) => {
    setOperators([]);
    setViewers([]);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/auth/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOperators(res.data.data.operators || []);
      setViewers(res.data.data.viewers || []);
    } catch {
      // ignore
    }
  };

  const handleCompanyChange = (companyId: number) => {
    form.setFieldsValue({ operator_ids: [], viewer_ids: [] });
    fetchCompanyUsers(companyId);
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        short_name: values.short_name?.trim(),
        full_name: values.full_name?.trim(),
        description: values.description?.trim() || null,
        company_id: values.company_id,
        operator_ids: values.operator_ids || [],
        viewer_ids: values.viewer_ids || [],
      };

      if (isEdit) {
        await axios.put(`/api/projects/${item!.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/projects', payload, {
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
      title={isEdit ? '编辑项目' : '添加项目'}
      open={true}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {isDisabled && <Alert type="warning" title="该项目已被禁用，无法编辑" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert type="error" title={error} className="form-alert" showIcon />}
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="short_name" label="项目短名" rules={[{ required: true, message: '项目短名不能为空' }]}>
          <Input disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="full_name" label="项目全名" rules={[{ required: true, message: '项目全名不能为空' }]}>
          <Input disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="description" label="项目描述">
          <Input disabled={isDisabled} />
        </Form.Item>
        <Form.Item name="company_id" label="所属公司" rules={[{ required: true, message: '所属公司不能为空' }]}>
          <Select
            placeholder="请选择所属公司"
            showSearch
            optionFilterProp="label"
            onChange={handleCompanyChange}
            disabled={isEdit}
            options={companies.map(c => ({ value: c.id, label: c.short_name }))}
          />
        </Form.Item>
        <Form.Item name="operator_ids" label="项目运营者">
          <Select
            mode="multiple"
            placeholder="请选择"
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={isDisabled}
            options={operators.map(o => ({ value: o.id, label: o.username }))}
          />
        </Form.Item>
        <Form.Item name="viewer_ids" label="项目查看者">
          <Select
            mode="multiple"
            placeholder="请选择"
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={isDisabled}
            options={viewers.map(v => ({ value: v.id, label: v.username }))}
          />
        </Form.Item>
        <div className="form-actions">
          <Button onClick={onClose}>取消</Button>
          {!isDisabled && <Button type="primary" htmlType="submit" loading={saving}>保存</Button>}
        </div>
      </Form>
    </Modal>
  );
};

export default ProjectForm;
