import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi } from 'vitest';

import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';

// ── Button ──────────────────────────────────────────────────────────
describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn.className).toContain('rose');
  });
});

// ── Badge ───────────────────────────────────────────────────────────
describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge color="emerald">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

// ── Input ───────────────────────────────────────────────────────────
describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Name" name="name" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

// ── Card ────────────────────────────────────────────────────────────
describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

// ── EmptyState ──────────────────────────────────────────────────────
describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Try adding something" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try adding something')).toBeInTheDocument();
  });
});
