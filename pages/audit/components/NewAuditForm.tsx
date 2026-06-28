import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Breadcrumb,
  Alert,
  App,
  Progress,
  Descriptions,
  Tag,
  Space,
} from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import apiClient from '../../lib/apiClient';
import type { DetectResponse } from '../../../apis/audit/entity/audit.entity';

interface NewAuditFormProps {
  onBack: () => void;
  onCreated: (jobId: string) => void;
}

/**
 * 新建诊断表单 — 编排 detect → create → execute → 轮询 status
 */
const NewAuditForm: React.FC<NewAuditFormProps> = ({ onBack, onCreated }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [detecting, setDetecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; status: string } | null>(null);
  const [detected, setDetected] = useState<DetectResponse | null>(null);

  /** 点击「检测」按钮 */
  const handleDetect = async () => {
    try {
      const website = form.getFieldValue('website');
      if (!website) {
        message.warning('请先输入目标网址');
        return;
      }
      setDetecting(true);
      const res = await apiClient.post('/audit/detect', { website });
      const data: DetectResponse = res.data.data;
      setDetected(data);
      form.setFieldsValue({
        brand: data.brand,
        industry: data.industry,
      });
      message.success('已自动识别品牌名');
    } catch (err: any) {
      message.error(err?.response?.data?.message || '品牌检测失败');
    } finally {
      setDetecting(false);
    }
  };

  /** 提交表单 → 创建诊断 → 触发执行 → 轮询 */
  const handleSubmit = async (values: any) => {
    try {
      setCreating(true);
      const createRes = await apiClient.post('/audit', {
        website: values.website,
        brand: values.brand,
        industry: values.industry,
        description: values.description,
        competitors: detected?.competitors,
        keywords: detected?.keywords,
        features: detected?.features,
        tier: 'pro',
      });
      const { jobId, total } = createRes.data.data;

      // 立即触发执行
      await apiClient.post(`/audit/${jobId}/execute`);
      message.success(`已创建并开始执行（共 ${total} 个提示词 × 引擎组合）`);

      // 轮询进度
      setProgress({ done: 0, total, status: 'processing' });
      const poll = setInterval(async () => {
        try {
          const s = await apiClient.get(`/audit/${jobId}/status`);
          const data = s.data.data;
          setProgress({ done: data.done, total: data.total, status: data.status });
          if (data.status === 'complete' || data.status === 'failed') {
            clearInterval(poll);
            if (data.status === 'complete') {
              message.success('诊断已完成');
              onCreated(jobId);
            } else {
              message.error('诊断任务执行失败');
            }
          }
        } catch {
          // 忽略瞬时网络错误
        }
      }, 3000);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建诊断任务失败');
    } finally {
      setCreating(false);
    }
  };

  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '诊断管理' }, { title: '新建诊断' }]} />
      </div>

      <Card
        title={
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回列表
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="诊断流程"
          description="输入目标网址 → 自动识别品牌信息 → 生成跨引擎提示词计划 → 触发批量执行 → 完成后查看完整报告。"
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
          style={{ maxWidth: 720 }}
        >
          <Form.Item
            name="website"
            label="目标网址"
            rules={[{ required: true, message: '请输入目标网址' }]}
            extra={
              <Button
                type="link"
                size="small"
                icon={<SearchOutlined />}
                onClick={handleDetect}
                loading={detecting}
                style={{ paddingLeft: 0 }}
              >
                自动识别品牌
              </Button>
            }
          >
            <Input placeholder="例如：https://www.example.com" />
          </Form.Item>

          {detected && (
            <Descriptions
              size="small"
              bordered
              column={1}
              style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
              items={[
                ...(detected.industry ? [{ key: 'industry', label: '行业', children: detected.industry }] : []),
                ...(detected.keywords?.length ? [{
                  key: 'keywords',
                  label: '关键词',
                  children: (
                    <Space size={4} wrap>
                      {detected.keywords.map((k, i) => <Tag key={i}>{k}</Tag>)}
                    </Space>
                  ),
                }] : []),
                ...(detected.competitors?.length ? [{
                  key: 'competitors',
                  label: '竞品',
                  children: (
                    <Space size={4} wrap>
                      {detected.competitors.map((k, i) => <Tag key={i} color="orange">{k}</Tag>)}
                    </Space>
                  ),
                }] : []),
              ]}
            />
          )}

          <Form.Item
            name="brand"
            label="品牌名"
            rules={[{ required: true, message: '请输入品牌名' }]}
          >
            <Input placeholder="自动检测或手动填写" />
          </Form.Item>

          <Form.Item name="industry" label="行业">
            <Input placeholder="例如：CRM、电商 SaaS、AI 引擎优化" />
          </Form.Item>

          <Form.Item name="description" label="品牌描述（可选）">
            <Input.TextArea rows={3} placeholder="简要描述品牌的核心产品/服务，便于精确生成提示词" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              开始诊断
            </Button>
          </Form.Item>
        </Form>

        {progress && (
          <Card size="small" style={{ marginTop: 16, maxWidth: 720 }}>
            <Progress
              percent={pct}
              status={progress.status === 'failed' ? 'exception' : progress.status === 'complete' ? 'success' : 'active'}
            />
            <div style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
              已完成 {progress.done} / {progress.total} 条提示词查询
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default NewAuditForm;
