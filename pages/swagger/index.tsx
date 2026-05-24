import React, { useState, useEffect, memo } from 'react';
import { Typography, Button, Card, Space, Breadcrumb, Alert, Spin, Divider } from 'antd';
import { LinkOutlined, ApiOutlined, SafetyCertificateOutlined, GlobalOutlined } from '@ant-design/icons';

const ApiDocsPage: React.FC = memo(() => {
  const [apiDocsAvailable, setApiDocsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = 'API 文档 - 薄云商机倍增服务';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api-docs/', { method: 'HEAD', signal: controller.signal })
      .then(res => setApiDocsAvailable(res.ok))
      .catch(() => setApiDocsAvailable(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: 'API 文档' }]} />
      </div>
      <Card variant="borderless" style={{ maxWidth: 600 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <ApiOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
            API 文档
          </Typography.Title>
          <Typography.Text type="secondary">
            查看、测试和管理所有 API 接口。
            支持在线调试、参数说明和响应示例查看。
          </Typography.Text>
          <div className="api-docs-info">
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              <GlobalOutlined style={{ marginRight: 4 }} />
              基础路径：<Typography.Text code>/api</Typography.Text>
            </Typography.Text>
            <Divider type="vertical" />
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              <SafetyCertificateOutlined style={{ marginRight: 4 }} />
              认证方式：JWT Bearer Token
            </Typography.Text>
          </div>
          {apiDocsAvailable === null && <Spin size="small" />}
          {apiDocsAvailable === true && (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href="/api-docs/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在新窗口打开 API 文档"
              style={{ whiteSpace: 'nowrap' }}
            >
              打开 API 文档
            </Button>
          )}
          {apiDocsAvailable === false && (
            <Alert
              type="info"
              message="API 文档服务当前不可用"
              description="API 文档服务未启用，请联系系统管理员或在开发环境中访问。"
              showIcon
            />
          )}
        </Space>
      </Card>
    </div>
  );
});

export default ApiDocsPage;
