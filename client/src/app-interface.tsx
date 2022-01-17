import { format } from "prettier";

export enum STATE {
  init = "init",
  nothing = "nothing",
  clearing = "clearing",
  updateAvailable = "updateAvailable",
  downloading = "downloading",
  unpacking = "unpacking",
}

export class SettingsData {
  offline: boolean | null;
  autoUpdates: boolean | null;
  currentVersion: String | null;
  currentDate: string | null;

  constructor() {
    this.offline = false;
    this.autoUpdates = false;
    this.currentVersion = null;
    this.currentDate = null;
  }
}

export interface UpdateStatus {
  progress: Number;
  state: STATE;
  currentVersion: String | null;
  currentDate: string | null;
}

interface External {
  setTitle: (title: String) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  settings: () => Promise<void>;
}
declare global {
  interface Window {
    Android: External;
  }
}

export class MDNWorker {
  controller: ServiceWorker | null;
  constructor() {
    this.controller = navigator.serviceWorker.controller;
  }
  signIn() {}
  signOut() {}
  update() {}
  async updateAvailable() {
    const update = await (
      await fetch("https://updates.developer.allizom.org/update.json")
    ).json();
  }
  updateUser() {}
  updateStatus() {
    return {
      state: STATE.nothing,
      progress: 0,
      currentVersion: null,
      currentDate: null,
    };
  }
  clear() {}
  offlineSettings() {
    return (
      JSON.parse(window.localStorage.getItem("MDNSettings") || "null") ??
      new SettingsData()
    );
  }
  setOfflineSettings(settingsData: SettingsData) {
    const current = this.offlineSettings();
    const settings = Object.fromEntries(
      Object.entries(settingsData).filter(([, v]) => v !== null)
    );

    window.localStorage.setItem(
      "MDNSettings",
      JSON.stringify({ ...current, ...settings })
    );
    return settingsData;
  }
  setTitle(title) {}
}

declare global {
  interface Window {
    MDNWorker: MDNWorker;
  }
}

window.MDNWorker = new MDNWorker();
