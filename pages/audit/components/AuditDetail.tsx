import React, { useMemo } from 'react';
import {
  App,
  Card,
  Button,
  Result,
  Spin,
  Row,
  Col,
  Progress,
  Statistic,
  Tag,
  Alert,
  Tabs,
  Collapse,
  List,
  Empty,
  Typography,
  Breadcrumb,
  Space,
  Descriptions,
  Tooltip,
  Skeleton,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import apiClient from '../../lib/apiClient';
import { formatDateTime } from '../../utils/date';
import { useAuditDetail } from '../hooks/useAuditDetail';
import {
  ALL_ENGINES,
  CATEGORY_LABELS,
  ENGINE_META,
  GRADE_COLORS,
  STATUS_META,
  getGrade,
  getVerdict,
  scoreColor,
  type AuditDetail as AuditDetailT,
  type EngineKey,
  type PromptCategory,
} from '../types';

interface AuditDetailProps {
  jobId: string;
  onBack: () => void;
}

const AuditDetailPage: React.FC<AuditDetailProps> = ({ jobId, onBack }) => {
  const { detail, loading, refresh } = useAuditDetail(jobId);
  const [downloading, setDownloading] = React.useState(false);
  const { message } = App.useApp();

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await apiClient.get(`/audit/${jobId}/skill`, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : `audit-${jobId.slice(0, 8)}.zip`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // Blob 错误体需单独解析
      let msg = '下载失败';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const j = JSON.parse(text);
          if (j?.message) msg = j.message;
        } catch { /* ignore */ }
      } else {
        msg = err?.response?.data?.message || '下载失败';
      }
      message.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page-container">
        <Result
          status="404"
          title="诊断任务不存在"
          subTitle="该任务可能已被删除，或您没有访问权限"
          extra={
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  const statusCfg = STATUS_META[detail.status] ?? STATUS_META.processing;
  const result = detail.result;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb
          items={[
            { title: '诊断管理' },
            { title: '诊断详情' },
            { title: detail.brand },
          ]}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回列表
        </Button>
        <Space>
          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
          {detail.status === 'processing' && (
            <Button onClick={refresh} size="small">刷新进度</Button>
          )}
          {detail.status === 'complete' && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={downloading}
            >
              下载报告
            </Button>
          )}
        </Space>
      </div>

      {/* Hero score */}
      <HeroScore detail={detail} />

      {/* 仅完成后才显示细分 */}
      {result && detail.status === 'complete' && (
        <Tabs
          defaultActiveKey="engines"
          items={[
            {
              key: 'engines',
              label: '引擎细分',
              children: <EngineBreakdown detail={detail} />,
            },
            {
              key: 'prompts',
              label: `提示词分析（${detail.prompts.length}）`,
              children: <PromptAnalysis detail={detail} />,
            },
            {
              key: 'blindspots',
              label: `盲点（${result.blind_spots.length}）`,
              children: <BlindSpotList detail={detail} />,
            },
            {
              key: 'meta',
              label: '基本信息',
              children: <AuditMeta detail={detail} />,
            },
          ]}
        />
      )}

      {detail.status === 'processing' && (
        <Card style={{ marginTop: 16 }}>
          <Progress
            percent={detail.promptTotal > 0 ? Math.round((detail.promptDone / detail.promptTotal) * 100) : 0}
            status="active"
          />
          <Typography.Text type="secondary">
            正在跨 {detail.engineCount} 个引擎执行 {detail.promptDone}/{detail.promptTotal} 条提示词查询...
          </Typography.Text>
        </Card>
      )}

      {detail.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          message="诊断任务执行失败"
          description="请检查引擎配置（系统管理 → 模型管理），或联系管理员排查日志。"
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

// ────────────── Hero Score ──────────────

const HeroScore: React.FC<{ detail: AuditDetailT }> = ({ detail }) => {
  const result = detail.result;
  const score = result?.overall_score ?? detail.score ?? 0;
  const verdict = getVerdict(score);
  const grade = result?.grade ?? detail.grade ?? getGrade(score);

  return (
    <Card>
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} sm={8} md={6} style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={score}
            size={160}
            strokeColor={scoreColor(score)}
            format={() => (
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor(score) }}>{score}</div>
                <div style={{ fontSize: 12, color: '#999' }}>/ 100</div>
                <Tag
                  color={GRADE_COLORS[grade] ?? 'default'}
                  style={{ marginTop: 4 }}
                >
                  等级 {grade}
                </Tag>
              </div>
            )}
          />
        </Col>
        <Col xs={24} sm={16} md={10}>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            {detail.brand}
          </Typography.Title>
          {detail.website && (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              {detail.website}
            </Typography.Paragraph>
          )}
          <Alert type={verdict.type} showIcon message={verdict.text} style={{ marginBottom: 8 }} />
          {result?.narrative && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
              {result.narrative}
            </Typography.Paragraph>
          )}
        </Col>
        <Col xs={24} md={8}>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Statistic
                title="知识得分"
                value={result?.knowledge_score ?? 0}
                valueStyle={{ color: scoreColor(result?.knowledge_score ?? 0) }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="可发现性"
                value={result?.discoverability_score ?? 0}
                valueStyle={{ color: scoreColor(result?.discoverability_score ?? 0) }}
              />
            </Col>
            <Col span={12}>
              <Statistic title="引用得分" value={result?.citation_score ?? 0} />
            </Col>
            <Col span={12}>
              <Statistic title="引擎数" value={detail.engineCount} suffix={`/ ${ALL_ENGINES.length}`} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

// ────────────── Engine Breakdown ──────────────

const EngineBreakdown: React.FC<{ detail: AuditDetailT }> = ({ detail }) => {
  const result = detail.result;
  if (!result) return <Empty description="无引擎数据" />;

  const engines = Object.keys(result.engines) as EngineKey[];

  return (
    <Card title="各引擎可见度">
      <Row gutter={[16, 16]}>
        {engines.map((e) => {
          const data = result.engines[e];
          const meta = ENGINE_META[e];
          return (
            <Col key={e} xs={24} sm={12} md={8}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {meta?.label ?? e}
                  </Typography.Text>
                  <Progress
                    type="circle"
                    percent={data.score}
                    size={100}
                    strokeColor={scoreColor(data.score)}
                    format={(p) => <span style={{ color: scoreColor(data.score) }}>{p}</span>}
                  />
                  <Descriptions
                    size="small"
                    column={2}
                    style={{ marginTop: 12, fontSize: 12 }}
                    items={[
                      { key: 'mentioned', label: '提及', children: data.mentioned_count },
                      { key: 'total', label: '总题', children: data.total_count },
                      { key: 'positive', label: '正向', children: data.positive },
                      { key: 'blind', label: '盲点', children: data.blind_spots },
                    ]}
                  />
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
};

// ────────────── Prompt Analysis ──────────────

const PromptAnalysis: React.FC<{ detail: AuditDetailT }> = ({ detail }) => {
  const byCategory = useMemo(() => {
    const map = new Map<PromptCategory, typeof detail.prompts>();
    for (const p of detail.prompts) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [detail.prompts]);

  if (detail.prompts.length === 0) {
    return <Empty description="无提示词数据" />;
  }

  const collapseItems = Array.from(byCategory.entries()).map(([cat, items]) => ({
    key: cat,
    label: (
      <Space>
        <span>{CATEGORY_LABELS[cat] ?? cat}</span>
        <Tag>{items.length} 条</Tag>
        <Tag color="success">
          {items.filter((i) => i.result?.mentioned).length} 命中
        </Tag>
        <Tag color="warning">
          {items.filter((i) => i.result?.blindSpot).length} 盲点
        </Tag>
      </Space>
    ),
    children: (
      <List
        size="small"
        dataSource={items}
        renderItem={(p) => (
          <List.Item>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Space>
                <Typography.Text strong>[{p.engine}]</Typography.Text>
                <Typography.Text>{p.prompt}</Typography.Text>
              </Space>
              {p.result && (
                <Space size={8} wrap>
                  {p.result.mentioned ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      已提及
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="error">
                      未提及
                    </Tag>
                  )}
                  {p.result.blindSpot && (
                    <Tag icon={<WarningOutlined />} color="warning">
                      盲点
                    </Tag>
                  )}
                  {p.result.latencyMs != null && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      耗时 {p.result.latencyMs}ms
                    </Typography.Text>
                  )}
                  {p.result.error && (
                    <Tooltip title={p.result.error}>
                      <Tag color="error">错误</Tag>
                    </Tooltip>
                  )}
                </Space>
              )}
              {p.result?.snippet && (
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, marginBottom: 0, paddingLeft: 8, borderLeft: '2px solid #e8e8e8' }}
                >
                  {p.result.snippet}
                </Typography.Paragraph>
              )}
            </Space>
          </List.Item>
        )}
      />
    ),
  }));

  return <Collapse items={collapseItems} defaultActiveKey={['brand']} />;
};

// ────────────── Blind Spot List ──────────────

const BlindSpotList: React.FC<{ detail: AuditDetailT }> = ({ detail }) => {
  const result = detail.result;
  if (!result || result.blind_spots.length === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="未发现盲点 — 所有提示词均有引擎命中"
        />
      </Card>
    );
  }

  return (
    <Card title={<Space><BulbOutlined /> 关键盲点提示</Space>}>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={`共检测到 ${result.blind_spots.length} 个盲点：这些是用户真实会问、但当前所有引擎都未提及您品牌的提问。`}
      />
      <List
        size="small"
        dataSource={result.blind_spots}
        renderItem={(item, idx) => (
          <List.Item>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Space>
                <Tag color="warning">{CATEGORY_LABELS[item.category as PromptCategory] ?? item.category}</Tag>
                <Typography.Text strong>{item.prompt}</Typography.Text>
              </Space>
              <Space size={4} wrap>
                {item.engines.map((e, i) => (
                  <Tag key={i}>{ENGINE_META[e as EngineKey]?.label ?? e}</Tag>
                ))}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {item.engines.length} 个引擎均未提及
                </Typography.Text>
              </Space>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );
};

// ────────────── Audit Meta ──────────────

const AuditMeta: React.FC<{ detail: AuditDetailT }> = ({ detail }) => {
  const result = detail.result;
  return (
    <Card title="诊断基本信息">
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="品牌">{detail.brand}</Descriptions.Item>
        <Descriptions.Item label="网址">{detail.website ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="行业">{detail.industry ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="层级">{detail.tier}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatDateTime(detail.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
        <Descriptions.Item label="提示词总数" span={2}>
          {detail.promptDone} / {detail.promptTotal}
        </Descriptions.Item>
        {detail.competitors && detail.competitors.length > 0 && (
          <Descriptions.Item label="竞品" span={2}>
            <Space size={4} wrap>
              {detail.competitors.map((c, i) => <Tag key={i}>{c}</Tag>)}
            </Space>
          </Descriptions.Item>
        )}
        {detail.keywords && detail.keywords.length > 0 && (
          <Descriptions.Item label="关键词" span={2}>
            <Space size={4} wrap>
              {detail.keywords.map((k, i) => <Tag key={i} color="blue">{k}</Tag>)}
            </Space>
          </Descriptions.Item>
        )}
        {result && (
          <Descriptions.Item label="一致性乘子" span={2}>
            {result.consistency_multiplier.toFixed(2)}（引擎数 / {ALL_ENGINES.length}）
          </Descriptions.Item>
        )}
      </Descriptions>
      {detail.description && (
        <Typography.Paragraph style={{ marginTop: 16 }} type="secondary">
          {detail.description}
        </Typography.Paragraph>
      )}
    </Card>
  );
};

export default AuditDetailPage;
