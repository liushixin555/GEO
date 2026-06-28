import React, { useMemo, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tag,
  Input,
  Select,
  Button,
  Space,
  Popconfirm,
  Empty,
  Breadcrumb,
  Typography,
  App,
  Spin,
  Pagination,
  Progress,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuditList } from '../hooks/useAuditList';
import { formatDateTime } from '../../utils/date';
import {
  GRADE_COLORS,
  STATUS_META,
  getGrade,
  type AuditListItem,
  type AuditStatus,
} from '../types';

interface AuditOverviewProps {
  onNew: () => void;
  onView: (jobId: string) => void;
}

const AuditOverview: React.FC<AuditOverviewProps> = ({ onNew, onView }) => {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [status, setStatus] = useState<AuditStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const { list, total, loading, remove } = useAuditList({
    page,
    pageSize,
    status,
    search: search || undefined,
  });

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  };

  const cards = useMemo(() => list, [list]);

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '诊断管理' }, { title: '任务列表' }]} />
      </div>

      <Card
        title="诊断任务"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
            新建诊断
          </Button>
        }
      >
        <Space size={12} style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索品牌/网址/行业..."
            allowClear
            style={{ width: 260 }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <Select
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            allowClear
            placeholder="全部状态"
            style={{ width: 140 }}
            options={[
              { value: 'processing', label: '进行中' },
              { value: 'complete', label: '已完成' },
              { value: 'failed', label: '失败' },
            ]}
          />
        </Space>

        <Spin spinning={loading}>
          {cards.length === 0 ? (
            <Empty description="暂无诊断任务" style={{ padding: '40px 0' }} />
          ) : (
            <Row gutter={[16, 16]}>
              {cards.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                  <AuditTaskCard
                    item={item}
                    onView={() => onView(item.jobId)}
                    onDelete={async () => {
                      const ok = await remove(item.jobId);
                      if (ok) message.success('已删除');
                    }}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Spin>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showTotal={(t) => `共 ${t} 条`}
            onChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  );
};

/** 单个诊断任务卡片 */
const AuditTaskCard: React.FC<{
  item: AuditListItem;
  onView: () => void;
  onDelete: () => void;
}> = ({ item, onView, onDelete }) => {
  const statusCfg = STATUS_META[item.status] ?? STATUS_META.processing;
  const grade = item.grade ?? getGrade(item.score);
  const gradeColor = grade !== '-' ? (GRADE_COLORS[grade] ?? 'default') : 'default';
  const progressPct = item.promptTotal > 0
    ? Math.round((item.promptDone / item.promptTotal) * 100)
    : 0;

  return (
    <Card
      hoverable
      size="small"
      title={
        <Space size={6} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text strong ellipsis style={{ maxWidth: 140 }}>
            {item.brand}
          </Typography.Text>
          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
        </Space>
      }
      actions={[
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={onView}
          key="view"
        >
          查看
        </Button>,
        <Popconfirm
          title="确认删除该诊断任务？"
          description="删除后无法恢复"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
          key="delete"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
          {item.website || '-'}
        </Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>行业：</Typography.Text>
          <Typography.Text style={{ fontSize: 13 }}>{item.industry || '-'}</Typography.Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>评分</Typography.Text>
          <Space size={6}>
            <Typography.Text strong style={{ fontSize: 18 }}>
              {item.score ?? '-'}
            </Typography.Text>
            {grade !== '-' && <Tag color={gradeColor}>{grade}</Tag>}
          </Space>
        </div>
        {item.status === 'processing' && (
          <div>
            <Progress percent={progressPct} size="small" status="active" />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {item.promptDone}/{item.promptTotal} 条已查询
            </Typography.Text>
          </div>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(item.createdAt)}
        </Typography.Text>
      </Space>
    </Card>
  );
};

export default AuditOverview;
