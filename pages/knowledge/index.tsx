import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Tag, Spin, Pagination, App, Breadcrumb, Button, Descriptions, Table } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import KnowledgeBaseForm from './KnowledgeBaseForm';

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
  created_at: string;
  updated_at: string;
}

const scopeLabels: Record<string, { text: string; color: string }> = {
  platform: { text: '平台公共', color: 'blue' },
  company: { text: '公司公共', color: 'green' },
  project: { text: '项目私有', color: 'orange' },
};

function formatDate(value: string): string {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const KnowledgePage: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [data, setData] = useState<KnowledgeBaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeBaseItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: Record<string, unknown> = { page, pageSize };
      if (search) params.search = search;
      if (filterScope) params.scope = filterScope;

      const res = await axios.get('/api/knowledge-bases', {
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
  }, [page, pageSize, search, filterScope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canModify = (item: KnowledgeBaseItem) => {
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const handleCardClick = (item: KnowledgeBaseItem) => {
    navigate(`/knowledge/${item.id}`);
  };

  const tableColumns: ColumnsType<KnowledgeBaseItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text: string, record: KnowledgeBaseItem) => (
        <a onClick={() => navigate(`/knowledge/${record.id}`)} style={{ color: 'var(--color-primary, #0f62fe)' }}>
          {text}
        </a>
      ),
    },
    {
      title: '范围',
      dataIndex: 'scope',
      key: 'scope',
      width: 100,
      render: (scope: string) => {
        const cfg = scopeLabels[scope];
        return <Tag color={cfg?.color}>{cfg?.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || '-',
    },
    {
      title: '统计',
      key: 'stats',
      width: 200,
      render: (_: unknown, record: KnowledgeBaseItem) =>
        `关键词 ${record.keyword_count} | 画像 ${record.portrait_count} | 图片 ${record.image_count}`,
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
      render: (text: string | null) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (val: string) => formatDate(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: KnowledgeBaseItem) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          disabled={!canModify(record)}
          onClick={() => { setEditItem(record); setShowForm(true); }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: 'AI知识库' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索知识库名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterScope}
            onChange={(val) => { setFilterScope(val); setPage(1); }}
            allowClear
            placeholder="全部范围"
            style={{ width: '100%' }}
            options={[
              { value: 'platform', label: '平台公共' },
              { value: 'company', label: '公司公共' },
              { value: 'project', label: '项目私有' },
            ]}
          />
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setShowForm(true); }}>添加知识库</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="knowledge-cards">
          {data.length === 0 && (
            <Card>
              <div className="knowledge-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => {
            const scopeCfg = scopeLabels[item.scope];
            return (
              <Card
                key={item.id}
                size="small"
                title={item.name}
                extra={<Tag color={scopeCfg?.color}>{scopeCfg?.text}</Tag>}
                hoverable
                onClick={() => handleCardClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <Descriptions column={2} size="small" colon={false}>
                  <Descriptions.Item label="描述">{item.description || '-'}</Descriptions.Item>
                  <Descriptions.Item label="创建者">{item.creator_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="统计">关键词 {item.keyword_count} | 画像 {item.portrait_count} | 图片 {item.image_count}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{formatDate(item.created_at)}</Descriptions.Item>
                </Descriptions>
                {canModify(item) && (
                  <div className="knowledge-card-footer">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowForm(true); }}
                    >
                      编辑
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="knowledge-table-wrapper">
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
        <KnowledgeBaseForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default KnowledgePage;
