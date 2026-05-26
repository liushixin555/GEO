import { useState, useEffect, useCallback, memo } from 'react';
import { Typography, Button, Card, Space, Alert, Skeleton, Breadcrumb } from 'antd';
import { LinkOutlined, ApiOutlined, SafetyCertificateOutlined, GlobalOutlined } from '@ant-design/icons';

const SWAGGER_UI_PATH = '/api-docs/' as const;
const SWAGGER_HEALTH_PATH = '/api-docs/health' as const;

const ApiDocsPage = memo(function ApiDocsPage() {
  const [apiDocsAvailable, setApiDocsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = 'API 文档 - 薄云商机倍增服务';
  }, []);

  const checkAvailability = useCallback((signal: AbortSignal) => {
    fetch(SWAGGER_HEALTH_PATH, { method: 'GET', signal })
      .then(res => setApiDocsAvailable(res.ok))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[Swagger] 可用性检查失败:', err.message);
        }
        setApiDocsAvailable(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkAvailability(controller.signal);
    return () => controller.abort();
  }, [checkAvailability]);

  const recheck = useCallback(() => {
    setApiDocsAvailable(null);
    const controller = new AbortController();
    checkAvailability(controller.signal);
  }, [checkAvailability]);

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: 'API 文档' }]} />
      </div>
      <Card bordered className="api-docs-card">
        <Space orientation="vertical" size="large" className="api-docs-content" aria-live="polite">
          <Space size={8} align="center">
            <ApiOutlined className="api-docs-title-icon" />
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 400 }}>
              API 文档
            </Typography.Title>
          </Space>
          <Typography.Text type="secondary">
            查看、测试和管理所有 API 接口。
            支持在线调试、参数说明和响应示例查看。
          </Typography.Text>
          <Space orientation="vertical" size={4}>
            <Space size={4}>
              <GlobalOutlined />
              <Typography.Text type="secondary">
                基础路径：<Typography.Text code>/api</Typography.Text>
              </Typography.Text>
            </Space>
            <Space size={4}>
              <SafetyCertificateOutlined />
              <Typography.Text type="secondary">
                认证方式：JWT Bearer Token
              </Typography.Text>
            </Space>
          </Space>
          {apiDocsAvailable === null && (
            <Skeleton active paragraph={{ rows: 2 }} />
          )}
          {apiDocsAvailable === true && (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href={SWAGGER_UI_PATH}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在新窗口打开 API 文档"
            >
              打开 API 文档
            </Button>
          )}
          {apiDocsAvailable === false && (
            <Alert
              type="info"
              message="API 文档服务当前不可用"
              description="API 文档服务暂不可用，请联系系统管理员。"
              showIcon
              action={<Button size="small" onClick={recheck}>重新检测</Button>}
            />
          )}
        </Space>
      </Card>
    </div>
  );
});

export default ApiDocsPage;
