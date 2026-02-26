'use client';

import { starkKeyToFullPublicKey } from '@/lib/utils';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Credential {
  credentialId: string;
  holderPublicKey: string;
  attributes: Record<string, any>;
  issuerSignedMessage: string;
  issuerMessageHash: string;
}

interface AttributeField {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  isNested?: boolean;
  children?: AttributeField[];
}

interface FormData {
  holderPublicKey: string;
}

interface AddCredentialFormProps {
  onCredentialAdded: (credential: Credential | Omit<Credential, 'issuerSignedMessage' | 'issuerMessageHash'>) => void;
}

function NestedFieldsEditor({
  fields,
  onFieldsChange,
  level = 0,
}: {
  fields: AttributeField[];
  onFieldsChange: (fields: AttributeField[]) => void;
  level?: number;
}) {
  const addField = () => {
    const newField: AttributeField = {
      key: '',
      value: '',
      type: 'string',
    };
    onFieldsChange([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<AttributeField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    );
    onFieldsChange(updatedFields);
  };

  const removeField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  };

  const addNestedField = (parentIndex: number) => {
    const newNestedField: AttributeField = {
      key: '',
      value: '',
      type: 'string',
    };
    
    const updatedFields = fields.map((field, i) => {
      if (i === parentIndex) {
        return {
          ...field,
          isNested: true,
          children: [...(field.children || []), newNestedField],
        };
      }
      return field;
    });
    onFieldsChange(updatedFields);
  };

  const updateNestedField = (parentIndex: number, childIndex: number, updates: Partial<AttributeField>) => {
    const updatedFields = fields.map((field, i) => {
      if (i === parentIndex && field.children) {
        return {
          ...field,
          children: field.children.map((child, j) =>
            j === childIndex ? { ...child, ...updates } : child
          ),
        };
      }
      return field;
    });
    onFieldsChange(updatedFields);
  };

  const removeNestedField = (parentIndex: number, childIndex: number) => {
    const updatedFields = fields.map((field, i) => {
      if (i === parentIndex && field.children) {
        const newChildren = field.children.filter((_, j) => j !== childIndex);
        return {
          ...field,
          children: newChildren,
          isNested: newChildren.length > 0,
        };
      }
      return field;
    });
    onFieldsChange(updatedFields);
  };

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-4 pl-4 border-l border-gray-700' : ''}`}>
      {fields.map((field, index) => (
        <div key={index} className="space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Key"
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
              className="col-span-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
            />
            
            <select
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value as any })}
              className="col-span-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="object">Object</option>
            </select>

            {field.type !== 'object' && (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                placeholder="Value"
                value={field.value}
                onChange={(e) => updateField(index, { value: e.target.value })}
                className="col-span-5 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
              />
            )}

            <div className="col-span-2 flex gap-1">
              {field.type === 'object' && (
                <button
                  type="button"
                  onClick={() => addNestedField(index)}
                  className="px-2 py-1 bg-[#A855F7] text-white rounded text-xs hover:bg-[#9333EA] transition-colors"
                >
                  + Nested
                </button>
              )}
              <button
                type="button"
                onClick={() => removeField(index)}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          {field.isNested && field.children && (
            <NestedFieldsEditor
              fields={field.children}
              onFieldsChange={(newChildren) => updateField(index, { children: newChildren })}
              level={level + 1}
            />
          )}
        </div>
      ))}
      
      <button
        type="button"
        onClick={addField}
        className="px-4 py-2 bg-[#00D9FF]/20 border border-[#00D9FF]/30 text-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/30 transition-colors text-sm"
      >
        + Add Field
      </button>
    </div>
  );
}

export default function AddCredentialForm({ onCredentialAdded }: AddCredentialFormProps) {
  const [formData, setFormData] = useState<FormData>({
    holderPublicKey: '',
  });
  const [attributeFields, setAttributeFields] = useState<AttributeField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const buildAttributesObject = (fields: AttributeField[]): Record<string, any> => {
    const result: Record<string, any> = {};
    
    fields.forEach(field => {
      if (!field.key.trim()) return;
      
      if (field.type === 'object' && field.children) {
        result[field.key] = buildAttributesObject(field.children);
      } else if (field.type === 'number') {
        result[field.key] = parseFloat(field.value) || 0;
      } else if (field.type === 'boolean') {
        result[field.key] = field.value.toLowerCase() === 'true';
      } else {
        result[field.key] = field.value;
      }
    });
    
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate form
      if (!formData.holderPublicKey.trim()) {
        throw new Error('Holder public key is required');
      }
      if (attributeFields.length === 0) {
        throw new Error('At least one attribute is required');
      }

      // Build attributes object
      const attributes = buildAttributesObject(attributeFields);
      
      // Generate credential ID
      const credentialId = uuidv4();
      
      // Create a simple signed message (in production, this should be properly signed)
      // const message = `credential:${credentialId}:${formData.holderPublicKey}`;
      // const issuerSignedMessage = message; // Placeholder - should be actual signature

      const credential: Omit<Credential, 'issuerSignedMessage' | 'issuerMessageHash'> = {
        credentialId,
        holderPublicKey: formData.holderPublicKey.trim(),
        attributes,
        // issuerSignedMessage,
      };

      onCredentialAdded(credential);

      // Reset form
      setFormData({
        holderPublicKey: '',
      });
      setAttributeFields([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Holder Public Key
        </label>
        <input
          type="text"
          value={formData.holderPublicKey}
          onChange={(e) => setFormData(prev => ({ ...prev, holderPublicKey: e.target.value }))}
          placeholder="0x..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent font-mono text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Credential Attributes
        </label>
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <NestedFieldsEditor
            fields={attributeFields}
            onFieldsChange={setAttributeFields}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400">✗</span>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg font-medium transition-all bg-[#00D9FF] text-black hover:bg-[#00BBFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting && (
          <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        )}
        {isSubmitting ? 'Adding...' : 'Add Credential'}
      </button>
    </form>
  );
}