import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Card, 
  Message, 
  Spin,
  Image,
  Modal
} from '@arco-design/web-react'
import { IconPlus, IconPlayCircle, IconDelete, IconEye } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  onCancel?: () => void;
  okText?: string;
}

const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA,
  onCancel,
  okText = '提交'
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [previewVideoSrc, setPreviewVideoSrc] = useState('');

  useEffect(() => {
    const fetchFormSchema = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/form-schema/${schemaId}`);
        setSchema(response.data);
        
        if (initialData) {
          form.setFieldsValue(initialData);
          
          if (initialData.imageUrls && Array.isArray(initialData.imageUrls)) {
            const urls = initialData.imageUrls as string[];
            setImageFileList(urls.map((url, index) => ({
              uid: `img-${index}`, name: `图片${index + 1}`, status: 'done', url: url
            })));
          }
          
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`, name: `视频${index + 1}`, status: 'done', url: url
            })));
          }
        }
      } catch (error) {
        console.error('获取表单配置失败:', error);
        Message.error('加载表单配置失败');
      } finally {
        setLoading(false);
      }
    };

    fetchFormSchema();
  }, [schemaId, form, initialData]);

  const handleUpload = async (option: any) => {
    const { file, onSuccess, onError, onProgress } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      });

      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  const handlePreview = (file: any) => {
    const url = file.url || (file.originFile && URL.createObjectURL(file.originFile));
    if (!url) return;

    const isVideo = 
      file.name?.match(/\.(mp4|webm|ogg|mov)$/i) || 
      file.type?.includes('video') || 
      videoFileList.find(v => v.uid === file.uid);

    if (isVideo) {
      setPreviewVideoSrc(url);
      setVideoModalVisible(true);
    } else {
      setPreviewImageSrc(url);
      setPreviewVisible(true);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const finalValues = {
        ...values,
        imageUrls: imageFileList
            .filter((f: any) => f.status === 'done' || f.url) 
            .map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList
            .filter((f: any) => f.status === 'done' || f.url)
            .map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        await onSubmit(finalValues);
      }
      
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
      
    } catch (error) {
      console.error('提交过程中发生错误:', error);
      Message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      field: field.name,
      label: field.label,
      disabled: field.disabled,
    };

    const processRules = (rules?: any[]) => {
      if (!rules) return undefined;
      return rules.map(rule => {
        // 如果后端传来了 pattern 字符串
        if (rule.pattern && typeof rule.pattern === 'string') {
          return { 
            ...rule, 
            match: new RegExp(rule.pattern) // 还原为正则对象
          };
        }
        return rule;
      });
    };

    const fieldRules = processRules(field.rules) || [
      { 
        required: field.required, 
        message: `请输入${field.label}`, 
        type: field.type === 'number' ? 'number' : 'string'
      }
    ];

    if (field.type === 'file') {
      const isImage = field.name.toLowerCase().includes('image');
      const currentFileList = isImage ? imageFileList : videoFileList;
      const setFileList = isImage ? setImageFileList : setVideoFileList;
      const acceptType = isImage ? 'image/*' : 'video/*';
      
      return (
        <Form.Item 
          key={field.name} 
          {...commonProps}
          trigger="onChange" 
          required={field.required} // 这里的 required 只负责显示红星
          rules={[
            { 
              // 🚀 核心修复：使用 callback 方式进行自定义校验
              validator: (value, callback) => {
                // value 是 Form 层面感知到的值，currentFileList 是组件 state
                // 优先使用 value，防止 state 更新延迟导致校验不同步
                const list = Array.isArray(value) ? value : currentFileList;
                
                // 1. 必填校验：检查 list 是否为空数组
                if (field.required) {
                   if (!list || list.length === 0) {
                     return callback(`请至少上传一个${field.label}`);
                   }
                }

                // 2. 错误文件校验
                if (list && list.some((f: any) => f.status === 'error')) {
                   return callback(`${field.label}上传失败，请删除重试`);
                }
                
                // 校验通过
                callback();
              }
            }
          ]}
        >
          <Upload
            multiple={field.multiple}
            limit={10}
            listType="picture-card"
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            disabled={field.disabled}
            beforeUpload={(file) => {
              const isLt500M = file.size < 500 * 1024 * 1024;
              if (!isLt500M) {
                Message.error(`文件 ${file.name} 超过 500MB，无法上传`);
                return false;
              }
              return true;
            }}
            onChange={(fileList) => {
              setFileList(fileList);
              // 🟢 更新表单值
              form.setFieldValue(field.name, fileList);
              // 🟢 立即触发校验，消除错误提示
              form.validate([field.name]).catch(() => {}); 
            }}
            onPreview={handlePreview}
            onRemove={(file) => {
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              form.setFieldValue(field.name, newList);
              form.validate([field.name]).catch(() => {});
            }}
            renderUploadItem={(itemNode, file) => {
              const fileUrl = file.url || (file.response as any)?.url || (file.originFile && URL.createObjectURL(file.originFile));

              if (file.status === 'uploading' || file.status === 'error') {
                return itemNode;
              }
              const isVideo = !isImage;

              return (
                <div className="arco-upload-list-item arco-upload-list-item-done">
                  <div className="arco-upload-list-item-picture custom-media-card">
                    {isVideo ? (
                      <>
                        <video
                          className="custom-media-content"
                          src={`${fileUrl}#t=0.5`}
                          preload="metadata"
                          muted
                        />
                        <div className="play-icon-overlay"><IconPlayCircle /></div>
                      </>
                    ) : (
                      <img className="custom-media-content" src={fileUrl} alt="preview" />
                    )}
                    <div className="custom-mask">
                      <IconEye className="action-icon" onClick={() => handlePreview(file)} />
                      <IconDelete 
                        className="action-icon" 
                        onClick={() => {
                          const newList = currentFileList.filter(item => item.uid !== file.uid);
                          setFileList(newList);
                          form.setFieldValue(field.name, newList);
                          form.validate([field.name]).catch(() => {});
                        }} 
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4E5969', height: '100%' }}>
              <IconPlus style={{ fontSize: 24, color: '#86909c', marginBottom: 4 }} />
            </div>
          </Upload>
        </Form.Item>
      );
    }

    // 其他字段...
    const defaultRules = [{ 
        required: field.required, 
        message: `请输入${field.label}`, // 优化默认提示语
        type: field.type === 'number' ? 'number' : 'string'
    }];

    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.name} {...commonProps} rules={fieldRules}>
            <Input placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps} rules={fieldRules}>
            <Input type="number" placeholder={field.placeholder} disabled={field.disabled} />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps} rules={fieldRules}>
            <Input.TextArea rows={4} placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Select placeholder={field.placeholder} disabled={field.disabled}>
              {field.options?.map((option) => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };

  if (loading && !schema) return <div style={{textAlign: 'center', padding: 20}}><Spin /></div>;
  if (!schema) return <Card>配置不存在</Card>;

  return (
    <div style={{ padding: '0 12px' }}>
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        
        <div style={{ 
          marginTop: 32, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #f2f3f5',
          paddingTop: 24
        }}>
          <Button onClick={onCancel} style={{ padding: '0 24px' }}>取消</Button>
          <Button onClick={() => { form.resetFields(); setImageFileList([]); setVideoFileList([]); }} style={{ padding: '0 24px' }}>
            重置
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ padding: '0 32px' }}>
            {okText}
          </Button>
        </div>
      </Form>

      <Image.Preview
        visible={previewVisible}
        src={previewImageSrc}
        onVisibleChange={setPreviewVisible}
      />

      <Modal
        title={null}
        visible={videoModalVisible}
        footer={null}
        closable={false}
        onCancel={() => setVideoModalVisible(false)}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'transparent' 
        }}>
          <video 
            src={previewVideoSrc} 
            controls 
            autoPlay 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              borderRadius: 8, 
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              outline: 'none'
            }} 
          />
        </div>
      </Modal>
    </div>
  );
};

export default DynamicForm;