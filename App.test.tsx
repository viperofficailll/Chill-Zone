import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, test, expect } from 'vitest';

// Mock dependencies
const queryClient = new QueryClient();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </Provider>
  );
};

// Mock getUserMedia
Object.defineProperty(window.navigator, 'mediaDevices', {
  value: {
    getUserMedia: () => Promise.resolve({
        getTracks: () => [],
    }),
  },
});

describe('App Component', () => {
  test('renders idle screen with start button', () => {
    renderWithProviders(<App />);
    const startButton = screen.getByText(/Start Video Chat/i);
    expect(startButton).toBeInTheDocument();
    expect(screen.getByText(/Chill-Zone/i)).toBeInTheDocument();
  });

  test('can select gender options', () => {
    renderWithProviders(<App />);
    const maleRadio = screen.getByLabelText('male');
    const femaleRadio = screen.getByLabelText('female');
    
    expect(maleRadio).toBeInTheDocument();
    fireEvent.click(femaleRadio);
    expect(femaleRadio).toBeChecked();
  });

  test('transitions to searching state on submit', async () => {
    renderWithProviders(<App />);
    const startButton = screen.getByText(/Start Video Chat/i);
    fireEvent.click(startButton);
    
    // Should see searching text
    await waitFor(() => {
        expect(screen.getByText(/Finding a partner/i)).toBeInTheDocument();
    });
  });
});