/**
 * Tags Page
 *
 * Tag management page - create, edit, delete tags.
 */

import { useState } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useTags';
import { TAG_COLORS } from '../utils/constants';
import { getErrorMessage } from '../utils/helpers';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const Tags = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: TAG_COLORS[0] });
  const [error, setError] = useState('');

  const { data: tagsData, isLoading } = useTags();
  const tags = Array.isArray(tagsData) ? tagsData : [];
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  /**
   * Open modal for creating tag
   */
  const handleCreate = () => {
    setEditingTag(null);
    setFormData({ name: '', color: TAG_COLORS[0] });
    setError('');
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing tag
   */
  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color || TAG_COLORS[0] });
    setError('');
    setIsModalOpen(true);
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('Form submitted', formData);

    if (!formData.name) {
      setError('Tag name is required');
      return;
    }

    try {
      if (editingTag) {
        console.log('Updating tag', editingTag.id, formData);
        await updateMutation.mutateAsync({ id: editingTag.id, data: formData });
      } else {
        console.log('Creating tag', formData);
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Tag save error:', err);
      setError(getErrorMessage(err));
    }
  };

  /**
   * Handle tag deletion with confirmation
   */
  const handleDelete = async (tag) => {
    if (window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all prospects.`)) {
      try {
        await deleteMutation.mutateAsync(tag.id);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
            <p className="mt-1 text-sm text-gray-600">
              Organize your prospects with custom tags
            </p>
          </div>
          <Button variant="primary" onClick={handleCreate}>
            Create Tag
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Tags List */}
        {!isLoading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {tags.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No tags yet. Create your first tag!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Color Indicator */}
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />

                      {/* Tag Info */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{tag.name}</h3>
                        <p className="text-sm text-gray-500">
                          {tag.prospects_count || 0} {tag.prospects_count === 1 ? 'prospect' : 'prospects'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(tag)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTag ? 'Edit Tag' : 'Create Tag'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Tag Name */}
            <Input
              label="Tag Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Lead, CEO, Marketing"
              required
            />

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-linkedin scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={() => console.log('Button clicked', formData)}
              >
                {editingTag ? 'Update Tag' : 'Create Tag'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Tags;
