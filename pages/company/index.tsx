import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Typography, Spin, Alert, Breadcrumb, Switch, Tag, App } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

interface Company {
  id: number;
  short_name: string;
  full_name: string;
  address: string | null;
  contact_person: string;
  contact_phone: string;
  status: boolean;
}

const CompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '获取公司列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, status: boolean) => {
    setTogglingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/companies/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(status ? '公司已启用' : '公司已禁用');
      fetchCompanies();
    } catch (err: any) {
      message.error(err.response?.data?.message || '操作失败');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} className="page-alert" />;
  }

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '公司管理' }]} /></div>
      <Row gutter={[16, 16]}>
        {companies.map((company) => (
          <Col key={company.id} xs={24} sm={12} lg={8} xl={6}>
            <Card
              hoverable={company.status}
              onClick={() => company.status && navigate(`/company/edit/${company.id}`)}
              styles={{ body: { padding: 24 } }}
              style={{ opacity: company.status ? 1 : 0.6 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Typography.Title level={3} className="company-card-title">{company.short_name}</Typography.Title>
                <Switch
                  size="small"
                  checked={company.status}
                  loading={togglingId === company.id}
                  onChange={(checked) => handleToggleStatus(company.id, checked)}
                  onClick={(_, e) => e.stopPropagation()}
                />
              </div>
              <Typography.Text type="secondary" className="company-card-subtitle">
                {company.full_name} {!company.status && <Tag color="red" style={{ marginLeft: 8 }}>已禁用</Tag>}
              </Typography.Text>
              {company.address && (
                <Typography.Text type="secondary" className="company-card-info">{company.address}</Typography.Text>
              )}
              <Typography.Text type="secondary" className="company-card-info">
                {company.contact_person} {company.contact_phone}
              </Typography.Text>
            </Card>
          </Col>
        ))}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card hoverable onClick={() => navigate('/company/add')} className="company-add-card">
            <PlusOutlined className="company-add-icon" />
            <Typography.Text className="company-add-text">添加公司</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyPage;
