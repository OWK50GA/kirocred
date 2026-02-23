'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccount, useSignTypedData } from '@starknet-react/core';
import { cairo, typedData } from 'starknet';
import WalletConnect from './WalletConnect';
import { hashAttributes } from '@/lib/utils';
import cryptoJs from 'crypto-js'

export interface Credential {
  holderPublicKey: string;
  credentialId: string;
  attributes: Record<string, any>;
  issuerSignedMessage: {
    r: string;
    s: string;
    recovery: string;
  };
}

interface AttributeField {
  key: string;
  value: string;
  type: 'string' | 'object';
  nestedFields?: AttributeField[];
}

interface FormData {
  holderPublicKey: string;
}

interface AddCredentialFormProps {
  onCredentialAdded: (credential: Credential) => void;
}

// Recursive component for nested fields
function NestedFieldsEditor({ 
  fields, 
  onChange, 
  depth = 0 
}: { 
  fields: AttributeField[]; 
  onChange: (fields: AttributeField[]) => void;
  depth?: number;
}) {
  const addField = () => {
    onChange([...fields, { key: '', value: '', type: 'string' }]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<AttributeField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const updateNestedFields = (index: number, nestedFields: AttributeField[]) => {
    updateField(index, { nestedFields });
  };

  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-4 mt-2' : ''}`}>
      {fields.map((field, index) => (
        <div key={index} className="border rounded p-3 bg-gray-50">
          <div className="flex gap-2 items-start mb-2">
            <input
              type="text"
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
              placeholder="Key"
              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            
            <select
              value={field.type}
              onChange={(e) => {
                const newType = e.target.value as 'string' | 'object';
                updateField(index, {
                  type: newType,
                  value: newType === 'string' ? field.value : '',
                  nestedFields: newType === 'object' ? (field.nestedFields || []) : undefined
                });
              }}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="string">String</option>
              <option value="object">Object</option>
            </select>
            
            <button
              type="button"
              onClick={() => removeField(index)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
            >
              ✕
            </button>
          </div>
          
          {field.type === 'string' ? (
            <input
              type="text"
              value={field.value}
              onChange={(e) => updateField(index, { value: e.target.value })}
              placeholder="Value"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          ) : (
            <div className="border-l-2 border-blue-300 pl-2">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Nested fields for "{field.key || 'unnamed'}":
              </div>
              <NestedFieldsEditor
                fields={field.nestedFields || []}
                onChange={(nestedFields) => updateNestedFields(index, nestedFields)}
                depth={depth + 1}
              />
              <button
                type="button"
                onClick={() => {
                  const current = field.nestedFields || [];
                  updateNestedFields(index, [...current, { key: '', value: '', type: 'string' }]);
                }}
                className="mt-2 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
              >
                + Add Nested Field
              </button>
            </div>
          )}
        </div>
      ))}
      
      {depth === 0 && (
        <button
          type="button"
          onClick={addField}
          className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
        >
          + Add Field
        </button>
      )}
    </div>
  );
}

export default function AddCredentialForm({ onCredentialAdded }: AddCredentialFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<AttributeField[]>([
    { key: '', value: '', type: 'string' }
  ]);
  const [isSigningLoading, setIsSigningLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      holderPublicKey: '',
    }
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSigningLoading(true);

    try {
      // Recursively convert attributes array to object
      const buildAttributesObject = (fields: AttributeField[]): Record<string, any> => {
        const obj: Record<string, any> = {};
        fields.forEach(attr => {
          if (attr.key) {
            if (attr.type === 'object' && attr.nestedFields) {
              obj[attr.key] = buildAttributesObject(attr.nestedFields);
            } else if (attr.type === 'string' && attr.value) {
              obj[attr.key] = attr.value;
            }
          }
        });
        return obj;
      };

      const attributesObj = buildAttributesObject(attributes);

      if (Object.keys(attributesObj).length === 0) {
        throw new Error('At least one attribute is required');
      }

      // Generate credential ID
      const credentialId = crypto.randomUUID();

      // const holderPubkeyHash = cryptoJs.algo.SHA224.create().update(data.holderPublicKey).finalize();
      // console.log("Hash: ", holderPubkeyHash);

      // Create message to sign
      const messageToSign = {
        domain: {
          name: 'Kirocred',
          version: '1',
          chainId: 'SN_SEPOLIA',
        },
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'felt' },
            { name: 'version', type: 'felt' },
            { name: 'chainId', type: 'felt' },
          ],
          Credential: [
            // { name: 'credentialId', type: 'felt' },
            { name: 'holderPublicKey', type: 'felt' },
            { name: 'attributesHash', type: 'felt' },
          ],
        },
        primaryType: 'Credential',
        message: {
          // credentialId: credentialId,
          holderPublicKey: cairo.felt("Holder Public Key"),
          // attributesHash: JSON.stringify(attributesObj),
          attributesHash: hashAttributes(attributesObj)
        },
      };

      // Sign the message with wallet
      const signature = await signTypedDataAsync(messageToSign as any);

      if (!signature || signature.length < 2) {
        throw new Error('Failed to sign message');
      }

      console.log(signature);

      const credential: Credential = {
        holderPublicKey: data.holderPublicKey,
        credentialId,
        attributes: attributesObj,
        issuerSignedMessage: {
          r: signature[1],
          s: signature[2],
          recovery: signature[0],
        },
      };

      console.log("Credential: ", credential);

      onCredentialAdded(credential);
      setSuccess(`Credential added! ID: ${credentialId}`);
      
      // Reset form
      reset();
      setAttributes([{ key: '', value: '', type: 'string' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credential');
    } finally {
      setIsSigningLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Add Credential</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <WalletConnect />
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Holder Public Key (Full - starts with 0x04...)
          </label>
          <input
            type="text"
            {...register('holderPublicKey', {
              required: 'Holder public key is required',
              pattern: {
                value: /^0x04[0-9a-fA-F]{128}$/,
                message: 'Must be a valid full public key (0x04 + 128 hex chars)'
              }
            })}
            placeholder="0x04..."
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          {errors.holderPublicKey && (
            <p className="text-red-600 text-xs mt-1">{errors.holderPublicKey.message}</p>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Attributes</h3>
          <NestedFieldsEditor fields={attributes} onChange={setAttributes} />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={!isConnected || isSigningLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningLoading ? 'Signing...' : 'Sign & Add Credential to Batch'}
        </button>
      </form>
    </div>
  );
}
