import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Switch, Typography, Spin, Pagination, Popconfirm, App, Breadcrumb, Tag } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeBaseItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterScope) params.scope = filterScope;
      if (filterStatus !== '') params.status = filterStatus;

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
  }, [page, pageSize, search, filterScope, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (item: KnowledgeBaseItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/knowledge-bases/${item.id}`, { status: !item.status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (item: KnowledgeBaseItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/knowledge-bases/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const canModify = (item: KnowledgeBaseItem) => {
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const handleCardClick = (item: KnowledgeBaseItem) => {
    navigate(`/knowledge/${item.id}`);
  };

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
              <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}
                onClick={() => handleCardClick(item)}
              >
                <div className="item-card-header">
                  <Typography.Title level={3} className="item-card-title" ellipsis={{ tooltip: item.name }}>{item.name}</Typography.Title>
                  {canModify(item) && (
                    <div className="item-card-actions">
                      <EditOutlined className="item-card-edit" onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowForm(true); }} />
                      <Popconfirm title="确定删除此知识库？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(item); }} okText="删除" cancelText="取消">
                        <DeleteOutlined className="item-card-edit-danger" onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  )}
                </div>
                <div className="item-card-row">
                  <Tag color={scopeLabels[item.scope]?.color}>{scopeLabels[item.scope]?.text}</Tag>
                  {item.company_name && <span className="item-card-username">{item.company_name}</span>}
                  {item.project_name && <span className="item-card-username">{item.project_name}</span>}
                </div>
                {item.description && (
                  <div className="item-card-row">
                    <Typography.Paragraph className="item-card-desc" ellipsis={{ rows: 2 }}>{item.description}</Typography.Paragraph>
                  </div>
                )}
                <div className="item-card-row">
                  <span className="item-card-username">关键词 {item.keyword_count} | 画像 {item.portrait_count} | 图片 {item.image_count}</span>
                </div>
                <div className="item-card-row">
                  <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                  {item.creator_name && <span className="item-card-username" style={{ marginLeft: 8 }}>{item.creator_name}</span>}
                </div>
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => { setEditItem(null); setShowForm(true); }} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加知识库</Typography.Text>
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
