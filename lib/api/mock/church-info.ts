import type { ChurchInfoApi } from "@/lib/api/client";
import { loadStore, mockDelay, nowIso, saveStore } from "@/lib/api/mock-utils";
import { mockChurchInfo } from "@/lib/mock-data/church-info";
import type { ChurchInfo } from "@/types/entities";

const STORE_KEY = "churchInfo";
// Singleton stored as a one-element array to reuse the generic store helpers.
let record: ChurchInfo = loadStore(STORE_KEY, [mockChurchInfo])[0];
const persist = () => saveStore(STORE_KEY, [record]);

export const churchInfoResource: ChurchInfoApi = {
  async get() {
    await mockDelay();
    return record;
  },

  async update(values) {
    await mockDelay();
    record = { ...record, ...values, updatedAt: nowIso() };
    persist();
    return record;
  },
};
