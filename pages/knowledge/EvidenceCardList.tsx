import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  EVIDENCE_TYPE_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  type EvidenceCard,
  type EvidenceCardSourceType,
  type EvidenceCardType,
} from '../article/types';
import { formatDateTime } from '../utils/date';
import { useEvidenceCards } from './hooks/useEvidenceCards';

const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));

const EvidenceCardList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { loading, listEvidenceCards, deleteEvidenceCard } = useEvidenceCards();
  const [data, setData] = useState<EvidenceCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceCardType | undefined>();
  const [sourceType, setSourceType] = useState<EvidenceCardSourceType | undefined>();
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    const result = await listEvidenceCards({
      page,
      pageSize,
      search,
      evidenceType,
      sourceType,
    });
    setData(result.list);
    setTotal(result.total);
  }, [evidenceType, listEvidenceCards, page, search, sourceType]);

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
      </Row>

      <Spin spinning={loading}>
        <div className="evidence-card-cards">
          {data.length === 0 && (
            <Card><Typography.Text type="secondary">暂无证据卡片</Typography.Text></Card>
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
                <Descriptions.Item label="来源">{sourceTypeLabel[item.sourceType] ?? item.sourceType}</Descriptions.Item>
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
