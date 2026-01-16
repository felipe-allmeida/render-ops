'use client';

import React from 'react';
import { registry } from '@/lib/registry';
import { useActions } from './providers/action-provider';
import { getValueByPath } from '@/lib/utils';
import { useData } from './providers/data-provider';

export interface UIElement {
  type: string;
  props: Record<string, unknown>;
  children?: UIElement[];
  visible?: VisibilityCondition;
}

interface VisibilityCondition {
  path?: string;
  auth?: 'signedIn' | 'signedOut';
  and?: VisibilityCondition[];
  or?: VisibilityCondition[];
  not?: VisibilityCondition;
  eq?: { path: string; value: unknown };
}

interface RendererProps {
  tree: UIElement | UIElement[] | null;
  isAuthenticated?: boolean;
}

export function Renderer({ tree, isAuthenticated = true }: RendererProps) {
  const { executeAction } = useActions();
  const { data } = useData();

  const evaluateVisibility = (condition: VisibilityCondition): boolean => {
    if (condition.path) {
      const value = getValueByPath(data, condition.path);
      return Boolean(value);
    }

    if (condition.auth) {
      if (condition.auth === 'signedIn') return isAuthenticated;
      if (condition.auth === 'signedOut') return !isAuthenticated;
    }

    if (condition.eq) {
      const value = getValueByPath(data, condition.eq.path);
      return value === condition.eq.value;
    }

    if (condition.and) {
      return condition.and.every(evaluateVisibility);
    }

    if (condition.or) {
      return condition.or.some(evaluateVisibility);
    }

    if (condition.not) {
      return !evaluateVisibility(condition.not);
    }

    return true;
  };

  const renderElement = (element: UIElement, index: number): React.ReactNode => {
    // Check visibility conditions
    if (element.visible && !evaluateVisibility(element.visible)) {
      return null;
    }

    const Component = registry[element.type];
    if (!Component) {
      console.warn(`Unknown component type: ${element.type}`);
      return null;
    }

    // Render children recursively
    const children = element.children?.map((child, childIndex) =>
      renderElement(child, childIndex)
    );

    return (
      <Component
        key={`${element.type}-${index}`}
        element={element}
        onAction={executeAction as (action: unknown) => void}
      >
        {children}
      </Component>
    );
  };

  if (!tree) {
    return null;
  }

  if (Array.isArray(tree)) {
    return <>{tree.map((element, index) => renderElement(element, index))}</>;
  }

  return <>{renderElement(tree, 0)}</>;
}
