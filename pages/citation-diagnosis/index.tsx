import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Alert,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  CheckCircleOutlined,
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
  detection_run_count: number;
  citation_record_count: number;
  last_detection_at: string | null;
}

interface PublishedLinkDetail {
  id: number;
  platform_name: string | null;
  url: string | null;
  domain: string | null;
  updated_at: string | null;
}

interface CitationMarkDetail {
  id: number;
  model_name: string;
  first_matched_at: string | null;
  last_matched_at: string | null;
  match_count: number;
}

interface CitationRecordDetail {
  id: number;
  model_name: string;
  source_url: string | null;
  source_title: string | null;
  answer_snippet: string | null;
  citation_snippet: string | null;
  domain: string | null;
  matched: boolean;
  created_at: string | null;
}

interface DetectionRunDetail {
  id: number;
  model_name: string;
  prompt: string | null;
  answer: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  matched_count: number;
  records: CitationRecordDetail[];
}

interface LedgerDetail {
  published_links: PublishedLinkDetail[];
  citation_marks: CitationMarkDetail[];
  detection_runs: DetectionRunDetail[];
  summary: {
    published_link_count: number;
    detection_run_count: number;
    record_count: number;
    matched_count: number;
    citation_models: string[];
  };
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

function detectionSummary(row: LedgerRow) {
  if (!row.publish_link) return <Tag color="warning">待补链接</Tag>;
  if (!row.detection_run_count) return <Tag>待检测</Tag>;
  return (
    <Space direction="vertical" size={2}>
      <Tag color="processing">已检测 {row.detection_run_count} 轮</Tag>
      <Typography.Text type="secondary">{row.citation_record_count || 0} 条来源</Typography.Text>
    </Space>
  );
}

function statusTag(status: string) {
  const label = STATUS_LABELS[status] || status || '-';
  const color = status === 'published' ? 'success' : status === 'publish_failed' ? 'error' : 'default';
  return <Tag color={color}>{label}</Tag>;
}

function shortText(value: string | null | undefined, max = 120): string {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function renderLink(value: string | null | undefined, text?: string, emptyText = '待补发布链接') {
  if (!value) return <Tag color="warning">{emptyText}</Tag>;
  return (
    <Typography.Link href={value} target="_blank" rel="noreferrer" ellipsis>
      <LinkOutlined /> {text || value}
    </Typography.Link>
  );
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvValue(row: LedgerRow, key: keyof LedgerRow | 'citation_summary' | 'detection_summary') {
  if (key === 'published_at') return formatDateTime(row.published_at);
  if (key === 'citation_models') return row.citation_models.join('、');
  if (key === 'citation_summary') {
    return row.citation_models.length > 0 ? `被 ${row.citation_models.join('、')} 引用` : '暂无';
  }
  if (key === 'detection_summary') {
    if (!row.publish_link) return '待补发布链接';
    if (!row.detection_run_count) return '待检测';
    return `已检测 ${row.detection_run_count} 轮，${row.citation_record_count || 0} 条来源`;
  }
  if (key === 'status') return STATUS_LABELS[row.status] || row.status || '';
  return row[key as keyof LedgerRow] ?? '';
}

const csvColumns: Array<{ title: string; key: keyof LedgerRow | 'citation_summary' | 'detection_summary' }> = [
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
  { title: '检测情况', key: 'detection_summary' },
  { title: '检测轮次', key: 'detection_run_count' },
  { title: '引用来源数', key: 'citation_record_count' },
  { title: '最近检测时间', key: 'last_detection_at' },
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
  const [detail, setDetail] = useState<LedgerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 8,
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

  const openDetail = async (record: LedgerRow) => {
    setSelectedRow(record);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/citation-diagnosis/ledger/${record.article_id}/details`);
      setDetail(res.data.data || null);
    } catch (err: unknown) {
      setDetailError(getApiErrorMessage(err, '暂无检测详情'));
    } finally {
      setDetailLoading(false);
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
      link.download = `引用诊断台账-${formatDate(new Date().toISOString())}.csv`;
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
      width: 138,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '发布平台',
      dataIndex: 'publish_platform',
      width: 120,
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
      width: 200,
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
      width: 210,
      ellipsis: true,
      render: (value: string | null) => renderLink(value),
    },
    {
      title: '检测情况',
      key: 'detection_summary',
      width: 150,
      render: (_value, record) => detectionSummary(record),
    },
    {
      title: '引用模型',
      dataIndex: 'citation_models',
      width: 170,
      render: (models: string[]) => citationSummary(models),
    },
    {
      title: '命中次数',
      dataIndex: 'citation_match_count',
      width: 92,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value || 0}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 88,
      render: (_value, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
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
    { key: 'detection_summary', label: '检测情况', children: detectionSummary(selectedRow) },
    {
      key: 'last_detection_at',
      label: '最近检测时间',
      children: selectedRow.last_detection_at ? formatDateTime(selectedRow.last_detection_at) : '-',
    },
    {
      key: 'citation_models',
      label: '引用模型',
      children: selectedRow.citation_models.length > 0
        ? selectedRow.citation_models.map((model) => <Tag key={model} color="success">{model}</Tag>)
        : <Tag>暂无</Tag>,
    },
    { key: 'citation_match_count', label: '命中次数', children: selectedRow.citation_match_count },
  ] : [];

  const citedCount = rows.filter((row) => row.citation_models.length > 0 || row.citation_match_count > 0).length;
  const detectedCount = rows.filter((row) => Number(row.detection_run_count || 0) > 0).length;
  const pendingLinkCount = rows.filter((row) => !row.publish_link).length;
  const totalMatches = rows.reduce((sum, row) => sum + Number(row.citation_match_count || 0), 0);
  const hasDetail = Boolean(detail && (
    detail.detection_runs.length > 0 ||
    detail.citation_marks.length > 0 ||
    detail.published_links.length > 0
  ));

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '检测台账' }]} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 12, flexShrink: 0 }}>
        <Card size="small" style={{ flex: 1, minWidth: 180 }}>
          <Statistic title="当前页已引用文章" value={citedCount} suffix={`/ ${rows.length}`} />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 180 }}>
          <Statistic title="当前页命中次数" value={totalMatches} />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 180 }}>
          <Statistic title="当前页已检测文章" value={detectedCount} suffix={`/ ${rows.length}`} />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 180 }}>
          <Statistic title="待补发布链接" value={pendingLinkCount} />
        </Card>
      </Row>

      <Space style={{ marginBottom: 12, flexShrink: 0 }} wrap>
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
          pageSizeOptions: [6, 8, 10, 20],
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        style={{ flex: 1, minHeight: 0 }}
        locale={{ emptyText: <Empty description="暂无发布台账数据" /> }}
      />

      <Drawer
        title={selectedRow ? `检测详情：${selectedRow.article_title}` : '检测详情'}
        width={860}
        open={Boolean(selectedRow)}
        onClose={() => {
          setSelectedRow(null);
          setDetail(null);
          setDetailError(null);
        }}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={1} items={detailItems} />

          {detailError && (
            <Alert
              type="warning"
              showIcon
              message="暂无检测详情"
              description={detailError}
            />
          )}

          {detailLoading ? (
            <Card size="small" loading />
          ) : hasDetail ? (
            <>
              <Row gutter={[12, 12]}>
                <Card size="small" style={{ flex: 1, minWidth: 150 }}>
                  <Statistic title="检测轮次" value={detail?.summary.detection_run_count || 0} />
                </Card>
                <Card size="small" style={{ flex: 1, minWidth: 150 }}>
                  <Statistic title="引用来源" value={detail?.summary.record_count || 0} />
                </Card>
                <Card size="small" style={{ flex: 1, minWidth: 150 }}>
                  <Statistic title="累计命中" value={detail?.summary.matched_count || 0} />
                </Card>
              </Row>

              <Card size="small" title="发布链接">
                {detail?.published_links.length ? (
                  <List
                    size="small"
                    dataSource={detail.published_links}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag>{item.platform_name || item.domain || '发布来源'}</Tag>
                            <Typography.Text type="secondary">{formatDateTime(item.updated_at)}</Typography.Text>
                          </Space>
                          {renderLink(item.url)}
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="暂无发布链接" />
                )}
              </Card>

              <Card size="small" title="引用模型">
                {detail?.citation_marks.length ? (
                  <List
                    size="small"
                    dataSource={detail.citation_marks}
                    renderItem={(item) => (
                      <List.Item>
                        <Space wrap>
                          <Tag color="success" icon={<CheckCircleOutlined />}>{item.model_name}</Tag>
                          <Typography.Text>命中 {item.match_count || 0} 次</Typography.Text>
                          <Typography.Text type="secondary">
                            最近命中：{formatDateTime(item.last_matched_at)}
                          </Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="暂无引用模型" />
                )}
              </Card>

              <Card size="small" title="检测问题、AI 回答与引用来源">
                {detail?.detection_runs.length ? (
                  <List
                    size="small"
                    dataSource={detail.detection_runs}
                    renderItem={(run) => (
                      <List.Item>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color={run.matched_count > 0 ? 'success' : 'default'}>{run.model_name}</Tag>
                            <Typography.Text type="secondary">{formatDateTime(run.created_at)}</Typography.Text>
                            <Typography.Text>本轮命中 {run.matched_count || 0} 次</Typography.Text>
                          </Space>
                          <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="检测问题">{run.prompt || '暂无检测问题'}</Descriptions.Item>
                            <Descriptions.Item label="AI 回答">{shortText(run.answer, 500)}</Descriptions.Item>
                          </Descriptions>
                          {run.records.length ? (
                            <List
                              size="small"
                              dataSource={run.records}
                              renderItem={(record) => (
                                <List.Item>
                                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Space wrap>
                                      <Tag color={record.matched ? 'success' : 'default'}>
                                        {record.matched ? '已命中' : '未命中'}
                                      </Tag>
                                      <Typography.Text strong>{record.source_title || record.domain || '引用来源'}</Typography.Text>
                                      {record.source_url && renderLink(record.source_url, record.domain || '查看来源', '暂无来源链接')}
                                    </Space>
                                    <Typography.Text type="secondary">
                                      引用来源：{shortText(record.citation_snippet, 220)}
                                    </Typography.Text>
                                    <Typography.Text>
                                      命中片段：{shortText(record.answer_snippet, 220)}
                                    </Typography.Text>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          ) : (
                            <Empty description="暂无引用来源" />
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="暂无检测详情" />
                )}
              </Card>
            </>
          ) : (
            <Empty description="暂无检测详情" />
          )}
        </Space>
      </Drawer>
    </div>
  );
};

export default CitationDiagnosisPage;
