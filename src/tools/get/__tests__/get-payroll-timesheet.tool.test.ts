import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../../handlers/get-xero-payroll-timesheet.handler.js", () => ({
  getXeroPayrollTimesheet: vi.fn(),
}));

import GetPayrollTimesheetTool from "../get-payroll-timesheet.tool.js";
import { getXeroPayrollTimesheet } from "../../../handlers/get-xero-payroll-timesheet.handler.js";

const handlerMock = vi.mocked(getXeroPayrollTimesheet);

type HandlerResult = Awaited<ReturnType<typeof getXeroPayrollTimesheet>>;
const asResult = (r: unknown) => r as HandlerResult;

async function invokeTool(timesheetID = "ts-1") {
  const tool = GetPayrollTimesheetTool();
  return tool.handler({ timesheetID }, {} as never);
}

function bodyTextOf(
  result: Awaited<ReturnType<typeof invokeTool>>,
  index: number,
): string {
  const item = result.content[index];
  if (item.type !== "text") throw new Error("expected text content");
  return item.text;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("get-payroll-timesheet tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: null,
      isError: true,
      error: "Not found",
    }));

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Error retrieving timesheet");
    expect(body).toContain("Not found");
  });

  it("renders 'No timesheet found' when handler returns null result", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: null,
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool("missing-id"), 0);

    expect(body).toContain("No timesheet found with ID: missing-id");
  });

  it("renders timesheet as JSON when found", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: {
        timesheetID: "ts-1",
        employeeID: "emp-1",
        status: "Approved",
        totalHours: 40,
      },
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 0);
    const parsed = JSON.parse(body);

    expect(parsed.timesheetID).toBe("ts-1");
    expect(parsed.status).toBe("Approved");
    expect(parsed.totalHours).toBe(40);
  });
});
