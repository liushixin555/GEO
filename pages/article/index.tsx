import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Tag, Typography, Spin, Pagination, Empty, Popconfirm, App, Breadcrumb, Button, Table, Flex } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { useAppContext } from '../context/AppContext';
import { formatDate } from '../utils/date';

interface ArticleItem {
  id: number;
  project_id: number;
  title: string;
  keywords: string | null;
  status: string;
  created_by: number | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  manual_writing: { label: '手工编写中', color: 'processing' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  publishing: { label: '发布中', color: 'processing' },
  publish_failed: { label: '发布失败', color: 'error' },
  published: { label: '已发布', color: 'success' },
};

const ArticlePage: React.FC = () => {
  const { projectId } = useAppContext();
  const user = getSafeUser();
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
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await apiClient.get(`/projects/${projectId}/articles`, { params });
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
      await apiClient.delete(`/projects/${projectId}/articles/${item.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      console.error('[Article] 删除失败:', err.response?.status, err.response?.data);
      message.error('删除失败');
    }
  };

  const canDelete = (item: ArticleItem) => {
    if (item.status === 'published' || item.status === 'publishing') return false;
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const tableColumns: ColumnsType<ArticleItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => (
        <a onClick={() => navigate(`/article/${id}`)} style={{ color: 'var(--color-primary, #0f62fe)' }}>
          {id}
        </a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: true },
      render: (text: string, record: ArticleItem) => (
        <a onClick={() => navigate(`/article/${record.id}`)} style={{ color: 'var(--color-primary, #0f62fe)' }}>
          {text || '<还没有标题，待生成>'}
        </a>
      ),
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
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
      width: 60,
      render: (_: unknown, record: ArticleItem) => (
        <Popconfirm title="确定删除此文章？" onConfirm={() => handleDelete(record)} okText="删除" cancelText="取消" disabled={!canDelete(record)}>
          <Button type="text" size="small" icon={<DeleteOutlined />} danger={canDelete(record)} disabled={!canDelete(record)} />
        </Popconfirm>
      ),
    },
  ];

  if (!projectId) {
    return (
      <div className="page-container">
        <div className="page-breadcrumb"><Breadcrumb items={[{ title: '文章管理' }]} /></div>
        <Empty description="请先在左下角选择一个项目" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '文章管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索文章关联的关键词..."
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
        <Col xs={24} sm={6} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/article/new')}>添加文章</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="article-cards">
          {data.length === 0 && (
            <Card>
              <div className="article-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, color: 'default' };
            return (
              <Card
                key={item.id}
                size="small"
                title={item.title || '<还没有标题，待生成>'}
                extra={<Tag color={statusCfg.color}>{statusCfg.label}</Tag>}
                hoverable
                onClick={() => navigate(`/article/${item.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Flex align="center" gap="middle" style={{ whiteSpace: 'nowrap' }}>
                  <Typography.Text>ID: {item.id}</Typography.Text>
                  <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>关键词: {item.keywords || '-'}</Typography.Text>
                  <Typography.Text>创建时间: {formatDate(item.created_at)}</Typography.Text>
                </Flex>
                <div className="article-card-footer">
                  <Popconfirm
                    title="确定删除此文章？"
                    onConfirm={(e) => { e?.stopPropagation(); handleDelete(item); }}
                    okText="删除" cancelText="取消"
                    disabled={!canDelete(item)}
                  >
                    <Button type="text" size="small" icon={<DeleteOutlined />} danger={canDelete(item)} disabled={!canDelete(item)} onClick={(e) => e.stopPropagation()} />
                  </Popconfirm>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="article-table-wrapper">
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
    </div>
  );
};

export default ArticlePage;
