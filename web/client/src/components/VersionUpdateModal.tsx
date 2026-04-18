import { useState } from 'react';
import { Modal, Button, Space, Typography, Alert, Spin } from 'antd';
import { RocketOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface VersionUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  onClose: () => void;
  onUpgrade: () => Promise<{ success: boolean; requiresSudo?: boolean; message?: string }>;
}

export default function VersionUpdateModal({
  visible,
  currentVersion,
  latestVersion,
  onClose,
  onUpgrade,
}: VersionUpdateModalProps) {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresSudo, setRequiresSudo] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    setSuccessMessage(null);
    setRequiresSudo(false);

    try {
      const result = await onUpgrade();

      if (!result.success) {
        if (result.requiresSudo) {
          setRequiresSudo(true);
          setError(result.message || '需要管理员权限');
        } else {
          setError(result.message || '升级失败');
        }
        setUpgrading(false);
      } else {
        // 升级成功
        setSuccessMessage(result.message || '升级成功');
        setUpgrading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '升级失败');
      setUpgrading(false);
    }
  };

  const handleClose = () => {
    if (!upgrading) {
      onClose();
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      closable={!upgrading}
      maskClosable={!upgrading}
      width={500}
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <RocketOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3} style={{ marginBottom: 8 }}>
            发现新版本
          </Title>
          <Paragraph style={{ marginBottom: 0, color: '#666' }}>
            claude-evolution 有可用的更新版本
          </Paragraph>
        </div>

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>当前版本：</Text>
              <Text>{currentVersion}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>最新版本：</Text>
              <Text type="success" style={{ fontWeight: 600 }}>
                {latestVersion}
              </Text>
            </div>
          </Space>
        </div>

        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {error && (
          <Alert
            type="error"
            message={error}
            description={
              requiresSudo && (
                <div style={{ marginTop: 8 }}>
                  <Text>请在终端中手动执行：</Text>
                  <pre
                    style={{
                      background: '#fff',
                      padding: 8,
                      borderRadius: 4,
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    sudo npm install -g claude-evolution@latest
                  </pre>
                </div>
              )
            }
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {upgrading && (
          <Alert
            type="info"
            message={
              <Space>
                <Spin size="small" />
                <Text>正在升级并重启服务，请稍候...</Text>
              </Space>
            }
            showIcon={false}
            style={{ marginBottom: 24 }}
          />
        )}

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {!successMessage && (
            <Button
              icon={<CloseOutlined />}
              onClick={handleClose}
              disabled={upgrading}
            >
              稍后提醒
            </Button>
          )}
          {successMessage ? (
            <Button
              type="primary"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
                color: '#fff',
              }}
            >
              关闭
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleUpgrade}
              loading={upgrading}
              disabled={upgrading}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff',
                color: '#fff',
              }}
            >
              立即更新
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
}
