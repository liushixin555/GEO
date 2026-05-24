import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Spin, Alert, Breadcrumb, Switch, Tag, App, Table, Descriptions } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '获取公司列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleStatus = async (id: number, status: boolean) => {
    setTogglingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/companies/${id}/status`, { status }, {
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

  const tableColumns: ColumnsType<Company> = [
    {
      title: '简称',
      dataIndex: 'short_name',
      key: 'short_name',
      render: (text: string, record: Company) => (
        <a onClick={() => record.status && navigate(`/company/edit/${record.id}`)} style={{ color: record.status ? 'var(--color-primary, #0f62fe)' : 'var(--color-ink-subtle, #8c8c8c)' }}>
          {text}
        </a>
      ),
    },
    {
      title: '全称',
      dataIndex: 'full_name',
      key: 'full_name',
      ellipsis: { showTitle: true },
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || '-',
    },
    {
      title: '联系人',
      dataIndex: 'contact_person',
      key: 'contact_person',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: boolean, record: Company) => (
        <Switch
          size="small"
          checked={status}
          loading={togglingId === record.id}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
        />
      ),
    },
  ];

  if (error) {
    return <Alert type="error" message={error} className="page-alert" />;
  }

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '公司管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12} />
        <Col xs={24} sm={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/company/add')}>添加公司</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="company-cards">
          {companies.length === 0 && !loading && (
            <Card>
              <div className="company-cards-empty">暂无数据</div>
            </Card>
          )}
          {companies.map((company) => (
            <Card
              key={company.id}
              size="small"
              title={company.short_name}
              extra={
                <Switch
                  size="small"
                  checked={company.status}
                  loading={togglingId === company.id}
                  onChange={(checked) => handleToggleStatus(company.id, checked)}
                />
              }
              hoverable={company.status}
              onClick={() => company.status && navigate(`/company/edit/${company.id}`)}
              style={{ cursor: company.status ? 'pointer' : 'default', opacity: company.status ? 1 : 0.6 }}
            >
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item label="全称">{company.full_name}</Descriptions.Item>
                <Descriptions.Item label="地址">{company.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="联系人">{company.contact_person}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{company.contact_phone}</Descriptions.Item>
              </Descriptions>
              {!company.status && (
                <Tag color="red" style={{ marginTop: 4 }}>已禁用</Tag>
              )}
            </Card>
          ))}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="company-table-wrapper">
          <Table
            columns={tableColumns}
            dataSource={companies}
            rowKey="id"
            size="middle"
            pagination={false}
            locale={{ emptyText: '暂无数据' }}
          />
        </div>
      </Spin>
    </div>
  );
};

export default CompanyPage;
