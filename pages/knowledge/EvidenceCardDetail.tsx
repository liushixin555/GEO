import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import {
  EVIDENCE_ARTICLE_TYPE_OPTIONS,
  EVIDENCE_STATUS_OPTIONS,
  EVIDENCE_TYPE_OPTIONS,
  SOURCE_QUALITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  type EvidenceCard,
} from '../article/types';
import { formatDateTime } from '../utils/date';
import { splitKeywords, useEvidenceCards, type EvidenceCardPayload } from './hooks/useEvidenceCards';

type EvidenceCardFormValues = Omit<EvidenceCardPayload, 'keywords'> & {
  keywords?: string;
};

const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const statusLabel = Object.fromEntries(EVIDENCE_STATUS_OPTIONS.map(item => [item.value, item.label]));
const sourceQualityLabel = Object.fromEntries(SOURCE_QUALITY_OPTIONS.map(item => [item.value, item.label]));
const articleTypeLabel = Object.fromEntries(EVIDENCE_ARTICLE_TYPE_OPTIONS.map(item => [item.value, item.label]));

const EvidenceCardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { companyId, projectId } = useAppContext();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew || searchParams.get('mode') === 'edit');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<EvidenceCard | null>(null);
  const [form] = Form.useForm<EvidenceCardFormValues>();
  const { getEvidenceCard, createEvidenceCard, updateEvidenceCard } = useEvidenceCards();

  useEffect(() => {
    if (isNew || !id) return;
    setLoading(true);
    getEvidenceCard(Number(id))
      .then((data) => {
        setItem(data);
        form.setFieldsValue({
          title: data.title,
          content: data.content,
          evidenceType: data.evidenceType,
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl ?? undefined,
          keywords: data.keywords?.join('、'),
          status: data.status,
          sourceQuality: data.sourceQuality,
          articleTypes: data.articleTypes,
          confidenceScore: data.confidenceScore,
          freshnessScore: data.freshnessScore,
        });
      })
      .catch(() => message.error('加载证据卡片失败'))
      .finally(() => setLoading(false));
  }, [form, getEvidenceCard, id, isNew, message]);

  const handleFinish = async (values: EvidenceCardFormValues) => {
    setSaving(true);
    const payload: EvidenceCardPayload = {
      companyId: item?.companyId ?? companyId ?? null,
      projectId: item?.projectId ?? projectId ?? null,
      title: values.title.trim(),
      content: values.content.trim(),
      evidenceType: values.evidenceType,
      sourceType: values.sourceType,
      sourceUrl: values.sourceUrl?.trim() || null,
      keywords: splitKeywords(values.keywords),
      status: values.status,
      sourceQuality: values.sourceQuality,
      articleTypes: values.articleTypes ?? ['general'],
      confidenceScore: values.confidenceScore ?? null,
      freshnessScore: values.freshnessScore ?? null,
    };
    try {
      const saved = isNew ? await createEvidenceCard(payload) : await updateEvidenceCard(Number(id), payload);
      message.success(isNew ? '证据卡片已创建' : '证据卡片已更新');
      navigate(`/knowledge/evidence-cards/${saved.id}`, { replace: true });
      setItem(saved);
      setEditing(false);
    } catch {
      message.error('保存证据卡片失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Spin size="large" description="正在加载证据卡片..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <Button type="link" onClick={() => navigate('/knowledge')} style={{ padding: 0 }}>AI知识库</Button> },
          { title: <Button type="link" onClick={() => navigate('/knowledge/evidence-cards')} style={{ padding: 0 }}>证据卡片</Button> },
          { title: isNew ? '新增' : item?.title || '详情' },
        ]} />
      </div>

      <Space align="center" style={{ marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge/evidence-cards')} />
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 400 }}>
          {isNew ? '新增证据卡片' : item?.title || '证据卡片'}
        </Typography.Title>
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="EvidenceCard V1 仅维护证据卡片，不触发文档抽取，也不作为文章生成的最终注入依据。"
      />

      {editing ? (
        <Card>
          <Form
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{ evidenceType: 'fact', sourceType: 'manual', status: 'draft', sourceQuality: 'manual', articleTypes: ['general'] }}
            onFinish={handleFinish}
          >
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input maxLength={300} showCount placeholder="请输入证据标题" />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
              <Input.TextArea rows={6} maxLength={5000} showCount placeholder="请输入可用于文章的证据内容" />
            </Form.Item>
            <Form.Item name="evidenceType" label="证据类型" rules={[{ required: true, message: '请选择证据类型' }]}>
              <Select options={EVIDENCE_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="sourceType" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}>
              <Select options={SOURCE_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={EVIDENCE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="sourceQuality" label="来源质量" rules={[{ required: true, message: '请选择来源质量' }]}>
              <Select options={SOURCE_QUALITY_OPTIONS} />
            </Form.Item>
            <Form.Item name="articleTypes" label="适用文章类型">
              <Select mode="multiple" options={EVIDENCE_ARTICLE_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="keywords" label="关键词">
              <Input placeholder="多个关键词用顿号、逗号或换行分隔" />
            </Form.Item>
            <Form.Item name="sourceUrl" label="来源 URL">
              <Input placeholder="https://example.com/source" maxLength={1000} />
            </Form.Item>
            <Form.Item name="confidenceScore" label="可信度">
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} placeholder="0 - 1" />
            </Form.Item>
            <Form.Item name="freshnessScore" label="新鲜度">
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} placeholder="0 - 1" />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
              <Button onClick={() => (isNew ? navigate('/knowledge/evidence-cards') : setEditing(false))}>取消</Button>
            </Space>
          </Form>
        </Card>
      ) : (
        <Card
          extra={<Button type="primary" onClick={() => setEditing(true)}>编辑</Button>}
        >
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="标题" span={2}>{item?.title}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={item?.status === 'verified' ? 'green' : item?.status === 'deprecated' ? 'red' : 'default'}>{item ? statusLabel[item.status] : '-'}</Tag></Descriptions.Item>
            <Descriptions.Item label="来源质量"><Tag color="cyan">{item ? sourceQualityLabel[item.sourceQuality] : '-'}</Tag></Descriptions.Item>
            <Descriptions.Item label="证据类型"><Tag color="blue">{item ? evidenceTypeLabel[item.evidenceType] : '-'}</Tag></Descriptions.Item>
            <Descriptions.Item label="来源类型"><Tag>{item ? sourceTypeLabel[item.sourceType] : '-'}</Tag></Descriptions.Item>
            <Descriptions.Item label="可信度">{item?.confidenceScore ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="新鲜度">{item?.freshnessScore ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="注入次数">{item?.injectedCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="最近注入">{item?.lastInjectedAt ? formatDateTime(item.lastInjectedAt) : '-'}</Descriptions.Item>
            <Descriptions.Item label="审核时间">{item?.verifiedAt ? formatDateTime(item.verifiedAt) : '-'}</Descriptions.Item>
            <Descriptions.Item label="审核人">{item?.verifiedBy ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="适用文章类型" span={2}>
              <Space size={4} wrap>{item?.articleTypes?.map(type => <Tag key={type}>{articleTypeLabel[type] ?? type}</Tag>)}</Space>
            </Descriptions.Item>
            <Descriptions.Item label="来源 URL" span={2}>{item?.sourceUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="关键词" span={2}>
              <Space size={4} wrap>{item?.keywords?.map(keyword => <Tag key={keyword}>{keyword}</Tag>)}</Space>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>{item?.updatedAt ? formatDateTime(item.updatedAt) : '-'}</Descriptions.Item>
            <Descriptions.Item label="内容" span={2}>
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item?.content}</Typography.Paragraph>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default EvidenceCardDetail;
