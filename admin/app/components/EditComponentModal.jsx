import React, { useState, useEffect } from 'react';

const EditComponentModal = ({ isOpen, onClose, component, onSave }) => {
  const [name, setName] = useState('');
  const [colors, setColors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (component) {
      setName(component.name || '');
      setColors(component.colors || []);
    }
  }, [component]);

  if (!isOpen || !component) return null;

  const handleColorChange = (index, field, value) => {
    const updatedColors = [...colors];
    updatedColors[index] = { ...updatedColors[index], [field]: value };
    setColors(updatedColors);
  };

  const addColorField = () => {
    setColors([...colors, { colorName: '', colorCode: '', price: '' }]);
  };

  const removeColorField = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave(component._id, { name, colors });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
          Edit Component
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Component Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Colors / Variants
              </label>
              <button
                type="button"
                onClick={addColorField}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add Variant
              </button>
            </div>

            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Color Name"
                  value={color.colorName || ''}
                  onChange={(e) =>
                    handleColorChange(index, 'colorName', e.target.value)
                  }
                  className="w-1/3 px-2 py-1 border border-slate-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-800"
                />
                <input
                  type="text"
                  placeholder="Price"
                  value={color.price || ''}
                  onChange={(e) =>
                    handleColorChange(index, 'price', e.target.value)
                  }
                  className="w-1/3 px-2 py-1 border border-slate-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => removeColorField(index)}
                  className="text-red-500 text-xs px-2 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditComponentModal;
