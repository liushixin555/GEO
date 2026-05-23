import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Tag, Spin, Pagination, App, Breadcrumb, Button, Descriptions, Table, Statistic, Typography, Space } from 'antd';
import { EditOutlined, PlusOutlined, TagsOutlined, UserOutlined, FileImageOutlined, FileTextOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import KnowledgeBaseForm from './KnowledgeBaseForm';
import { formatDate, formatDateTime } from '../utils/date';

/* ==================== Knowledge Base ==================== */

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
  document_count: number;
  created_at: string;
  updated_at: string;
}

/* ==================== Knowledge Inventory ==================== */

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  categoryKey: string;
  baseId: number;
  baseName: string;
  scope: string;
  projectName: string;
  creatorName: string;
  updatedAt: string;
}

interface InventoryStats {
  keyword: number;
  portrait: number;
  image: number;
  document: number;
  total: number;
}

/* ==================== Constants ==================== */

const scopeLabels: Record<string, { text: string; color: string }> = {
  platform: { text: '平台公共', color: 'blue' },
  company: { text: '公司公共', color: 'green' },
  project: { text: '项目私有', color: 'orange' },
};

const categoryColors: Record<string, string> = {
  keyword: '#0f62fe',
  portrait: '#24a148',
  image: '#f1c21b',
  document: '#da1e28',
};

const categoryLabels: Record<string, string> = {
  keyword: '关键词',
  portrait: '画像',
  image: '图片',
  document: '文档',
};

/* ==================== Page Component ==================== */

