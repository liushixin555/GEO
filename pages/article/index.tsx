import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Tag, Typography, Spin, Pagination, Empty, Popconfirm, App, Breadcrumb, Button, Table, Flex, Modal } from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { useAppContext } from '../context/AppContext';
import { formatDate } from '../utils/date';
import { getApiErrorMessage } from '../utils/error';
import ArticleBatchGenerateModal from './components/ArticleBatchGenerateModal';
import AutoPublishModal from './components/AutoPublishModal';

interface ArticleItem {
  id: number;
  project_id: number;
  title: string;
  keywords: string | null;
  status: string;
  created_by: number | null;
  created_at: string;
  schedule_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  manual_writing: { label: '手工编写中', color: 'processing' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
};

const LIST_STATUS_OPTIONS = Object.entries(STATUS_CONFIG)
  .filter(([value]) => value !== 'generate_failed')
  .map(([value, { label }]) => ({ value, label }));

function getScheduleStatus(item: ArticleItem): { label: string; color: string } | null {
  if (item.status !== 'approved') return null;
  const count = item.schedule_count ?? 0;
  if (count === 0) return { label: '可发布', color: 'blue' };
  return { label: `${count}个发布`, color: 'cyan' };
}

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
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [autoPublishOpen, setAutoPublishOpen] = useState(false);
  const [batchReviseOpen, setBatchReviseOpen] = useState(false);
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [batchReviseSubmitting, setBatchReviseSubmitting] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState<React.Key[]>([]);

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
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '删除失败'));
    }
  };

  const canDelete = (item: ArticleItem) => {
    if (item.status === 'approved') return false;
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const canAutoPublish = (item: ArticleItem) => item.status === 'approved' && (item.schedule_count ?? 0) === 0;
  const canBatchRegenerate = (item: ArticleItem) => ['draft', 'generate_failed', 'pending_review'].includes(item.status);
  const selectedArticles = data.filter((item) => selectedArticleIds.includes(item.id));
  const selectedCanAutoPublish = selectedArticles.length > 0 && selectedArticles.every(canAutoPublish);
  const selectedCanBatchRegenerate = selectedArticles.length > 0 && selectedArticles.every(canBatchRegenerate);

  const handleBatchRegenerate = async () => {
    if (!projectId || batchReviseSubmitting) return;
    setBatchReviseSubmitting(true);
    try {
      const res = await apiClient.put(`/projects/${projectId}/articles/batch-regenerate`, {
        article_ids: selectedArticleIds.map(Number),
        revision_instruction: revisionInstruction.trim() || undefined,
      });
      const result = res.data.data;
      if (result.failed_count > 0) {
        message.warning(`已提交 ${result.success_count} 篇，${result.failed_count} 篇未提交`);
      } else {
        message.success(`已提交 ${result.success_count} 篇文章二次修改`);
      }
      setBatchReviseOpen(false);
      setRevisionInstruction('');
      setSelectedArticleIds([]);
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '批量二次修改提交失败'));
    } finally {
      setBatchReviseSubmitting(false);
    }
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
      title: '发布',
      key: 'schedule',
      width: 100,
      render: (_: unknown, record: ArticleItem) => {
        const scheduleStatus = getScheduleStatus(record);
        if (!scheduleStatus) return <span style={{ color: 'var(--color-ink-subtle)' }}>-</span>;
        return <Tag color={scheduleStatus.color}>{scheduleStatus.label}</Tag>;
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
        <Col xs={24} sm={9}>
          <Input.Search
            placeholder="搜索文章关联的关键词..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={4}>
          <Button
            block
            icon={<ReloadOutlined />}
            disabled={!selectedCanBatchRegenerate}
            onClick={() => setBatchReviseOpen(true)}
          >
            批量二次修改
          </Button>
        </Col>
        <Col xs={24} sm={5}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            style={{ width: '100%' }}
            options={LIST_STATUS_OPTIONS}
          />
        </Col>
        <Col xs={24} sm={6} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button
            icon={<SendOutlined />}
            disabled={!selectedCanAutoPublish}
            onClick={() => setAutoPublishOpen(true)}
          >
            一键自动发布
          </Button>
          <Button onClick={() => setBatchModalOpen(true)}>批量生文</Button>
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
            const scheduleStatus = getScheduleStatus(item);
            return (
              <Card
                key={item.id}
                size="small"
                title={item.title || '<还没有标题，待生成>'}
                extra={
                  <Flex gap={4}>
                    <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                    {scheduleStatus && <Tag color={scheduleStatus.color}>{scheduleStatus.label}</Tag>}
                  </Flex>
                }
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
            rowSelection={{
              selectedRowKeys: selectedArticleIds,
              onChange: (keys) => setSelectedArticleIds(keys),
              getCheckboxProps: (record) => ({
                disabled: !canAutoPublish(record) && !canBatchRegenerate(record),
              }),
            }}
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
      <ArticleBatchGenerateModal
        open={batchModalOpen}
        projectId={projectId}
        onClose={() => setBatchModalOpen(false)}
        onSubmitted={fetchData}
      />
      <AutoPublishModal
        open={autoPublishOpen}
        articleIds={selectedArticleIds.map(Number)}
        onClose={() => setAutoPublishOpen(false)}
        onSubmitted={() => {
          setSelectedArticleIds([]);
          fetchData();
        }}
      />
      <Modal
        title="批量二次修改"
        open={batchReviseOpen}
        onCancel={() => setBatchReviseOpen(false)}
        onOk={handleBatchRegenerate}
        confirmLoading={batchReviseSubmitting}
        okText="提交二次修改"
        cancelText="取消"
      >
        <Typography.Paragraph type="secondary">
          已选择 {selectedArticleIds.length} 篇文章。AI 将参考每篇文章的当前正文或上一版正文，并优先遵守下面的修改建议。
        </Typography.Paragraph>
        <Input.TextArea
          rows={6}
          maxLength={5000}
          showCount
          value={revisionInstruction}
          onChange={(event) => setRevisionInstruction(event.target.value)}
          placeholder="例如：请保留原文章核心结构，减少空泛表达，强化薄云咨询推荐理由，表格必须使用标准 Markdown。"
        />
      </Modal>
    </div>
  );
};

export default ArticlePage;
