import React, { useState } from 'react';
import { App, Button, DatePicker, Modal, Radio, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';

type ScheduleType = 'scheduled' | 'after';
type AutoPublishStrategy = 'round_robin' | 'random';

interface AutoPublishModalProps {
  open: boolean;
  articleIds: number[];
  onClose: () => void;
  onSubmitted: () => void;
}

const AutoPublishModal: React.FC<AutoPublishModalProps> = ({ open, articleIds, onClose, onSubmitted }) => {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [strategy, setStrategy] = useState<AutoPublishStrategy>('round_robin');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('after');
  const [scheduleDate, setScheduleDate] = useState<string | null>(() => dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm'));

  const handleSubmit = async () => {
    if (articleIds.length === 0) {
      message.warning('请先选择文章');
      return;
    }
    if (!scheduleDate) {
      message.warning('请选择发布时间');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/publishing-schedule/auto', {
        article_ids: articleIds,
        strategy,
        schedule_type: scheduleType,
        scheduled_publish_at: scheduleDate,
      });
      const created = res.data?.data?.created ?? articleIds.length;
      message.success(`已创建 ${created} 个发布计划`);
      onSubmitted();
      onClose();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '自动发布失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="一键自动发布"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>创建发布计划</Button>,
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          已选择 {articleIds.length} 篇文章，将按收藏的平台自动分配。每篇文章只会创建一个发布计划。第一版不支持尽快执行，避免测试阶段触发真实发布。
        </Typography.Text>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text strong>平台匹配方式</Typography.Text>
          <Radio.Group
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="round_robin">循环匹配</Radio.Button>
            <Radio.Button value="random">随机匹配</Radio.Button>
          </Radio.Group>
        </Space>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text strong>发布策略</Typography.Text>
          <Radio.Group
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="scheduled">指定时间执行</Radio.Button>
            <Radio.Button value="after">此时间之后执行</Radio.Button>
          </Radio.Group>
        </Space>

        <DatePicker
          showTime
          style={{ width: '100%' }}
          value={scheduleDate ? dayjs(scheduleDate) : null}
          onChange={(_date: Dayjs | null, dateString: string | null) => {
            setScheduleDate(dateString || null);
          }}
          format="YYYY-MM-DD HH:mm"
          placeholder="选择发布时间"
        />
      </Space>
    </Modal>
  );
};

export default AutoPublishModal;
