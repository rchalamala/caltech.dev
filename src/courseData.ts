import DATA_FA2023 from "./data/IndexedTotalFA2022-23.json";
import DATA_WI2023 from "./data/IndexedTotalWI2022-23.json";
import DATA_SP2023 from "./data/IndexedTotalSP2022-23.json";
import DATA_FA2024 from "./data/IndexedTotalFA2023-24.json";
import DATA_WI2024 from "./data/IndexedTotalWI2023-24.json";
import DATA_SP2024 from "./data/IndexedTotalSP2023-24.json";
import DATA_FA2025 from "./data/IndexedTotalFA2024-25.json";
import DATA_WI2025 from "./data/IndexedTotalWI2024-25.json";
import DATA_SP2025 from "./data/IndexedTotalSP2024-25.json";
import DATA_FA2026 from "./data/IndexedTotalFA2025-26.json";
import DATA_WI2026 from "./data/IndexedTotalWI2025-26.json";
import DATA_SP2026 from "./data/IndexedTotalSP2025-26.json";
import DATA_FA2027 from "./data/IndexedTotalFA2026-27.json";

export const CURRENT_TERM = "/fa2027";

export const courseDataSources: {
  [key: string]: { [key: string]: CourseData };
} = {
  "/fa2023": DATA_FA2023,
  "/wi2023": DATA_WI2023,
  "/sp2023": DATA_SP2023,
  "/fa2024": DATA_FA2024,
  "/wi2024": DATA_WI2024,
  "/sp2024": DATA_SP2024,
  "/fa2025": DATA_FA2025,
  "/wi2025": DATA_WI2025,
  "/sp2025": DATA_SP2025,
  "/fa2026": DATA_FA2026,
  "/wi2026": DATA_WI2026,
  "/sp2026": DATA_SP2026,
  "/fa2027": DATA_FA2027,
};
