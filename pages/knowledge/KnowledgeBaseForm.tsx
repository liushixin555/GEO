import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Alert } from 'antd';
import axios from 'axios';
import { getSafeUser } from '../utils/auth';

interface KnowledgeBaseItem {
  id: number;
  name: string;
  description: string | null;
  scope: 'platform' | 'company' | 'project';
  company_id: number | null;
  company_name: string | null;
  project_id: number | null;
  project_name: string | null;
  status: boolean;
  created_by: number | null;
  creator_name: string | null;
  keyword_count: number;
  portrait_count: number;
  image_count: number;
}

interface CompanyOption {
  id: number;
  short_name: string;
}

interface ProjectOption {
  id: number;
  short_name: string;
  company_id: number;
}

interface KnowledgeBaseFormProps {
  item: KnowledgeBaseItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({ item, onClose, onSaved }) => {
  const isEdit = !!item;
  const user = getSafeUser();
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>(item?.scope || 'project');

  useEffect(() => {
    fetchAccessibleData();
    if (item) {
      form.setFieldsValue({
        name: item.name,
        description: item.description || '',
        scope: item.scope,
        company_id: item.company_id,
        project_id: item.project_id,
      });
      if (item.company_id) fetchProjects(item.company_id);
    }
  }, [item]);

  const fetchAccessibleData = async () => {
    try {
      const token = localStorage.getItem('token');
      const companiesRes = await axios.get('/api/v1/auth/companies', { headers: { Authorization: `Bearer ${token}` } });
      setCompanies(companiesRes.data.data.map((c: any) => ({ id: c.id, short_name: c.short_name })));
    } catch {
      // ignore
    }
  };

  const fetchProjects = async (companyId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/auth/projects', {
        headers: { Authorization: `Bearer ${token}` },
        params: { company_id: companyId },
      });
      setProjects(res.data.data.map((p: any) => ({ id: p.id, short_name: p.short_name, company_id: companyId })));
    } catch {
      // ignore
    }
  };

  const handleScopeChange = (scope: string) => {
    setSelectedScope(scope);
    form.setFieldsValue({ company_id: undefined, project_id: undefined });
  };

  const handleCompanyChange = (companyId: number) => {
    form.setFieldsValue({ project_id: undefined });
    setProjects([]);
    if (companyId) fetchProjects(companyId);
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        name: values.name?.trim(),
        description: values.description?.trim() || null,
        scope: values.scope,
      };

      if (values.scope === 'company') {
        payload.company_id = values.company_id;
      } else if (values.scope === 'project') {
        payload.company_id = values.company_id;
        payload.project_id = values.project_id;
      }

      if (isEdit) {
        await axios.put(`/api/v1/knowledge-bases/${item!.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/v1/knowledge-bases', payload, {
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

  const filteredProjects = selectedScope === 'project' ? projects : [];

  return (
    <Modal
      title={isEdit ? '编辑知识库' : '添加知识库'}
      open={true}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {error && <Alert type="error" title={error} className="form-alert" showIcon />}
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="name" label="知识库名称" rules={[{ required: true, message: '知识库名称不能为空' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="scope" label="共用范围" rules={[{ required: true, message: '请选择共用范围' }]}>
          <Select
            placeholder="请选择共用范围"
            onChange={handleScopeChange}
            disabled={isEdit}
            options={[
              { value: 'platform', label: '平台公共' },
              { value: 'company', label: '公司公共' },
              { value: 'project', label: '项目私有' },
            ]}
          />
        </Form.Item>
        {selectedScope === 'company' && (
          <Form.Item name="company_id" label="所属公司" rules={[{ required: true, message: '请选择公司' }]}>
            <Select
              placeholder="请选择公司"
              showSearch
              optionFilterProp="label"
              disabled={isEdit}
              onChange={handleCompanyChange}
              options={companies.map(c => ({ value: c.id, label: c.short_name }))}
            />
          </Form.Item>
        )}
        {selectedScope === 'project' && (
          <>
            <Form.Item name="company_id" label="所属公司" rules={[{ required: true, message: '请选择公司' }]}>
              <Select
                placeholder="请选择公司"
                showSearch
                optionFilterProp="label"
                disabled={isEdit}
                onChange={handleCompanyChange}
                options={companies.map(c => ({ value: c.id, label: c.short_name }))}
              />
            </Form.Item>
            <Form.Item name="project_id" label="所属项目" rules={[{ required: true, message: '请选择项目' }]}>
              <Select
                placeholder="请选择项目"
                showSearch
                optionFilterProp="label"
                disabled={isEdit}
                options={filteredProjects.map(p => ({ value: p.id, label: p.short_name }))}
              />
            </Form.Item>
          </>
        )}
        <div className="form-actions">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
        </div>
      </Form>
    </Modal>
  );
};

export default KnowledgeBaseForm;
