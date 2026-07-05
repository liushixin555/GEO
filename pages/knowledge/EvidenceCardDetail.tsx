import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Pagination,
  Select,
  Space,
  Spin,
  Tabs,
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
  type EvidenceArticleType,
  type EvidenceCardType,
  type EvidenceSourceQuality,
} from '../article/types';
import { formatDateTime } from '../utils/date';
import {
  splitKeywords,
  useEvidenceCards,
  type EvidenceCardExtractCandidate,
  type EvidenceCardPayload,
} from './hooks/useEvidenceCards';

type EvidenceCardFormValues = Omit<EvidenceCardPayload, 'keywords'> & {
  keywords?: string;
};

type ExtractCandidateDraft = EvidenceCardExtractCandidate & {
  localId: string;
  selected: boolean;
  title: string;
  content: string;
  evidenceType: EvidenceCardType;
  sourceQuality: EvidenceSourceQuality;
  articleTypes: EvidenceArticleType[];
  keywordsText: string;
  confidenceScore: number | null;
  freshnessScore: number | null;
  extractionReason: string;
  warnings: string[];
};

const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const statusLabel = Object.fromEntries(EVIDENCE_STATUS_OPTIONS.map(item => [item.value, item.label]));
const sourceQualityLabel = Object.fromEntries(SOURCE_QUALITY_OPTIONS.map(item => [item.value, item.label]));
const articleTypeLabel = Object.fromEntries(EVIDENCE_ARTICLE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const extractPageSize = 3;

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return responseMessage?.message || responseMessage?.error || fallback;
}

function normalizeCandidate(candidate: EvidenceCardExtractCandidate, index: number): ExtractCandidateDraft {
  const keywords = splitKeywords(candidate.keywords);
  return {
    ...candidate,
    localId: `${Date.now()}-${index}`,
    selected: true,
    title: candidate.title ?? '',
    content: candidate.content ?? '',
    evidenceType: candidate.evidenceType ?? 'fact',
    sourceType: 'manual',
    status: 'draft',
    sourceQuality: candidate.sourceQuality ?? 'manual',
    articleTypes: candidate.articleTypes?.length ? candidate.articleTypes : ['general'],
    keywords,
    keywordsText: keywords.join('、'),
    confidenceScore: candidate.confidenceScore ?? null,
    freshnessScore: candidate.freshnessScore ?? null,
    extractionReason: candidate.extractionReason ?? '',
    warnings: candidate.warnings ?? [],
  };
}

