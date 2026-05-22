import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Input, Select, Tag, Typography, Spin, Pagination, Button, Modal, DatePicker, Breadcrumb, App } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';

const { Title } = Typography;

interface ScheduleItem {
  id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: string;
  scheduled_publish_at: string | null;
  project_name: string;
  company_name: string;
}

const PUBLISH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published: { label: '已发布', color: 'green' },
  publish_failed: { label: '发布失败', color: 'red' },
};

function getDerivedStatus(item: ScheduleItem): { label: string; color: string } {
  if (item.status === 'published') return PUBLISH_STATUS_CONFIG.published;
  if (item.status === 'publish_failed') return PUBLISH_STATUS_CONFIG.publish_failed;
  // publishing status: derive from scheduled_publish_at
  if (item.status === 'publishing') {
    return item.scheduled_publish_at
      ? { label: '待定时发布', color: 'blue' }
      : { label: '待计划', color: 'orange' };
  }
  return { label: item.status, color: 'default' };
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
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
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get('/api/publishing-schedule', {
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
  }, [page, pageSize, search, filterStatus]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/publishing-schedule', {
        headers: { Authorization: `Bearer ${token}` },
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
      const allRes = await axios.get('/api/publishing-schedule', {
        headers: { Authorization: `Bearer ${token}` },
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
    setEditDate(item.scheduled_publish_at);
    setEditModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/publishing-schedule/${editItem.id}`, {
        scheduled_publish_at: editDate,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('发布计划已更新');
      setEditModalOpen(false);
      fetchData();
      fetchPendingCount();
    } catch (err: any) {
      message.error(err.response?.data?.message || '更新失败');
    } finally {
      setEditSaving(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = user.role === 'sysadmin' || user.role === 'admin';

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
        <div className="publishing-table-wrapper">
          <table className="publishing-table">
            <thead>
              <tr>
                <th className="col-title">内容标题</th>
                <th className="col-keywords">关键词</th>
                <th className="col-project">项目</th>
                <th className="col-platforms">发布平台</th>
                <th className="col-type">内容类型</th>
                <th className="col-schedule">计划发布时间</th>
                <th className="col-status">发布状态</th>
                <th className="col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="publishing-table-empty">暂无数据</td>
                </tr>
              )}
              {data.map((item) => {
                const statusCfg = getDerivedStatus(item);
                return (
                  <tr key={item.id}>
                    <td className="col-title" title={item.title}>{item.title}</td>
                    <td className="col-keywords" title={item.keywords || ''}>{item.keywords || '-'}</td>
                    <td className="col-project">{item.project_name}</td>
                    <td className="col-platforms">{item.platforms?.join(', ') || '-'}</td>
                    <td className="col-type">{item.article_type || '-'}</td>
                    <td className="col-schedule">{formatDate(item.scheduled_publish_at)}</td>
                    <td className="col-status"><Tag color={statusCfg.color}>{statusCfg.label}</Tag></td>
                    <td className="col-action">
                      {canEdit && item.status === 'publishing' && (
                        <Button type="link" size="small" onClick={() => handleEditClick(item)}>
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
          <div style={{ marginBottom: 8, fontWeight: 500 }}>计划发布时间</div>
          <DatePicker
            showTime
            style={{ width: '100%' }}
            value={editDate ? dayjs(editDate) : null}
            onChange={(_date: any, dateString: string | null) => {
              setEditDate(dateString || null);
            }}
            format="YYYY-MM-DD HH:mm"
            placeholder="选择计划发布时间"
          />
        </div>
      </Modal>
    </div>
  );
};

export default PublishingSchedulePage;
