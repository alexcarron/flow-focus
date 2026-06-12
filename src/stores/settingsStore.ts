import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS } from '../model/AppSettings';
import TimeWindow from '../model/time-management/TimeWindow';
import { db } from '../db/flowfocus.db';
import { tasksManager } from './tasksStore';

const SETTINGS_ID = 1;

interface SettingsState extends AppSettings {
  isLoaded: boolean;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  setMorningTime: (value: string) => Promise<void>;
  setNightTime: (value: string) => Promise<void>;
  setBedtime: (value: string) => Promise<void>;
  setWakeTime: (value: string) => Promise<void>;
  importSettings: (settings: AppSettings) => Promise<void>;
}

function pickSettings(state: SettingsState): AppSettings {
  return {
    morningTime: state.morningTime,
    nightTime: state.nightTime,
    bedtime: state.bedtime,
    wakeTime: state.wakeTime,
  };
}

async function persistSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ id: SETTINGS_ID, ...settings });
}

function applySleepWindow(settings: AppSettings): void {
  tasksManager.setAsleepTimeWindow(new TimeWindow(settings.bedtime, settings.wakeTime));
}

export const useSettingsStore = create<SettingsState & SettingsActions>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  async loadSettings() {
    const row = await db.settings.get(SETTINGS_ID);
    const settings = row ?? DEFAULT_SETTINGS;
    set({ ...settings, isLoaded: true });
    applySleepWindow(settings);
    if (!row) await persistSettings(DEFAULT_SETTINGS);
  },

  async setMorningTime(value: string) {
    set({ morningTime: value });
    await persistSettings({ ...pickSettings(get()), morningTime: value });
  },

  async setNightTime(value: string) {
    set({ nightTime: value });
    await persistSettings({ ...pickSettings(get()), nightTime: value });
  },

  async setBedtime(value: string) {
    set({ bedtime: value });
    const settings = { ...pickSettings(get()), bedtime: value };
    await persistSettings(settings);
    applySleepWindow(settings);
  },

  async setWakeTime(value: string) {
    set({ wakeTime: value });
    const settings = { ...pickSettings(get()), wakeTime: value };
    await persistSettings(settings);
    applySleepWindow(settings);
  },

  async importSettings(settings: AppSettings) {
    set({ ...settings });
    await persistSettings(settings);
    applySleepWindow(settings);
  },
}));
