import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Space, 
  Card, 
  Typography, 
  Message, 
  Spin 
} from '@arco-design/web-react'
import { IconUpload } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

const { Title } = Typography
const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

// 默认空对象，防止 undefined 报错
const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA 
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  // 独立管理图片和视频的上传列表状态
  // Arco Design 的 Upload 组件需要特定格式的 fileList
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

  useEffect(() => {
    const fetchFormSchema = async () => {
      try {
        setLoading(true);
        // 1. 获取表单配置
        const response = await axios.get(`/api/form-schema/${schemaId}`);
        setSchema(response.data);
        
        // 2. 回填表单数据
        if (initialData) {
          form.setFieldsValue(initialData);
          
          // 回填图片列表（用于显示已有的图片）
          if (initialData.imageUrls && Array.isArray(initialData.imageUrls)) {
            const urls = initialData.imageUrls as string[];
            setImageFileList(urls.map((url, index) => ({
              uid: `img-${index}`, // 必须有唯一 uid
              name: `图片${index + 1}`,
              status: 'done', // 标记为已完成
              url: url,
              response: { url } // 为了保持结构一致
            })));
          }
          
          // 回填视频列表
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`,
              name: `视频${index + 1}`,
              status: 'done',
              url: url,
              response: { url }
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
  }, [schemaId, form, initialData]); // 依赖项改变时重新加载

  // 自定义上传逻辑
  const handleUpload = async (option: any) => {
    const { file, onSuccess, onError } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      // 调用后端上传接口
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 构造成功的文件对象
      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  // 提交处理
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 提取上传文件的 URL
      // 注意：这里需要兼容“新上传的文件”和“回填的旧文件”
      const finalValues = {
        ...values,
        imageUrls: imageFileList
          .filter((f: any) => f.status === 'done')
          .map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList
          .filter((f: any) => f.status === 'done')
          .map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        await onSubmit(finalValues);
      }
      
      // 提交成功后重置表单
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
    } catch (error) {
      console.error('提交过程中发生错误');
      // 这里不抛出错误，因为外层通常不需要捕获这个内部组装逻辑的错误
    } finally {
      setLoading(false);
    }
  };

  // 动态渲染字段
  const renderField = (field: FormField) => {
    // 通用校验规则
    const rules = [{ 
      required: field.required, 
      message: `${field.label}是必填项`,
      // 对于数组类型（如多图），校验数组长度；其他为字符串或数字
      type: field.multiple ? 'array' : (field.type === 'number' ? 'number' : 'string') 
    }];

    const commonProps = {
      field: field.name,
      label: field.label,
      required: field.required,
      rules: rules as any // 类型断言规避复杂类型报错
    };

    // --- 文件上传类型 ---
    if (field.type === 'file') {
      const isImage = field.name.toLowerCase().includes('image');
      const currentFileList = isImage ? imageFileList : videoFileList;
      const setFileList = isImage ? setImageFileList : setVideoFileList;
      const acceptType = isImage ? 'image/*' : 'video/*';
      const tipText = isImage ? '点击上传图片' : '点击上传视频';

      return (
        <Form.Item 
          key={field.name} 
          label={field.label} 
          field={field.name} // 必须绑定 field 才能触发 Form 的校验
          required={field.required}
          rules={[{ 
            required: field.required, 
            validator: (value, cb) => {
              if (field.required) {
                // 检查 fileList 是否为空
                if (currentFileList.length === 0) {
                  return cb(`请至少上传一个${field.label}`);
                }
                // 检查是否有上传失败或上传中的文件（可选严格模式）
                const hasDone = currentFileList.some(f => f.status === 'done');
                if (!hasDone) {
                   return cb(`请等待${field.label}上传完成`);
                }
              }
              cb();
            }
          }]}
        >
          <Upload
            multiple={field.multiple}
            limit={10} // 限制最大上传数量
            listType={isImage ? "picture-card" : "text"}
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            disabled={field.disabled} // 支持禁用
            onChange={(fileList) => {
              setFileList(fileList);
              
              // 构造 URL 数组用于 form 字段值的同步
              const successUrls = fileList
                .filter(f => f.status === 'done')
                .map(f => (f.response as any)?.url || f.url);
              
              // 手动触发字段值的更新和校验
              form.setFieldValue(field.name, successUrls);
              form.validate([field.name]); 
            }}
            onRemove={(file) => {
              // 处理删除逻辑
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              
              const successUrls = newList
                .filter(f => f.status === 'done')
                .map(f => (f.response as any)?.url || f.url);
              
              form.setFieldValue(field.name, successUrls);
              form.validate([field.name]);
            }}
          >
            {/* 上传按钮 UI */}
            {isImage ? (
              <div style={{ textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 20 }}/>
                <div style={{ marginTop: 8, fontSize: 12 }}>上传</div>
              </div>
            ) : (
              <Button icon={<IconUpload />}>{tipText}</Button>
            )}
          </Upload>
        </Form.Item>
      );
    }

    // --- 普通输入类型 ---
    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input 
              placeholder={field.placeholder} 
              maxLength={field.maxLength} 
              disabled={field.disabled} // 🚀 关键修复：支持 disabled
            />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input 
              type="number" 
              placeholder={field.placeholder} 
              disabled={field.disabled} // 🚀 关键修复：支持 disabled
            />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input.TextArea 
              rows={4} 
              placeholder={field.placeholder} 
              maxLength={field.maxLength} 
              disabled={field.disabled} // 🚀 关键修复：支持 disabled
            />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Select 
              placeholder={field.placeholder} 
              disabled={field.disabled} // 🚀 关键修复：支持 disabled
            >
              {field.options?.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
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
    <Card bordered={false} bodyStyle={{ padding: 0 }}>
      {/* 标题 */}
      <Title heading={4} style={{ marginTop: 0, marginBottom: 24 }}>
        {schema.title}
      </Title>
      
      {/* 表单主体 */}
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        
        {/* 操作按钮 */}
        <Form.Item style={{ marginTop: 20 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              提交
            </Button>
            <Button 
              size="large"
              onClick={() => {
                form.resetFields();
                setImageFileList([]);
                setVideoFileList([]);
              }}
            >
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DynamicForm;