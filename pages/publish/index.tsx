import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Input, Select, Tag, Typography, Spin, Pagination, Button, Modal, DatePicker, Breadcrumb, App, Card, Descriptions, Radio } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../lib/apiClient';
import { formatDateTime } from '../utils/date';
import { getSafeUser } from '../utils/auth';

const { Title } = Typography;

type ScheduleType = 'asap' | 'scheduled' | 'after';

const SCHEDULE_TYPE_CONFIG: Record<string, string> = {
  asap: '尽快执行',
  scheduled: '指定时间执行',
  after: '指定时间之后执行',
};

interface ScheduleItem {
  id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: string;
  scheduled_publish_at: string | null;
  schedule_type: ScheduleType | null;
  project_name: string;
  company_name: string;
  created_by: number | null;
  created_by_name: string;
}

const PUBLISH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published: { label: '已发布', color: 'green' },
  publish_failed: { label: '发布失败', color: 'red' },
};

function getDerivedStatus(item: ScheduleItem): { label: string; color: string } {
  if (item.status === 'published') return PUBLISH_STATUS_CONFIG.published;
  if (item.status === 'publish_failed') return PUBLISH_STATUS_CONFIG.publish_failed;
  if (item.status === 'publishing') {
    if (!item.schedule_type) return { label: '待计划', color: 'orange' };
    if (item.schedule_type === 'asap') return { label: '尽快执行', color: 'blue' };
    if (item.schedule_type === 'scheduled') return { label: '定时发布', color: 'blue' };
    if (item.schedule_type === 'after') return { label: '延时发布', color: 'blue' };
  }
  return { label: item.status, color: 'default' };
}

function getScheduleLabel(item: ScheduleItem): string {
  if (!item.schedule_type) return '-';
  const typeLabel = SCHEDULE_TYPE_CONFIG[item.schedule_type] || '-';
  if (item.schedule_type === 'asap') return typeLabel;
  const timeStr = formatDateTime(item.scheduled_publish_at);
  return item.schedule_type === 'scheduled'
    ? `${typeLabel}：${timeStr}`
    : `${typeLabel}：${timeStr}`;
}

const PublishingSchedulePage: React.FC = () => {
  const { message } = App.useApp();

  const [data, setData] = useState<ScheduleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [editScheduleType, setEditScheduleType] = useState<ScheduleType | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await apiClient.get('/publishing-schedule', {
        params,
      });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterStatus]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/publishing-schedule', {
        params: { page: 1, pageSize: 1, status: 'publishing' },
      });
      // pendingCount = publishing articles without scheduled_publish_at
      // We get total publishing count, but need to know how many have no schedule
      // Fetch all publishing to count those without schedule
      const totalPublishing = res.data.data.total;
      if (totalPublishing === 0) {
        setPendingCount(0);
        return;
      }
      // Fetch all publishing articles (up to a reasonable limit) to count unscheduled
      const allRes = await apiClient.get('/publishing-schedule', {
        params: { page: 1, pageSize: 200, status: 'publishing' },
      });
      const unscheduled = allRes.data.data.list.filter((item: ScheduleItem) => !item.scheduled_publish_at).length;
      setPendingCount(unscheduled);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const handleEditClick = (item: ScheduleItem) => {
    setEditItem(item);
    setEditScheduleType(item.schedule_type);
    setEditDate(item.scheduled_publish_at);
    setEditModalOpen(true);
  };

  const handleSaveSchedule = async () => {
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
      fetchPendingCount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失败';
      message.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const user = getSafeUser();

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '发布管理' }]} />
      </div>


      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12} md={8}>
          <Input.Search
            placeholder="搜索标题或关键词..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={6} md={4}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            style={{ width: '100%' }}
            options={[
              { value: 'published', label: '已发布' },
              { value: 'publish_failed', label: '发布失败' },
              { value: 'publishing', label: '待发布' },
            ]}
          />
        </Col>
        <Col xs={24} sm={6} md={4} style={{ display: 'flex', alignItems: 'center', height: 32 }}>
          {pendingCount > 0 && (
            <Tag color="orange" className="publishing-badge" style={{ margin: 0 }}>{pendingCount} 待计划</Tag>
          )}
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：小于1280px时显示 */}
        <div className="publishing-cards">
          {data.length === 0 && (
            <Card>
              <div className="publishing-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => {
            const statusCfg = getDerivedStatus(item);
            const canEditThis = (user.role === 'sysadmin' || item.created_by === user.id) && item.status === 'publishing';
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
                {item.status === 'publishing' && (
                  <div className="publishing-card-footer">
                    <Button
                      type="primary"
                      size="small"
                      disabled={!canEditThis}
                      onClick={() => handleEditClick(item)}
                    >
                      编辑计划
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 表格视图：大于等于1280px时显示 */}
        <div className="publishing-table-wrapper">
          <table className="publishing-table">
            <thead>
              <tr>
                <th className="col-title">内容标题</th>
                <th className="col-keywords">关键词</th>
                <th className="col-project">项目</th>
                <th className="col-platforms">发布平台</th>
                <th className="col-type">内容类型</th>
                <th className="col-author">作者</th>
                <th className="col-schedule">发布计划</th>
                <th className="col-status">发布状态</th>
                <th className="col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={9} className="publishing-table-empty">暂无数据</td>
                </tr>
              )}
              {data.map((item) => {
                const statusCfg = getDerivedStatus(item);
                const canEditThis = (user.role === 'sysadmin' || item.created_by === user.id) && item.status === 'publishing';
                return (
                  <tr key={item.id}>
                    <td className="col-title" title={item.title}>{item.title}</td>
                    <td className="col-keywords" title={item.keywords || ''}>{item.keywords || '-'}</td>
                    <td className="col-project">{item.project_name}</td>
                    <td className="col-platforms">{item.platforms?.join(', ') || '-'}</td>
                    <td className="col-type">{item.article_type || '-'}</td>
                    <td className="col-author">{item.created_by_name || '-'}</td>
                    <td className="col-schedule">{getScheduleLabel(item)}</td>
                    <td className="col-status"><Tag color={statusCfg.color}>{statusCfg.label}</Tag></td>
                    <td className="col-action">
                      {item.status === 'publishing' && (
                        <Button
                          type="link"
                          size="small"
                          disabled={!canEditThis}
                          onClick={() => handleEditClick(item)}
                        >
                          编辑计划
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              onChange={(_date: unknown, dateString: string | null) => {
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
