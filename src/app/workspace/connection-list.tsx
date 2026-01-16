'use client';

import { useState } from 'react';

interface Connection {
  id: string;
  name: string;
  createdAt: string;
}

interface ConnectionListProps {
  connections: Connection[];
  isLoading: boolean;
  onSelect: (connection: Connection) => void;
  onDelete: (id: string) => void;
}

export function ConnectionList({
  connections,
  isLoading,
  onSelect,
  onDelete,
}: ConnectionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(id);
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No connections yet
        </h3>
        <p className="text-gray-500">
          Add your first PostgreSQL connection to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {connections.map((connection) => (
        <div
          key={connection.id}
          onClick={() => onSelect(connection)}
          className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                {connection.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Created {new Date(connection.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(e, connection.id)}
              disabled={deletingId === connection.id}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {deletingId === connection.id ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-600">
            <span>Select tables</span>
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
