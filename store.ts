import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppStatus, ChatMessage, ChatState } from './types';

const initialState: ChatState = {
  status: AppStatus.IDLE,
  messages: [],
  partnerIsTyping: false,
  onlineCount: Math.floor(Math.random() * (45000 - 15000) + 15000), // Simulated online count
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<AppStatus>) => {
      state.status = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.partnerIsTyping = action.payload;
    },
    updateOnlineCount: (state) => {
      // Simulate fluctuation
      const change = Math.floor(Math.random() * 100) - 50;
      state.onlineCount += change;
    }
  },
});

export const { setStatus, addMessage, clearMessages, setTyping, updateOnlineCount } = chatSlice.actions;

export const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;