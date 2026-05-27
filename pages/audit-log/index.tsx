import React, { useState, useCallback, useMemo } from 'react';
import { Row, Col, Input, Select, DatePicker, Table, Tag, Spin, Breadcrumb, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuditLogList, type AuditLogItem } from './hooks/useAuditLogList';
import { formatDateTime } from '../utils/date';

const { RangePicker } = DatePicker;

const LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  debug: { color: 'default', label: 'DEBUG' },
  info: { color: 'blue', label: 'INFO' },
  warn: { color: 'orange', label: 'WARN' },
  error: { color: 'red', label: 'ERROR' },
};

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

  const { list, total, loading, events, users, refresh } = useAuditLogList({
    page,
    pageSize,
    level,
    event,
    userId,
    startDate: dateRange?.[0],
    endDate: dateRange?.[1],
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleLevelChange = useCallback((value: string | undefined) => {
    setLevel(value);
    setPage(1);
  }, []);

  const handleEventChange = useCallback((value: string | undefined) => {
    setEvent(value);
    setPage(1);
  }, []);

  const handleUserChange = useCallback((value: number | undefined) => {
    setUserId(value);
    setPage(1);
  }, []);

  const handleDateRangeChange = useCallback((_: any, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange([dateStrings[0], dateStrings[1]]);
    } else {
      setDateRange(undefined);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  }, []);

  const columns: ColumnsType<AuditLogItem> = useMemo(() => [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v: string) => {
        const cfg = LEVEL_CONFIG[v] || LEVEL_CONFIG.info;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '事件',
      dataIndex: 'event',
      key: 'event',
      width: 200,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '请求',
      key: 'request',
      width: 200,
      render: (_: unknown, record: AuditLogItem) => {
        if (!record.method && !record.url) return '-';
        const parts: string[] = [];
        if (record.method) parts.push(record.method);
        if (record.url) parts.push(record.url.length > 30 ? record.url.slice(0, 30) + '...' : record.url);
        if (record.status) parts.push(String(record.status));
        return parts.join(' ');
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: number | null) => v != null ? `${v}ms` : '-',
    },
  ], []);

  const expandedRowRender = (record: AuditLogItem) => {
    const items: Array<{ label: string; value: string }> = [];
    items.push({ label: '事件', value: record.event });
    if (record.method) items.push({ label: '方法', value: record.method });
    if (record.url) items.push({ label: 'URL', value: record.url });
    if (record.status) items.push({ label: '状态码', value: String(record.status) });
    if (record.duration != null) items.push({ label: '耗时', value: `${record.duration}ms` });
    if (record.user_name) items.push({ label: '用户', value: record.user_name });
    if (record.ip) items.push({ label: 'IP', value: record.ip });
    if (record.metadata && typeof record.metadata === 'object') {
      for (const [k, v] of Object.entries(record.metadata)) {
        items.push({ label: k, value: typeof v === 'string' ? v : JSON.stringify(v) });
      }
    }
    return (
      <div style={{ padding: '8px 16px' }}>
        {items.map((item) => (
          <Row key={item.label} gutter={8} style={{ marginBottom: 4 }}>
            <Col span={4} style={{ textAlign: 'right', color: '#666' }}>{item.label}:</Col>
            <Col span={20} style={{ wordBreak: 'break-all' }}>{item.value}</Col>
          </Row>
        ))}
      </div>
    );
  };

  const eventOptions = useMemo(() =>
    events.map((e) => ({ value: e, label: e })),
  [events]);

  const userOptions = useMemo(() =>
    users.map((u) => ({ value: u.id, label: `${u.cn_name}(${u.username})` })),
  [users]);

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '日志管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={6}>
          <Input.Search
            placeholder="搜索事件/URL/IP..."
            allowClear
            onSearch={handleSearch}
          />
        </Col>
        <Col xs={24} sm={3}>
          <Select
            value={level}
            onChange={handleLevelChange}
            allowClear
            placeholder="全部级别"
            style={{ width: '100%' }}
            options={[
              { value: 'debug', label: 'DEBUG' },
              { value: 'info', label: 'INFO' },
              { value: 'warn', label: 'WARN' },
              { value: 'error', label: 'ERROR' },
            ]}
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={userId}
            onChange={handleUserChange}
            allowClear
            placeholder="全部用户"
            style={{ width: '100%' }}
            options={userOptions}
            showSearch
            optionFilterProp="label"
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={event}
            onChange={handleEventChange}
            allowClear
            placeholder="全部事件"
            style={{ width: '100%' }}
            options={eventOptions}
            showSearch
          />
        </Col>
        <Col xs={24} sm={7}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={handleDateRangeChange}
            placeholder={['开始日期', '结束日期']}
          />
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          size="middle"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: handlePageChange,
          }}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.metadata != null && Object.keys(record.metadata).length > 0,
          }}
          locale={{ emptyText: <Empty description="暂无日志数据" /> }}
        />
      </Spin>
    </div>
  );
};

export default AuditLogPage;
