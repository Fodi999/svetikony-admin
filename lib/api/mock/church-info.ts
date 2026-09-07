import type { ChurchInfoApi } from "@/lib/api/client";
import { loadStore, mockDelay, nowIso, saveStore } from "@/lib/api/mock-utils";
import { mockChurchInfo } from "@/lib/mock-data/church-info";
import type { ChurchInfoFormValues } from "@/lib/validation/church-info.schema";
import type { ChurchInfo, ChurchInfoTranslation, Language } from "@/types/entities";

const STORE_KEY = "churchInfo";
// Singleton stored as a one-element array to reuse the generic store helpers.
let record: ChurchInfo = loadStore(STORE_KEY, [mockChurchInfo])[0];
const persist = () => saveStore(STORE_KEY, [record]);

/** ChurchInfoFormValues' fields are all optional (matching the real
 * backend's own total permissiveness -- see the schema's doc comment);
 * ChurchInfo's are all real strings. Same '' fallback the real
 * putChurchInfo() applies to an omitted field, kept here so mock mode
 * mirrors real-mode semantics rather than accidentally being more lenient
 * (e.g. by leaving `undefined` sitting in the record). */
function toTranslation(values: ChurchInfoFormValues["translations"][Language]): ChurchInfoTranslation {
  return {
    title: values.title ?? "",
    description: values.description ?? "",
    schedule: values.schedule ?? "",
    dedication: values.dedication ?? "",
    shrines: values.shrines ?? "",
    priest: values.priest ?? "",
  };
}

export const churchInfoResource: ChurchInfoApi = {
  async get() {
    await mockDelay();
    return record;
  },

  async update(values) {
    await mockDelay();
    record = {
      ...record,
      address: values.address ?? "",
      mapsUrl: values.mapsUrl ?? "",
      phoneOrSite: values.phoneOrSite ?? "",
      priestPhone: values.priestPhone ?? "",
      imageUrl: values.imageUrl ?? "",
      status: values.status,
      translations: {
        uk: toTranslation(values.translations.uk),
        ru: toTranslation(values.translations.ru),
        en: toTranslation(values.translations.en),
      },
      updatedAt: nowIso(),
    };
    persist();
    return record;
  },
};
