import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Tag, Typography, Spin, Pagination, Empty, Popconfirm, App, Breadcrumb } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

interface ArticleItem {
  id: number;
  project_id: number;
  title: string;
  keywords: string[] | null;
  status: string;
  created_by: number | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  publishing: { label: '发布中', color: 'processing' },
  publish_failed: { label: '发布失败', color: 'error' },
  published: { label: '已发布', color: 'success' },
};

const ArticlePage: React.FC = () => {
  const { projectId } = useAppContext();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [data, setData] = useState<ArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get(`/api/projects/${projectId}/articles`, {
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
  }, [projectId, page, pageSize, search, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (item: ArticleItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/projects/${projectId}/articles/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const canDelete = (item: ArticleItem) => {
    if (item.status === 'published') return false;
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  if (!projectId) {
    return (
      <div className="page-container">
        <div className="page-breadcrumb"><Breadcrumb items={[{ title: 'GEO文章' }]} /></div>
        <Empty description="请先在左下角选择一个项目" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: 'GEO文章' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索文章标题..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={6}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            style={{ width: '100%' }}
            options={Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }))}
          />
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {data.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, color: 'default' };
            return (
              <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
                <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}
                  onClick={() => navigate(`/article/${item.id}`)}
                >
                  <div className="item-card-header">
                    <Typography.Title level={3} className="item-card-title" ellipsis={{ tooltip: item.title }}>
                      {item.title}
                    </Typography.Title>
                    {canDelete(item) && (
                      <Popconfirm title="确定删除此文章？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(item); }} okText="删除" cancelText="取消">
                        <DeleteOutlined style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    )}
                  </div>
                  <div className="item-card-row">
                    <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                  </div>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="item-card-row" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {item.keywords.slice(0, 3).map((kw, i) => (
                        <Tag key={i}>{kw}</Tag>
                      ))}
                      {item.keywords.length > 3 && <Tag>+{item.keywords.length - 3}</Tag>}
                    </div>
                  )}
                  <div className="item-card-row">
                    <span className="item-card-username">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Col>
            );
          })}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => navigate(`/article/new`)} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加文章</Typography.Text>
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
    </div>
  );
};

export default ArticlePage;
