import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Breadcrumb, Alert, Row, Col, Divider, Spin, Select, Tag } from 'antd';
import axios from 'axios';

interface FormData {
  short_name: string;
  full_name: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids: number[];
}

interface UserOption {
  id: number;
  username: string;
  cn_name: string;
  role: string;
  status: boolean;
}

const CompanyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form] = Form.useForm<FormData>();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [companyDisabled, setCompanyDisabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEdit && id) {
      fetchCompany(parseInt(id, 10));
    }
  }, [id]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/users', {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: 1, pageSize: 100, status: 'true' },
        });
        setUsers(res.data.data.list);
      } catch {
        // ignore
      }
    };
    fetchUsers();
  }, []);

  const fetchCompany = async (companyId: number) => {
    try {
      setFetching(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data;
      setCompanyDisabled(!data.status);
      form.setFieldsValue({
        short_name: data.short_name || '',
        full_name: data.full_name || '',
        address: data.address || '',
        contact_person: data.contact_person || '',
        contact_phone: data.contact_phone || '',
        operator_ids: data.operator_ids || [],
        viewer_ids: data.viewer_ids || [],
      });
    } catch (err: any) {
      setServerError(err.response?.data?.message || '获取公司信息失败');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (values: FormData) => {
    setServerError('');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const payload: any = {
        short_name: values.short_name,
        full_name: values.full_name,
        address: values.address || undefined,
        contact_person: values.contact_person,
        contact_phone: values.contact_phone,
        operator_ids: values.operator_ids,
        viewer_ids: values.viewer_ids || [],
      };

      if (isEdit && id) {
        await axios.put(`/api/v1/companies/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/v1/companies', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      navigate('/company');
    } catch (err: any) {
      setServerError(err.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '公司管理' }, { title: isEdit ? '修改公司' : '添加公司' }]} /></div>
      {companyDisabled && <Alert type="warning" title="该公司已被禁用，无法编辑" showIcon style={{ marginBottom: 16 }} />}
      {serverError && <Alert type="error" title={serverError} className="form-alert-lg" showIcon />}
      {fetching && <div className="loading-container"><Spin size="large" /></div>}
      <Form form={form} onFinish={handleSubmit} layout="vertical" className="company-form" style={fetching ? { display: 'none' } : undefined}>
        <Form.Item name="short_name" label="公司名短名" rules={[{ required: true, message: '公司名短名不能为空' }]}>
          <Input placeholder="请输入公司名短名" disabled={companyDisabled} />
        </Form.Item>
        <Form.Item name="full_name" label="公司名全名" rules={[{ required: true, message: '公司名全名不能为空' }]}>
          <Input placeholder="请输入公司名全名" disabled={companyDisabled} />
        </Form.Item>
        <Form.Item name="address" label="公司地址">
          <Input placeholder="请输入公司地址（选填）" disabled={companyDisabled} />
        </Form.Item>
        <Form.Item name="contact_person" label="公司接口人" rules={[{ required: true, message: '接口人不能为空' }]}>
          <Input placeholder="请输入接口人姓名" disabled={companyDisabled} />
        </Form.Item>
        <Form.Item name="contact_phone" label="接口人电话" rules={[{ required: true, message: '接口人电话不能为空' }]}>
          <Input placeholder="请输入接口人电话" disabled={companyDisabled} />
        </Form.Item>
        <Form.Item name="operator_ids" label="运营者" rules={[{ required: true, message: '运营者不能为空' }]}>
          <Select
            mode="multiple"
            placeholder="请选择运营者"
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={companyDisabled}
          >
            {users.filter(u => u.role === 'admin' && u.status !== false).map(u => (
              <Select.Option key={u.id} value={u.id} label={u.username}>
                {u.username}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="viewer_ids" label="查看者">
          <Select
            mode="multiple"
            placeholder="请选择查看者（选填）"
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={companyDisabled}
          >
            {users.filter(u => u.role === 'view' && u.status !== false).map(u => (
              <Select.Option key={u.id} value={u.id} label={u.username}>
                {u.username}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <div className="form-actions-lg">
          <Button onClick={() => navigate('/company')}>取消</Button>
          {!companyDisabled && (
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '保存修改' : '创建公司'}
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

export default CompanyForm;
