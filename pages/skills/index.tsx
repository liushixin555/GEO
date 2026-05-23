import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Switch, Spin, Pagination, Breadcrumb, Button, Descriptions, Table, Tag } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import SkillsForm from './SkillsForm';

interface SkillsItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  status: boolean;
}

const SkillPage: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<SkillsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SkillsItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      if (filterStatus !== '') params.status = filterStatus;

      const res = await axios.get('/api/skills', {
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
  }, [page, pageSize, search, filterCategory, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (item: SkillsItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/skills/${item.id}`, {
        status: !item.status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {
      // ignore
    }
  };

  const tableColumns: ColumnsType<SkillsItem> = [
    {
      title: '技能名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: boolean) => (
        <Tag color={status ? 'success' : 'default'}>{status ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: SkillsItem) => (
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(record); setShowForm(true); }}>编辑</Button>
          <Switch size="small" checked={record.status} onChange={() => handleToggleStatus(record)} />
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '技能管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索技能名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={6}>
          <Select
            value={filterCategory || undefined}
            onChange={(val) => { setFilterCategory(val || ''); setPage(1); }}
            allowClear
            placeholder="全部类别"
            options={[]}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            options={[
              { value: 'true', label: '启用' },
              { value: 'false', label: '禁用' },
            ]}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setShowForm(true); }}>添加技能</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="skills-cards">
          {data.length === 0 && (
            <Card>
              <div className="skills-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => (
            <Card
              key={item.id}
              size="small"
              title={item.name}
              extra={<Tag color={item.status ? 'success' : 'default'}>{item.status ? '启用' : '禁用'}</Tag>}
            >
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item label="类别">{item.category}</Descriptions.Item>
                <Descriptions.Item label="描述">{item.description || '-'}</Descriptions.Item>
              </Descriptions>
              <div className="skills-card-footer">
                <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(item); setShowForm(true); }}>编辑</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="skills-table-wrapper">
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
        <SkillsForm
          item={editItem}
          isSysadmin={user.role === 'sysadmin'}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}

    </div>
  );
};

export default SkillPage;
