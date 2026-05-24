import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Switch, Tag, Spin, Pagination, Breadcrumb, Button, Descriptions, Table, App } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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
  const { message } = App.useApp();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/auth/companies', {
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

      const res = await axios.get('/api/v1/projects', {
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
      await axios.put(`/api/v1/projects/${item.id}`, {
        status: !item.status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(item.status ? '项目已禁用' : '项目已启用');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const tableColumns: ColumnsType<ProjectItem> = [
    {
      title: '简称',
      dataIndex: 'short_name',
      key: 'short_name',
      ellipsis: { showTitle: true },
    },
    {
      title: '全称',
      dataIndex: 'full_name',
      key: 'full_name',
      ellipsis: { showTitle: true },
    },
    {
      title: '公司',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 120,
    },
    {
      title: '运营者',
      dataIndex: 'operator_names',
      key: 'operator_names',
      width: 140,
      render: (names: string[]) => names.length > 0 ? names.join(', ') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: boolean, record: ProjectItem) => (
        <Switch
          size="small"
          checked={status}
          onChange={() => handleToggleStatus(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_: unknown, record: ProjectItem) => (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(record); setShowForm(true); }} style={{ color: 'var(--color-primary, #0f62fe)' }} />
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '项目管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索项目名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={filterCompany}
            onChange={(val) => { setFilterCompany(val); setPage(1); }}
            allowClear
            placeholder="全部公司"
            style={{ width: '100%' }}
            options={companies.map(c => ({ value: c.id, label: c.short_name }))}
          />
        </Col>
        <Col xs={24} sm={4}>
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
        <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setShowForm(true); }}>添加项目</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="project-cards">
          {data.length === 0 && !loading && (
            <Card>
              <div className="project-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => (
            <Card
              key={item.id}
              size="small"
              title={item.short_name}
              extra={
                <Switch
                  size="small"
                  checked={item.status}
                  onChange={() => handleToggleStatus(item)}
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              }
            >
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item label="全称">{item.full_name}</Descriptions.Item>
                <Descriptions.Item label="公司">{item.company_name}</Descriptions.Item>
                <Descriptions.Item label="运营者">{item.operator_names.length > 0 ? item.operator_names.join(', ') : '-'}</Descriptions.Item>
              </Descriptions>
              <div className="project-card-footer">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(item); setShowForm(true); }} style={{ color: 'var(--color-primary, #0f62fe)' }} />
              </div>
            </Card>
          ))}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="project-table-wrapper">
          <Table
            columns={tableColumns}
            dataSource={data}
            rowKey="id"
            size="middle"
            pagination={false}
            locale={{ emptyText: '暂无数据' }}
          />
        </div>
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