const KnowledgePage: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { message } = App.useApp();

  /* --- Knowledge Base state --- */
  const [data, setData] = useState<KnowledgeBaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeBaseItem | null>(null);

  /* --- Knowledge Inventory state --- */
  const [invData, setInvData] = useState<InventoryItem[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize] = useState(10);
  const [invLoading, setInvLoading] = useState(false);
  const [invStats, setInvStats] = useState<InventoryStats>({ keyword: 0, portrait: 0, image: 0, document: 0, total: 0 });
  const [invCategory, setInvCategory] = useState<string | undefined>(undefined);
  const [invSearch, setInvSearch] = useState('');

  /* --- Knowledge Base fetch --- */
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

  /* --- Knowledge Inventory fetch --- */
  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: Record<string, unknown> = { page: invPage, pageSize: invPageSize };
      if (invCategory) params.category = invCategory;
      if (invSearch) params.search = invSearch;

      const res = await axios.get('/api/knowledge-inventory', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setInvData(res.data.data.list);
      setInvTotal(res.data.data.total);
      setInvStats(res.data.data.stats);
    } catch {
      // ignore
    } finally {
      setInvLoading(false);
    }
  }, [invPage, invPageSize, invCategory, invSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  /* --- Knowledge Base helpers --- */
  const canModify = (item: KnowledgeBaseItem) => {
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const handleCardClick = (item: KnowledgeBaseItem) => {
    navigate(`/knowledge/${item.id}`);
  };

  /* --- Knowledge Base table columns --- */
  const tableColumns: ColumnsType<KnowledgeBaseItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text: string, record: KnowledgeBaseItem) => (
        <a onClick={() => navigate(`/knowledge/${record.id}`)} style={{ color: 'var(--color-primary, #0f62fe)' }}>{text}</a>
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
      width: 240,
      render: (_: unknown, record: KnowledgeBaseItem) => (
        <Space size={12}>
          <Space size={4}><TagsOutlined /> {record.keyword_count}</Space>
          <Space size={4}><UserOutlined /> {record.portrait_count}</Space>
          <Space size={4}><FileImageOutlined /> {record.image_count}</Space>
          <Space size={4}><FileTextOutlined /> {record.document_count}</Space>
        </Space>
      ),
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
        <Button type="link" size="small" icon={<EditOutlined />} disabled={!canModify(record)} onClick={() => { setEditItem(record); setShowForm(true); }}>编辑</Button>
      ),
    },
  ];

  /* --- Inventory table columns --- */
  const invTableColumns: ColumnsType<InventoryItem> = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
    },
    {
      title: '分类',
      dataIndex: 'categoryKey',
      key: 'categoryKey',
      width: 100,
      render: (key: string) => <Tag color={categoryColors[key]}>{categoryLabels[key] || key}</Tag>,
    },
    {
      title: '所属知识库',
      dataIndex: 'baseName',
      key: 'baseName',
      width: 160,
    },
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 120,
    },
    {
      title: '添加者',
      dataIndex: 'creatorName',
      key: 'creatorName',
      width: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: 'AI知识库' }]} /></div>

      {/* ==================== 知识库板块 ==================== */}
      <Typography.Title level={4} style={{ marginBottom: 16, fontWeight: 400 }}>知识库</Typography.Title>
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
        <div className="knowledge-cards">
          {data.length === 0 && (
            <Card><div className="knowledge-cards-empty">暂无数据</div></Card>
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
                  <Descriptions.Item label="描述"><Typography.Text ellipsis style={{ maxWidth: '100%' }}>{item.description || '-'}</Typography.Text></Descriptions.Item>
                  <Descriptions.Item label="创建者">{item.creator_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="统计"><Space size={12}><Space size={4}><TagsOutlined /> {item.keyword_count}</Space><Space size={4}><UserOutlined /> {item.portrait_count}</Space><Space size={4}><FileImageOutlined /> {item.image_count}</Space><Space size={4}><FileTextOutlined /> {item.document_count}</Space></Space></Descriptions.Item>
                  <Descriptions.Item label="创建时间">{formatDate(item.created_at)}</Descriptions.Item>
                </Descriptions>
                {canModify(item) && (
                  <div className="knowledge-card-footer">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowForm(true); }}>编辑</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

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
          <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false} onChange={(p) => setPage(p)} />
        </div>
      )}

      {showForm && (
        <KnowledgeBaseForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}

      {/* ==================== 知识清单板块 ==================== */}
      <div className="knowledge-inventory-section">
        <Typography.Title level={4} style={{ marginBottom: 16, fontWeight: 400 }}>知识清单</Typography.Title>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} className="knowledge-stat-cards">
          <Col xs={12} sm={6}>
            <Card className="stat-card" styles={{ body: { padding: '16px 24px' } }}>
              <Statistic title={<Space><AppstoreOutlined /> 总资产</Space>} value={invStats.total} valueStyle={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink, #161616)' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card" styles={{ body: { padding: '16px 24px' } }}>
              <Statistic title={<Space><TagsOutlined /> 关键词</Space>} value={invStats.keyword} valueStyle={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink, #161616)' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card" styles={{ body: { padding: '16px 24px' } }}>
              <Statistic title={<Space><UserOutlined /> 画像</Space>} value={invStats.portrait} valueStyle={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink, #161616)' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card" styles={{ body: { padding: '16px 24px' } }}>
              <Statistic title={<Space><FileImageOutlined /> 图片</Space>} value={invStats.image} valueStyle={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink, #161616)' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card" styles={{ body: { padding: '16px 24px' } }}>
              <Statistic title={<Space><FileTextOutlined /> 文档</Space>} value={invStats.document} valueStyle={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink, #161616)' }} />
            </Card>
          </Col>
        </Row>

        {/* 筛选器 */}
        <Row gutter={[16, 12]} className="toolbar" style={{ marginTop: 16 }}>
          <Col xs={24} sm={8}>
            <Input.Search
              placeholder="搜索资产名称..."
              value={invSearch}
              onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              value={invCategory}
              onChange={(val) => { setInvCategory(val); setInvPage(1); }}
              allowClear
              placeholder="全部分类"
              style={{ width: '100%' }}
              options={[
                { value: 'keyword', label: '关键词' },
                { value: 'portrait', label: '画像' },
                { value: 'image', label: '图片' },
                { value: 'document', label: '文档' },
              ]}
            />
          </Col>
        </Row>

        {/* 清单表格/卡片 */}
        <Spin spinning={invLoading}>
          <div className="inventory-cards">
            {invData.length === 0 && (
              <Card><div className="knowledge-cards-empty">暂无数据</div></Card>
            )}
            {invData.map((item) => (
              <Card key={item.id} size="small" hoverable style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Typography.Text strong ellipsis style={{ flex: 1, marginRight: 8 }}>{item.name}</Typography.Text>
                  <Tag color={categoryColors[item.categoryKey]}>{item.category}</Tag>
                </div>
                <Descriptions column={2} size="small" colon={false}>
                  <Descriptions.Item label="所属知识库">{item.baseName}</Descriptions.Item>
                  <Descriptions.Item label="项目">{item.projectName}</Descriptions.Item>
                  <Descriptions.Item label="添加者">{item.creatorName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{formatDateTime(item.updatedAt)}</Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </div>

          <div className="inventory-table-wrapper">
            <Table
              columns={invTableColumns}
              dataSource={invData}
              rowKey="id"
              size="middle"
              pagination={false}
              locale={{ emptyText: '暂无数据' }}
            />
          </div>
        </Spin>

        {invTotal > invPageSize && (
          <div className="item-card-pagination">
            <Pagination current={invPage} pageSize={invPageSize} total={invTotal} showSizeChanger={false} onChange={(p) => setInvPage(p)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePage;
