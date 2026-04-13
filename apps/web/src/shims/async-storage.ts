type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const AsyncStorage: AsyncStorageLike = {
  async getItem() {
    return null;
  },
  async setItem() {},
  async removeItem() {},
};

export default AsyncStorage;
export const getItem = AsyncStorage.getItem;
export const setItem = AsyncStorage.setItem;
export const removeItem = AsyncStorage.removeItem;
