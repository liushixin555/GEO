import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  DownloadOutlined,
  EyeOutlined,
  LinkOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { useAppContext } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/date';
import { getApiErrorMessage } from '../utils/error';

interface LedgerRow {
  article_id: number;
  published_at: string | null;
  publish_platform: string | null;
  article_title: string;
  topic_words: string | null;
  semantic_tags: string | null;
  article_type: string | null;
  publish_channel_type: string | null;
  publish_link: string | null;
  publisher: string | null;
  status: string;
  citation_models: string[];
  citation_match_count: number;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待发布',
  publishing: '发布中',
  published: '已发布',
  publish_failed: '发布失败',
};

function splitTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,，、\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function renderTagList(value: string | null | undefined, color?: string) {
  const tags = splitTags(value);
  if (tags.length === 0) return <Typography.Text type="secondary">-</Typography.Text>;
  return tags.map((tag) => (
    <Tag key={tag} color={color}>
      {tag}
    </Tag>
  ));
}

function citationSummary(models: string[]) {
  if (!models || models.length === 0) return <Tag>暂无</Tag>;
  if (models.length === 1) return <Tag color="success">被 {models[0]} 引用</Tag>;
  return <Tag color="success">被多个模型引用</Tag>;
}

function statusTag(status: string) {
  const label = STATUS_LABELS[status] || status || '-';
  const color = status === 'published' ? 'success' : status === 'publish_failed' ? 'error' : 'default';
  return <Tag color={color}>{label}</Tag>;
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvValue(row: LedgerRow, key: keyof LedgerRow | 'citation_summary') {
  if (key === 'published_at') return formatDateTime(row.published_at);
  if (key === 'citation_models') return row.citation_models.join('、');
  if (key === 'citation_summary') {
    return row.citation_models.length > 0 ? `被 ${row.citation_models.join('、')} 引用` : '暂无';
  }
  if (key === 'status') return STATUS_LABELS[row.status] || row.status || '';
  return row[key as keyof LedgerRow] ?? '';
}

const csvColumns: Array<{ title: string; key: keyof LedgerRow | 'citation_summary' }> = [
  { title: '发布时间', key: 'published_at' },
  { title: '发布平台', key: 'publish_platform' },
  { title: '文章标题', key: 'article_title' },
  { title: '主题词', key: 'topic_words' },
  { title: '语义标签', key: 'semantic_tags' },
  { title: '文章类型', key: 'article_type' },
  { title: '发布渠道类型', key: 'publish_channel_type' },
  { title: '发布链接', key: 'publish_link' },
  { title: '发布人', key: 'publisher' },
  { title: '状态', key: 'status' },
  { title: '是否有被引用记录', key: 'citation_summary' },
  { title: '引用模型', key: 'citation_models' },
  { title: '命中次数', key: 'citation_match_count' },
];

const CitationDiagnosisPage: React.FC = () => {
  const { projectId } = useAppContext();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<LedgerRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const filterParams = useMemo(() => ({
    ...(projectId ? { projectId } : {}),
    ...(keyword.trim() ? { search: keyword.trim() } : {}),
    ...(status ? { status } : {}),
  }), [keyword, projectId, status]);

  const queryParams = useMemo(() => ({
    ...filterParams,
    page: pagination.current,
    pageSize: pagination.pageSize,
  }), [filterParams, pagination.current, pagination.pageSize]);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/citation-diagnosis/ledger', { params: queryParams });
      const data = res.data.data;
      setRows(data.list || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '获取引用诊断台账失败'));
    } finally {
      setLoading(false);
    }
  }, [message, queryParams]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (next: TablePaginationConfig) => {
    setPagination((prev) => ({
      ...prev,
      current: next.current || 1,
      pageSize: next.pageSize || prev.pageSize,
    }));
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      await apiClient.post('/citation-diagnosis/run-auto', {
        project_id: projectId || undefined,
        limit: 5,
        question_count: 1,
      });
      message.success('复检完成，已刷新台账');
      fetchLedger();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '执行复检失败'));
    } finally {
      setChecking(false);
    }
  };

  const fetchAllRowsForExport = async (): Promise<LedgerRow[]> => {
    const pageSize = 100;
    let page = 1;
    let total = 0;
    const result: LedgerRow[] = [];

    do {
      const res = await apiClient.get('/citation-diagnosis/ledger', {
        params: { ...filterParams, page, pageSize },
      });
      const data = res.data.data;
      const list = data.list || [];
      total = Number(data.total || 0);
      result.push(...list);
      page += 1;
    } while (result.length < total && page <= 100);

    return result;
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const exportRows = await fetchAllRowsForExport();
      const header = csvColumns.map((column) => csvEscape(column.title)).join(',');
      const body = exportRows
        .map((row) => csvColumns.map((column) => csvEscape(csvValue(row, column.key))).join(','))
        .join('\r\n');
      const csv = `\ufeff${header}\r\n${body}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `引用诊断台账-${formatDate(new Date())}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`已导出 ${exportRows.length} 条台账数据`);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '导出 CSV 失败'));
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<LedgerRow> = [
    {
      title: '发布时间',
      dataIndex: 'published_at',
      width: 140,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '发布平台',
      dataIndex: 'publish_platform',
      width: 130,
      ellipsis: true,
      render: (value: string | null) => value || '待补',
    },
    {
      title: '文章标题',
      dataIndex: 'article_title',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '主题词/标签',
      key: 'topic_and_tags',
      width: 230,
      render: (_value, record) => (
        <Space size={2} wrap>
          {renderTagList(record.topic_words)}
          {renderTagList(record.semantic_tags, 'blue')}
        </Space>
      ),
    },
    {
      title: '发布链接',
      dataIndex: 'publish_link',
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value ? (
        <Typography.Link href={value} target="_blank" rel="noreferrer" ellipsis>
          <LinkOutlined /> {value}
        </Typography.Link>
      ) : (
        <Tag color="warning">待补发布链接</Tag>
      ),
    },
    {
      title: '引用记录',
      dataIndex: 'citation_models',
      width: 170,
      render: (models: string[]) => citationSummary(models),
    },
    {
      title: '操作',
      key: 'action',
      width: 88,
      render: (_value, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedRow(record)}>
          详情
        </Button>
      ),
    },
  ];

  const detailItems = selectedRow ? [
    { key: 'published_at', label: '发布时间', children: formatDateTime(selectedRow.published_at) },
    { key: 'publish_platform', label: '发布平台', children: selectedRow.publish_platform || '待补' },
    { key: 'article_title', label: '文章标题', children: selectedRow.article_title },
    { key: 'topic_words', label: '主题词', children: renderTagList(selectedRow.topic_words) },
    { key: 'semantic_tags', label: '语义标签', children: renderTagList(selectedRow.semantic_tags, 'blue') },
    { key: 'article_type', label: '文章类型', children: selectedRow.article_type || '待补' },
    { key: 'publish_channel_type', label: '发布渠道类型', children: selectedRow.publish_channel_type || '待补' },
    {
      key: 'publish_link',
      label: '完整发布链接',
      children: selectedRow.publish_link ? (
        <Typography.Link href={selectedRow.publish_link} target="_blank" rel="noreferrer">
          {selectedRow.publish_link}
        </Typography.Link>
      ) : (
        <Tag color="warning">待补发布链接</Tag>
      ),
    },
    { key: 'publisher', label: '发布人', children: selectedRow.publisher || '-' },
    { key: 'status', label: '状态', children: statusTag(selectedRow.status) },
    {
      key: 'citation_models',
      label: '引用模型',
      children: selectedRow.citation_models.length > 0
        ? selectedRow.citation_models.map((model) => <Tag key={model} color="success">{model}</Tag>)
        : <Tag>暂无</Tag>,
    },
    { key: 'citation_match_count', label: '命中次数', children: selectedRow.citation_match_count },
  ] : [];

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '引用诊断隐藏后台' }]} />
      </div>

      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索标题、主题词、发布平台或链接"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 320 }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          value={status}
          onChange={setStatus}
          style={{ width: 160 }}
          options={[
            { label: '已发布', value: 'published' },
            { label: '待发布', value: 'pending' },
            { label: '发布中', value: 'publishing' },
            { label: '发布失败', value: 'publish_failed' },
          ]}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
        <Button icon={<ReloadOutlined />} onClick={fetchLedger}>刷新</Button>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportCsv}>导出 CSV</Button>
        <Button type="primary" icon={<SyncOutlined />} loading={checking} onClick={handleRecheck}>
          手动复检
        </Button>
      </Space>

      <Table
        rowKey={(record) => `${record.article_id}-${record.publish_link || record.article_title}`}
        size="small"
        tableLayout="fixed"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: '暂无发布台账数据' }}
      />

      <Drawer
        title="台账详情"
        width={720}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        destroyOnClose
      >
        <Descriptions bordered size="small" column={1} items={detailItems} />
      </Drawer>
    </div>
  );
};

export default CitationDiagnosisPage;
