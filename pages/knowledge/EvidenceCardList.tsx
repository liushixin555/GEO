import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  App,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Flex,
  Input,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  EVIDENCE_ARTICLE_TYPE_OPTIONS,
  EVIDENCE_STATUS_OPTIONS,
  EVIDENCE_TYPE_OPTIONS,
  SOURCE_QUALITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  type EvidenceCard,
  type EvidenceArticleType,
  type EvidenceCardSourceType,
  type EvidenceCardStatus,
  type EvidenceCardType,
  type EvidenceSourceQuality,
} from '../article/types';
import { formatDateTime } from '../utils/date';
import { useEvidenceCards } from './hooks/useEvidenceCards';

const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const statusLabel = Object.fromEntries(EVIDENCE_STATUS_OPTIONS.map(item => [item.value, item.label]));
const sourceQualityLabel = Object.fromEntries(SOURCE_QUALITY_OPTIONS.map(item => [item.value, item.label]));
const evidenceCardStatuses = new Set(EVIDENCE_STATUS_OPTIONS.map(item => item.value));

function getInitialStatus(value: string | null): EvidenceCardStatus | undefined {
  return value && evidenceCardStatuses.has(value as EvidenceCardStatus) ? value as EvidenceCardStatus : undefined;
}

const EvidenceCardList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const { loading, listEvidenceCards, deleteEvidenceCard } = useEvidenceCards();
  const [data, setData] = useState<EvidenceCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceCardType | undefined>();
  const [sourceType, setSourceType] = useState<EvidenceCardSourceType | undefined>();
  const [status, setStatus] = useState<EvidenceCardStatus | undefined>(() => getInitialStatus(searchParams.get('status')));
  const [sourceQuality, setSourceQuality] = useState<EvidenceSourceQuality | undefined>();
  const [articleType, setArticleType] = useState<EvidenceArticleType | undefined>();
  const pageSize = 10;
  const visibleStats = useMemo(() => ({
    total,
    verified: data.filter(item => item.status === 'verified').length,
    draft: data.filter(item => item.status === 'draft').length,
    deprecated: data.filter(item => item.status === 'deprecated').length,
    injected: data.reduce((sum, item) => sum + (item.injectedCount ?? 0), 0),
  }), [data, total]);

  const fetchData = useCallback(async () => {
    const result = await listEvidenceCards({
      page,
      pageSize,
      search,
      evidenceType,
      sourceType,
      status,
      sourceQuality,
      articleType,
    });
    setData(result.list);
    setTotal(result.total);
  }, [articleType, evidenceType, listEvidenceCards, page, search, sourceQuality, sourceType, status]);

  useEffect(() => {
    fetchData().catch(() => message.error('加载证据卡片失败'));
  }, [fetchData, message]);

  const handleDelete = async (id: number) => {
    try {
      await deleteEvidenceCard(id);
      message.success('证据卡片已删除');
      fetchData();
    } catch {
      message.error('删除证据卡片失败');
    }
  };

  const columns: ColumnsType<EvidenceCard> = useMemo(() => [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: true },
      render: (text: string, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/knowledge/evidence-cards/${record.id}`)} style={{ padding: 0 }}>
          {text}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value: EvidenceCardStatus) => (
        <Tag color={value === 'verified' ? 'green' : value === 'deprecated' ? 'red' : 'default'}>
          {statusLabel[value] ?? value}
        </Tag>
      ),
    },
    {
      title: '证据类型',
      dataIndex: 'evidenceType',
      key: 'evidenceType',
      width: 110,
      render: (value: EvidenceCardType) => <Tag color="blue">{evidenceTypeLabel[value] ?? value}</Tag>,
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 110,
      render: (value: EvidenceCardSourceType) => <Tag>{sourceTypeLabel[value] ?? value}</Tag>,
    },
    {
      title: 'sourceId',
      dataIndex: 'sourceId',
      key: 'sourceId',
      width: 90,
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'sourceUrl',
      dataIndex: 'sourceUrl',
      key: 'sourceUrl',
      width: 160,
      ellipsis: { showTitle: true },
      render: (value: string | null) => value || '-',
    },
    {
      title: '来源质量',
      dataIndex: 'sourceQuality',
      key: 'sourceQuality',
      width: 110,
      render: (value: EvidenceSourceQuality) => <Tag color="cyan">{sourceQualityLabel[value] ?? value}</Tag>,
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: { showTitle: true },
      render: (keywords: string[]) => keywords?.length ? keywords.slice(0, 4).map(item => <Tag key={item}>{item}</Tag>) : '-',
    },
    {
      title: '可信度',
      dataIndex: 'confidenceScore',
      key: 'confidenceScore',
      width: 90,
      render: (value: number | null) => value ?? '-',
    },
    {
      title: '新鲜度',
      dataIndex: 'freshnessScore',
      key: 'freshnessScore',
      width: 90,
      render: (value: number | null) => value ?? '-',
    },
    {
      title: '注入次数',
      dataIndex: 'injectedCount',
      key: 'injectedCount',
      width: 90,
      render: (value: number | undefined) => value ?? 0,
    },
    {
      title: '最近注入',
      dataIndex: 'lastInjectedAt',
      key: 'lastInjectedAt',
      width: 160,
      render: (value: string | null | undefined) => value ? formatDateTime(value) : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/knowledge/evidence-cards/${record.id}?mode=edit`)} />
          <Popconfirm title="确认删除此证据卡片？" okText="删除" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ], [navigate]);

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <Button type="link" onClick={() => navigate('/knowledge')} style={{ padding: 0 }}>AI知识库</Button> },
          { title: '证据卡片' },
        ]} />
      </div>

      <Flex align="center" justify="space-between" gap={16} wrap="wrap" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 400 }}>证据卡片</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/knowledge/evidence-cards/new')}>
          新增证据卡片
        </Button>
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">证据总数</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0' }}>{visibleStats.total}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">当前页已审核</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0' }}>{visibleStats.verified}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">当前页草稿/废弃</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0' }}>{visibleStats.draft}/{visibleStats.deprecated}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">当前页注入次数</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0' }}>{visibleStats.injected}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} md={10}>
          <Input.Search
            placeholder="搜索标题或正文"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} md={7}>
          <Select
            value={evidenceType}
            onChange={(value) => { setEvidenceType(value); setPage(1); }}
            options={EVIDENCE_TYPE_OPTIONS}
            placeholder="全部证据类型"
            allowClear
          />
        </Col>
        <Col xs={24} md={7}>
          <Select
            value={sourceType}
            onChange={(value) => { setSourceType(value); setPage(1); }}
            options={SOURCE_TYPE_OPTIONS}
            placeholder="全部来源类型"
            allowClear
          />
        </Col>
        <Col xs={24} md={6}>
          <Select
            value={status}
            onChange={(value) => { setStatus(value); setPage(1); }}
            options={EVIDENCE_STATUS_OPTIONS}
            placeholder="全部状态"
            allowClear
          />
        </Col>
        <Col xs={24} md={6}>
          <Select
            value={sourceQuality}
            onChange={(value) => { setSourceQuality(value); setPage(1); }}
            options={SOURCE_QUALITY_OPTIONS}
            placeholder="全部来源质量"
            allowClear
          />
        </Col>
        <Col xs={24} md={6}>
          <Select
            value={articleType}
            onChange={(value) => { setArticleType(value); setPage(1); }}
            options={EVIDENCE_ARTICLE_TYPE_OPTIONS}
            placeholder="全部适用文章"
            allowClear
          />
        </Col>
      </Row>

      <Spin spinning={loading}>
        <div className="evidence-card-cards">
          {data.length === 0 && (
            <Card>
              <Space direction="vertical" size={8}>
                <Typography.Text type="secondary">暂无证据卡片。V1.0.5 的检索默认只使用 verified 证据，建议先录入 3-8 条薄云咨询核心事实、方法、能力或案例。</Typography.Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/knowledge/evidence-cards/new')}>
                  新增第一条证据
                </Button>
              </Space>
            </Card>
          )}
          {data.map(item => (
            <Card
              key={item.id}
              size="small"
              title={item.title}
              extra={<Tag color="blue">{evidenceTypeLabel[item.evidenceType] ?? item.evidenceType}</Tag>}
              hoverable
              onClick={() => navigate(`/knowledge/evidence-cards/${item.id}`)}
            >
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item label="状态">{statusLabel[item.status] ?? item.status}</Descriptions.Item>
                <Descriptions.Item label="来源">{sourceTypeLabel[item.sourceType] ?? item.sourceType}</Descriptions.Item>
                <Descriptions.Item label="sourceId">{item.sourceId ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="sourceUrl">{item.sourceUrl || '-'}</Descriptions.Item>
                <Descriptions.Item label="来源质量">{sourceQualityLabel[item.sourceQuality] ?? item.sourceQuality}</Descriptions.Item>
                <Descriptions.Item label="注入次数">{item.injectedCount ?? 0}</Descriptions.Item>
                <Descriptions.Item label="最近注入">{item.lastInjectedAt ? formatDateTime(item.lastInjectedAt) : '-'}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(item.updatedAt)}</Descriptions.Item>
                <Descriptions.Item label="可信度">{item.confidenceScore ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="新鲜度">{item.freshnessScore ?? '-'}</Descriptions.Item>
              </Descriptions>
              <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, marginBottom: 8 }}>
                {item.content}
              </Typography.Paragraph>
              <Flex justify="space-between" align="center" gap={8}>
                <Space size={4} wrap>
                  {item.keywords?.slice(0, 4).map(keyword => <Tag key={keyword}>{keyword}</Tag>)}
                </Space>
                <Space size={4}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); navigate(`/knowledge/evidence-cards/${item.id}?mode=edit`); }} />
                  <Popconfirm title="确认删除此证据卡片？" okText="删除" cancelText="取消" onConfirm={(event) => { event?.stopPropagation(); handleDelete(item.id); }}>
                    <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={(event) => event.stopPropagation()} />
                  </Popconfirm>
                </Space>
              </Flex>
            </Card>
          ))}
        </div>

        <div className="evidence-card-table-wrapper">
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            pagination={false}
            size="middle"
            locale={{ emptyText: '暂无证据卡片' }}
          />
        </div>
      </Spin>

      {total > pageSize && (
        <div className="item-card-pagination">
          <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false} onChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default EvidenceCardList;