function formatScore(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

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
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractSaving, setExtractSaving] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractWarnings, setExtractWarnings] = useState<string[]>([]);
  const [extractCandidates, setExtractCandidates] = useState<ExtractCandidateDraft[]>([]);
  const [extractPage, setExtractPage] = useState(1);
  const [item, setItem] = useState<EvidenceCard | null>(null);
  const [form] = Form.useForm<EvidenceCardFormValues>();
  const { getEvidenceCard, createEvidenceCard, updateEvidenceCard, extractEvidenceCardsResult } = useEvidenceCards();

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

  const updateCandidate = (localId: string, patch: Partial<ExtractCandidateDraft>) => {
    setExtractCandidates(current => current.map(candidate => (
      candidate.localId === localId ? { ...candidate, ...patch } : candidate
    )));
  };

  const removeCandidate = (localId: string) => {
    setExtractCandidates(current => {
      const next = current.filter(candidate => candidate.localId !== localId);
      const maxPage = Math.max(1, Math.ceil(next.length / extractPageSize));
      setExtractPage(page => Math.min(page, maxPage));
      return next;
    });
  };

  const selectAllCandidates = (selected: boolean) => {
    setExtractCandidates(current => current.map(candidate => ({ ...candidate, selected })));
  };

  const toPayload = (candidate: ExtractCandidateDraft): EvidenceCardExtractCandidate => ({
    companyId: companyId ?? null,
    projectId: projectId ?? null,
    title: candidate.title.trim(),
    content: candidate.content.trim(),
    evidenceType: candidate.evidenceType,
    sourceType: 'manual',
    sourceUrl: candidate.sourceUrl?.trim() || null,
    keywords: splitKeywords(candidate.keywordsText),
    status: 'draft',
    sourceQuality: candidate.sourceQuality,
    articleTypes: candidate.articleTypes?.length ? candidate.articleTypes : ['general'],
    confidenceScore: candidate.confidenceScore ?? null,
    freshnessScore: candidate.freshnessScore ?? null,
    extractionReason: candidate.extractionReason?.trim() || undefined,
    warnings: candidate.warnings?.map(warning => warning.trim()).filter(Boolean) ?? [],
  });

  const handleExtract = async () => {
    const text = extractText.trim();
    if (!text) {
      message.warning('请先粘贴需要抽取的文本');
      return;
    }
    setExtracting(true);
    setExtractError(null);
    setExtractWarnings([]);
    try {
      const result = await extractEvidenceCardsResult({ sourceType: 'manual', text, save: false });
      const candidates = result.candidates;
      setExtractCandidates(candidates.map(normalizeCandidate));
      setExtractWarnings(result.warnings);
      setExtractPage(1);
      if (candidates.length === 0) {
        message.info('材料不足或没有可抽取证据');
      } else {
        message.success(`已抽取 ${candidates.length} 条候选证据`);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, '抽取候选失败');
      setExtractError(errorMessage);
      setExtractCandidates([]);
      message.error(errorMessage);
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveDrafts = async () => {
    const selectedCandidates = extractCandidates.filter(candidate => candidate.selected);
    if (selectedCandidates.length === 0) {
      message.warning('请至少勾选一条候选证据');
      return;
    }
    const payloads = selectedCandidates.map(toPayload);
    const invalidCandidate = payloads.find(candidate => !candidate.title || !candidate.content);
    if (invalidCandidate) {
      message.warning('已勾选候选的标题和内容不能为空');
      return;
    }

    setExtractSaving(true);
    setExtractError(null);
    setExtractWarnings([]);
    try {
      let savedCount = payloads.length;
      try {
        const result = await extractEvidenceCardsResult({
          sourceType: 'manual',
          text: extractText.trim(),
          save: true,
          candidates: payloads,
        });
        savedCount = result.saved.length || payloads.length;
        setExtractWarnings(result.warnings);
      } catch {
        await Promise.all(payloads.map(candidate => createEvidenceCard(candidate)));
      }
      message.success(`已保存 ${savedCount} 条草稿证据`);
      navigate('/knowledge/evidence-cards?status=draft');
    } catch (error) {
      const errorMessage = getErrorMessage(error, '保存草稿失败');
      setExtractError(errorMessage);
      message.error(errorMessage);
    } finally {
      setExtractSaving(false);
    }
  };

  const visibleCandidates = extractCandidates.slice((extractPage - 1) * extractPageSize, extractPage * extractPageSize);
  const selectedCount = extractCandidates.filter(candidate => candidate.selected).length;
  const allCandidateWarnings = Array.from(new Set([
    ...extractWarnings,
    ...extractCandidates.flatMap(candidate => candidate.warnings ?? []),
  ].map(warning => warning.trim()).filter(Boolean)));

  const manualForm = (
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
  );

  const extractPanel = (
    <Card>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="粘贴文本后先进行 save=false 预览，只有点击保存为草稿才会写入证据卡片。"
        />
        {extractError && (
          <Alert
            type="error"
            showIcon
            message="抽取或保存失败"
            description={extractError}
          />
        )}
        {allCandidateWarnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="抽取结果包含提示"
            description={(
              <Space direction="vertical" size={4}>
                {allCandidateWarnings.map(warning => (
                  <Typography.Text key={warning}>{warning}</Typography.Text>
                ))}
              </Space>
            )}
          />
        )}
        <Input.TextArea
          rows={6}
          maxLength={30000}
          showCount
          value={extractText}
          onChange={(event) => setExtractText(event.target.value)}
          placeholder="粘贴产品资料、客户案例、方法论说明等文本"
        />
        <Flex align="center" justify="space-between" gap={12} wrap="wrap">
          <Space>
            <Button type="primary" loading={extracting} onClick={handleExtract}>抽取候选</Button>
            <Button disabled={extractCandidates.length === 0} onClick={() => selectAllCandidates(true)}>全选</Button>
            <Button disabled={extractCandidates.length === 0} onClick={() => selectAllCandidates(false)}>全不选</Button>
            <Button onClick={() => navigate('/knowledge/evidence-cards')}>取消</Button>
          </Space>
          <Typography.Text type="secondary">
            已勾选 {selectedCount}/{extractCandidates.length}
          </Typography.Text>
        </Flex>

        {extractCandidates.length === 0 ? (
          <Empty description="材料不足或没有可抽取证据" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {visibleCandidates.map((candidate, index) => (
              <Card
                key={candidate.localId}
                size="small"
                title={(
                  <Space>
                    <Checkbox
                      checked={candidate.selected}
                      onChange={(event) => updateCandidate(candidate.localId, { selected: event.target.checked })}
                    />
                    <Typography.Text>候选 {(extractPage - 1) * extractPageSize + index + 1}</Typography.Text>
                  </Space>
                )}
                extra={<Button danger type="text" onClick={() => removeCandidate(candidate.localId)}>删除</Button>}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Descriptions column={2} size="small" colon={false}>
                    <Descriptions.Item label="证据类型">
                      <Tag color="blue">{evidenceTypeLabel[candidate.evidenceType] ?? candidate.evidenceType}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="来源质量">
                      <Tag color="cyan">{sourceQualityLabel[candidate.sourceQuality] ?? candidate.sourceQuality}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="可信度">{formatScore(candidate.confidenceScore)}</Descriptions.Item>
                    <Descriptions.Item label="新鲜度">{formatScore(candidate.freshnessScore)}</Descriptions.Item>
                    <Descriptions.Item label="适用文章" span={2}>
                      <Space size={4} wrap>
                        {candidate.articleTypes?.map(type => <Tag key={type}>{articleTypeLabel[type] ?? type}</Tag>)}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                  <Input
                    value={candidate.title}
                    maxLength={300}
                    showCount
                    placeholder="标题"
                    onChange={(event) => updateCandidate(candidate.localId, { title: event.target.value })}
                  />
                  <Input.TextArea
                    rows={4}
                    maxLength={5000}
                    showCount
                    value={candidate.content}
                    placeholder="内容"
                    onChange={(event) => updateCandidate(candidate.localId, { content: event.target.value })}
                  />
                  <Flex gap={12} wrap="wrap">
                    <Select
                      style={{ minWidth: 160, flex: 1 }}
                      value={candidate.evidenceType}
                      options={EVIDENCE_TYPE_OPTIONS}
                      onChange={(value: EvidenceCardType) => updateCandidate(candidate.localId, { evidenceType: value })}
                    />
                    <Select
                      style={{ minWidth: 160, flex: 1 }}
                      value={candidate.sourceQuality}
                      options={SOURCE_QUALITY_OPTIONS}
                      onChange={(value: EvidenceSourceQuality) => updateCandidate(candidate.localId, { sourceQuality: value })}
                    />
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.1}
                      style={{ minWidth: 120, flex: 1 }}
                      value={candidate.confidenceScore}
                      placeholder="可信度"
                      onChange={(value) => updateCandidate(candidate.localId, { confidenceScore: value })}
                    />
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.1}
                      style={{ minWidth: 120, flex: 1 }}
                      value={candidate.freshnessScore}
                      placeholder="新鲜度"
                      onChange={(value) => updateCandidate(candidate.localId, { freshnessScore: value })}
                    />
                  </Flex>
                  <Select
                    mode="multiple"
                    value={candidate.articleTypes}
                    options={EVIDENCE_ARTICLE_TYPE_OPTIONS}
                    placeholder="适用文章类型"
                    onChange={(value: EvidenceArticleType[]) => updateCandidate(candidate.localId, { articleTypes: value })}
                  />
                  <Input
                    value={candidate.keywordsText}
                    placeholder="关键词，用顿号、逗号或换行分隔"
                    onChange={(event) => updateCandidate(candidate.localId, { keywordsText: event.target.value })}
                  />
                  <Space size={4} wrap>
                    {splitKeywords(candidate.keywordsText).map(keyword => <Tag key={keyword}>{keyword}</Tag>)}
                  </Space>
                  <Input.TextArea
                    rows={2}
                    maxLength={1000}
                    showCount
                    value={candidate.extractionReason}
                    placeholder="抽取理由"
                    onChange={(event) => updateCandidate(candidate.localId, { extractionReason: event.target.value })}
                  />
                  <Input.TextArea
                    rows={2}
                    maxLength={1000}
                    showCount
                    value={candidate.warnings?.join('\n') ?? ''}
                    placeholder="警告提示，每行一条；不会阻塞保存"
                    onChange={(event) => updateCandidate(candidate.localId, {
                      warnings: event.target.value.split('\n').map(warning => warning.trim()).filter(Boolean),
                    })}
                  />
                  {candidate.warnings?.length ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="此候选包含提示"
                      description={candidate.warnings.join('；')}
                    />
                  ) : null}
                </Space>
              </Card>
            ))}
            <Flex align="center" justify="space-between" gap={12} wrap="wrap">
              <Pagination
                current={extractPage}
                pageSize={extractPageSize}
                total={extractCandidates.length}
                showSizeChanger={false}
                onChange={setExtractPage}
              />
              <Button type="primary" loading={extractSaving} onClick={handleSaveDrafts}>
                保存为草稿
              </Button>
            </Flex>
          </Space>
        )}
      </Space>
    </Card>
  );

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
        isNew ? (
          <Tabs
            items={[
              { key: 'manual', label: '手动录入', children: manualForm },
              { key: 'extract', label: '从文本抽取', children: extractPanel },
            ]}
          />
        ) : manualForm
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
