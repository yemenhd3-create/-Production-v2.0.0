import { describe, expect, it } from "vitest";
import {
  API_REQUEST_BODY_LIMIT,
  API_REQUEST_BODY_LIMIT_BYTES,
  MAX_IMAGE_DATA_URL_CHARS,
} from "./_core/requestLimits";

describe("حدود طلبات API", () => {
  it("تسمح بأكبر صورة مسموح بها ولا تفتح سقفاً عاماً مبالغاً فيه", () => {
    expect(API_REQUEST_BODY_LIMIT).toBe("13mb");
    expect(API_REQUEST_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_IMAGE_DATA_URL_CHARS);
    expect(API_REQUEST_BODY_LIMIT_BYTES).toBeLessThan(50 * 1024 * 1024);
  });
});
