import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Switch, Typography, Spin, Pagination, Breadcrumb } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import ProjectForm from './ProjectForm';

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

const ProjectPage: React.FC = () => {
  const [data, setData] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ProjectItem | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/auth/companies', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data.data.map((c: any) => ({ id: c.id, short_name: c.short_name })));
      } catch {
        // ignore
      }
    };
    fetchCompanies();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterCompany) params.company_id = filterCompany;
      if (filterStatus !== '') params.status = filterStatus;

      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterCompany, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (item: ProjectItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${item.id}`, {
        status: !item.status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '项目管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索项目名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterCompany}
            onChange={(val) => { setFilterCompany(val); setPage(1); }}
            allowClear
            placeholder="全部公司的全部项目"
            style={{ width: '100%' }}
            options={companies.map(c => ({ value: c.id, label: c.short_name }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            style={{ width: '100%' }}
            options={[
              { value: 'true', label: '启用' },
              { value: 'false', label: '禁用' },
            ]}
          />
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {data.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}>
                <div className="item-card-header">
                  <Typography.Title level={3} className="item-card-title">{item.short_name}</Typography.Title>
                  <EditOutlined className="item-card-edit" onClick={() => { setEditItem(item); setShowForm(true); }} />
                </div>
                <div className="item-card-row">
                  <span className="item-card-username">{item.full_name}</span>
                </div>
                <div className="item-card-row">
                  <span className="item-card-username">{item.company_name}</span>
                  {item.operator_names.length > 0 && <span className="item-card-username">{item.operator_names.join(', ')}</span>}
                </div>
                <div className="item-card-row">
                  <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                </div>
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => { setEditItem(null); setShowForm(true); }} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加项目</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Spin>

      {total > pageSize && (
        <div className="item-card-pagination">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {showForm && (
        <ProjectForm
          item={editItem}
          companies={companies}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default ProjectPage;
