import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Input, Select, Tag, Typography, Spin, Pagination, Button, Modal, DatePicker, Breadcrumb, App, Card, Descriptions, Radio, Tooltip, Popconfirm, Form, Empty, Table } from 'antd';
import { PlusOutlined, EditOutlined, RollbackOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../lib/apiClient';
import { formatDateTime } from '../utils/date';
import { getSafeUser } from '../utils/auth';
import { getApiErrorMessage } from '../utils/error';
import { useAppContext } from '../context/AppContext';

const { Title } = Typography;

type ScheduleType = 'asap' | 'scheduled' | 'after';
type ScheduleStatus = 'pending' | 'publishing' | 'published' | 'publish_failed';

const SCHEDULE_TYPE_CONFIG: Record<string, string> = {
  asap: '尽快执行',
  scheduled: '指定时间执行',
  after: '指定时间之后执行',
};

const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string }> = {
  pending: { label: '待发布', color: 'orange' },
  publishing: { label: '发布中', color: 'processing' },
  published: { label: '已发布', color: 'green' },
  publish_failed: { label: '发布失败', color: 'red' },
};

interface ScheduleItem {
  id: number;
  article_id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: ScheduleStatus;
  schedule_type: ScheduleType | null;
  scheduled_publish_at: string | null;
  project_id: number;
  project_name: string;
  company_name: string;
  created_by: number | null;
  created_by_name: string;
}

interface ArticleOption {
  id: number;
  title: string;
  keywords: string | null;
  project_id: number;
}

function getScheduleLabel(item: ScheduleItem): string {
  if (!item.schedule_type) return '-';
  const typeLabel = SCHEDULE_TYPE_CONFIG[item.schedule_type] || '-';
  if (item.schedule_type === 'asap') return typeLabel;
  const timeStr = formatDateTime(item.scheduled_publish_at);
  return `${typeLabel}：${timeStr}`;
}

