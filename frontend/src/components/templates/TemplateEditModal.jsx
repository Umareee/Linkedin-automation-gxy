/**
 * Template Edit Modal
 *
 * Modal for editing existing message templates.
 */

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useUpdateTemplate } from '../../hooks/useTemplates';

const TemplateEditModal = ({ isOpen, onClose, template }) => {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
  });
  const [errors, setErrors] = useState({});

  const { mutate: updateTemplate, isPending } = useUpdateTemplate();

  // Character limits based on type
  const maxLength = template?.type === 'invitation' ? 300 : 5000;
  const currentLength = formData.content.length;

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content,
      });
    }
  }, [template]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Message content is required';
    }
    if (formData.content.length > maxLength) {
      newErrors.content = `Message must be ${maxLength} characters or less`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Update template
    updateTemplate(
      {
        id: template.id,
        data: {
          name: formData.name,
          content: formData.content,
        },
      },
      {
        onSuccess: () => {
          // Reset form and close modal
          setFormData({ name: '', content: '' });
          setErrors({});
          onClose();
        },
        onError: (error) => {
          // Handle API errors
          if (error.response?.data?.errors) {
            setErrors(error.response.data.errors);
          }
        },
      }
    );
  };

  const handleClose = () => {
    setFormData({ name: '', content: '' });
    setErrors({});
    onClose();
  };

  const typeLabel = template?.type === 'invitation' ? 'Invitation Message' : 'Direct Message';

  if (!template) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${typeLabel} Template`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-linkedin ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Tech Startup Outreach"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Info Banner */}
        {template.type === 'invitation' && (
          <div className="bg-blue-50 border-l-4 border-linkedin p-3">
            <p className="text-sm text-blue-700">
              Invitation messages are sent with connection requests and have a <strong>300 character limit</strong>.
            </p>
          </div>
        )}

        {/* Message Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Message Content <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={6}
            maxLength={maxLength}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-linkedin resize-none ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={
              template.type === 'invitation'
                ? "Hi [Name], I'd love to connect and learn more about your work..."
                : 'Write your message template here...'
            }
          />
          <div className="flex justify-between items-center mt-1">
            <div>
              {errors.content && <p className="text-red-500 text-sm">{errors.content}</p>}
            </div>
            <p
              className={`text-sm ${
                currentLength > maxLength ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {currentLength} / {maxLength}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TemplateEditModal;