const PublishingSchedulePage: React.FC = () => {
  const { message } = App.useApp();
  const { projectId } = useAppContext();
  const user = getSafeUser();

  const [data, setData] = useState<ScheduleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [articleOptions, setArticleOptions] = useState<ArticleOption[]>([]);
  const [articleLoading, setArticleLoading] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [createScheduleType, setCreateScheduleType] = useState<ScheduleType>('asap');
  const [createDate, setCreateDate] = useState<string | null>(null);

  // Platform options for create modal
  const [platformOptions, setPlatformOptions] = useState<{ label: string; value: string }[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [editScheduleType, setEditScheduleType] = useState<ScheduleType | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Reject/delete loading state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (projectId) params.projectId = projectId;
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await apiClient.get('/publishing-schedule', { params });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch (err) {
      message.error(getApiErrorMessage(err, '获取发布计划列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterStatus, projectId, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPublishableArticles = useCallback(async () => {
    setArticleLoading(true);
    try {
      const params: Record<string, unknown> = { page: 1, pageSize: 200, status: 'approved' };
      if (projectId) params.projectId = projectId;
      const res = await apiClient.get('/publishing-schedule/articles', { params });
      const articles: ArticleOption[] = (res.data.data.list || []).map((a: Record<string, unknown>) => ({
        id: a.id as number,
        title: (a.title as string) || '<无标题>',
        keywords: a.keywords as string | null,
        project_id: a.project_id as number,
      }));
      setArticleOptions(articles);
    } catch {
      setArticleOptions([]);
    } finally {
      setArticleLoading(false);
    }
  }, [projectId]);

  const fetchPlatformOptions = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const res = await apiClient.get('/publishing-platforms', { params: { page: 1, pageSize: 100 } });
      const list = res.data.data.list || res.data.data || [];
      setPlatformOptions(list.map((p: any) => ({ label: `${p.name} (${p.taxonomy})`, value: p.name })));
    } catch {
      setPlatformOptions([]);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  const handleOpenCreate = () => {
    setSelectedArticleId(null);
    setSelectedPlatforms([]);
    setCreateScheduleType('asap');
    setCreateDate(null);
    setCreateModalOpen(true);
    fetchPublishableArticles();
    fetchPlatformOptions();
  };

  const handleCreate = async () => {
    if (createSaving) return;
    if (!selectedArticleId) {
      message.warning('请选择文章');
      return;
    }
    if (selectedPlatforms.length === 0) {
      message.warning('请选择发布平台');
      return;
    }
    if ((createScheduleType === 'scheduled' || createScheduleType === 'after') && !createDate) {
      message.warning('请选择时间');
      return;
    }
    setCreateSaving(true);
    try {
      await apiClient.post('/publishing-schedule', {
        article_id: selectedArticleId,
        platforms: selectedPlatforms,
        schedule_type: createScheduleType,
        scheduled_publish_at: createScheduleType === 'asap' ? null : createDate,
      });
      message.success('发布计划已创建');
      setCreateModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '创建失败'));
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditClick = (item: ScheduleItem) => {
    setEditItem(item);
    setEditScheduleType(item.schedule_type);
    setEditDate(item.scheduled_publish_at);
    setEditModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (editSaving) return;
    if (!editItem) return;
    if (!editScheduleType) {
      message.warning('请选择发布计划类型');
      return;
    }
    if ((editScheduleType === 'scheduled' || editScheduleType === 'after') && !editDate) {
      message.warning('请选择时间');
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, string | null> = {
        schedule_type: editScheduleType,
        scheduled_publish_at: editScheduleType === 'asap' ? null : editDate,
      };
      await apiClient.put(`/publishing-schedule/${editItem.id}`, body);
      message.success('发布计划已更新');
      setEditModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '更新失败'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleReject = async (id: number) => {
    setRejectingId(id);
    try {
      await apiClient.put(`/publishing-schedule/${id}/reject`);
      message.success('已驳回');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '驳回失败'));
    } finally {
      setRejectingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/publishing-schedule/${id}`);
      message.success('已删除');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '删除失败'));
    } finally {
      setDeletingId(null);
    }
  };

  const canEditSchedule = (item: ScheduleItem) => {
    if (user.role === 'view') return false;
    return item.status === 'pending' && (user.role === 'sysadmin' || item.created_by === user.id);
  };

  const canRejectSchedule = (item: ScheduleItem) => {
    if (user.role === 'view') return false;
    return (item.status === 'pending' || item.status === 'publishing') && item.created_by !== user.id;
  };

  const canDeleteSchedule = (item: ScheduleItem) => {
    if (user.role === 'view') return false;
    return (item.status === 'pending' || item.status === 'publish_failed') && (user.role === 'sysadmin' || item.created_by === user.id);
  };

  const tableColumns = [
    {
      title: '内容标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: true,
      render: (text: string | null) => text || '-',
    },
    {
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '发布平台',
      key: 'platforms',
      render: (_: unknown, record: ScheduleItem) => record.platforms?.join(', ') || '-',
    },
    {
      title: '发布计划',
      key: 'schedule',
      render: (_: unknown, record: ScheduleItem) => getScheduleLabel(record),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ScheduleStatus) => {
        const cfg = SCHEDULE_STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ScheduleItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {canEditSchedule(record) && (
            <Tooltip title="编辑计划">
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(record)} />
            </Tooltip>
          )}
          {canRejectSchedule(record) && (
            <Popconfirm title="确认驳回？" onConfirm={() => handleReject(record.id)} okText="确定" cancelText="取消">
              <Tooltip title="驳回">
                <Button type="link" danger size="small" loading={rejectingId === record.id} icon={<RollbackOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          {canDeleteSchedule(record) && (
            <Popconfirm title="确认删除此发布计划？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Tooltip title="删除">
                <Button type="link" danger size="small" loading={deletingId === record.id} icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container publishing-page">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '发布管理' }]} />
      </div>

      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索标题或关键词..."
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
            options={Object.entries(SCHEDULE_STATUS_CONFIG).map(([value, { label }]) => ({ value, label }))}
          />
        </Col>
        <Col xs={24} sm={6} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>新建发布计划</Button>
        </Col>
      </Row>

      <div className="publishing-content-area">
        <Spin spinning={loading}>
          {/* 卡片视图：小于1280px时显示 */}
          <div className="publishing-cards">
            {data.length === 0 && (
              <Card>
                <div className="publishing-cards-empty">暂无数据</div>
              </Card>
            )}
            {data.map((item) => {
              const statusCfg = SCHEDULE_STATUS_CONFIG[item.status] || { label: item.status, color: 'default' };
              return (
                <Card key={item.id} size="small" title={item.title} extra={<Tag color={statusCfg.color}>{statusCfg.label}</Tag>}>
                  <Descriptions column={2} size="small" colon={false}>
                    <Descriptions.Item label="关键词">{item.keywords || '-'}</Descriptions.Item>
                    <Descriptions.Item label="项目">{item.project_name}</Descriptions.Item>
                    <Descriptions.Item label="发布平台">{item.platforms?.join(', ') || '-'}</Descriptions.Item>
                    <Descriptions.Item label="内容类型">{item.article_type || '-'}</Descriptions.Item>
                    <Descriptions.Item label="作者">{item.created_by_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="发布计划">{getScheduleLabel(item)}</Descriptions.Item>
                  </Descriptions>
                  <div className="publishing-card-footer">
                    {canEditSchedule(item) && (
                      <Tooltip title="编辑计划">
                        <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(item)} />
                      </Tooltip>
                    )}
                    {canRejectSchedule(item) && (
                      <Popconfirm title="确认驳回" description="驳回后发布计划将标记为失败" onConfirm={() => handleReject(item.id)} okText="确定" cancelText="取消">
                        <Tooltip title="驳回">
                          <Button danger size="small" loading={rejectingId === item.id} icon={<RollbackOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                    {canDeleteSchedule(item) && (
                      <Popconfirm title="确认删除？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
                        <Tooltip title="删除">
                          <Button danger size="small" loading={deletingId === item.id} icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 表格视图：大于等于1280px时显示 */}
          <div className="publishing-table-wrapper">
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
      </div>

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

      {/* 新建发布计划弹窗 */}
      <Modal
        title="新建发布计划"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createSaving}
        okText="创建"
        cancelText="取消"
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择文章 <span style={{ color: 'red' }}>*</span></div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="选择已审核通过的文章"
              value={selectedArticleId}
              onChange={setSelectedArticleId}
              loading={articleLoading}
              optionFilterProp="label"
              options={articleOptions.map(a => ({
                value: a.id,
                label: `${a.title}${a.keywords ? ` (${a.keywords})` : ''}`,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择发布平台 <span style={{ color: 'red' }}>*</span></div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择发布平台"
              value={selectedPlatforms}
              onChange={setSelectedPlatforms}
              loading={platformLoading}
              options={platformOptions}
              maxTagCount={5}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>发布策略 <span style={{ color: 'red' }}>*</span></div>
            <Radio.Group
              value={createScheduleType}
              onChange={(e) => setCreateScheduleType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="asap">尽快执行</Radio.Button>
              <Radio.Button value="scheduled">指定时间执行</Radio.Button>
              <Radio.Button value="after">指定时间之后执行</Radio.Button>
            </Radio.Group>
          </div>
          {(createScheduleType === 'scheduled' || createScheduleType === 'after') && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                {createScheduleType === 'scheduled' ? '指定发布时间' : '在此时间之后执行'}
              </div>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={createDate ? dayjs(createDate) : null}
                onChange={(_date: Dayjs | null, dateString: string | null) => {
                  setCreateDate(dateString || null);
                }}
                format="YYYY-MM-DD HH:mm"
                placeholder="选择时间"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* 编辑发布计划弹窗 */}
      <Modal
        title="编辑发布计划"
        open={editModalOpen}
        onOk={handleSaveSchedule}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={editSaving}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>发布计划类型</div>
          <Radio.Group
            value={editScheduleType}
            onChange={(e) => setEditScheduleType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="asap">尽快执行</Radio.Button>
            <Radio.Button value="scheduled">指定时间执行</Radio.Button>
            <Radio.Button value="after">指定时间之后执行</Radio.Button>
          </Radio.Group>
        </div>
        {(editScheduleType === 'scheduled' || editScheduleType === 'after') && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              {editScheduleType === 'scheduled' ? '指定发布时间' : '在此时间之后执行'}
            </div>
            <DatePicker
              showTime
              style={{ width: '100%' }}
              value={editDate ? dayjs(editDate) : null}
              onChange={(_date: Dayjs | null, dateString: string | null) => {
                setEditDate(dateString || null);
              }}
              format="YYYY-MM-DD HH:mm"
              placeholder="选择时间"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublishingSchedulePage;
