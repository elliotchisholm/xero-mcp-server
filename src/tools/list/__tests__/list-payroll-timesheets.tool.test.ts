import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../../handlers/list-xero-timesheets.handler.js", () => ({
  listXeroPayrollTimesheets: vi.fn(),
}));

import ListPayrollTimesheetsTool from "../list-payroll-timesheets.tool.js";
import { listXeroPayrollTimesheets } from "../../../handlers/list-xero-timesheets.handler.js";

const handlerMock = vi.mocked(listXeroPayrollTimesheets);

// Handler typed return uses Date and StatusEnum; tests render via `timesheet: any`
// in the tool, so we cast fixtures to the resolved type to skip strict subtyping.
type HandlerResult = Awaited<ReturnType<typeof listXeroPayrollTimesheets>>;
const asResult = (r: unknown) => r as HandlerResult;

async function invokeTool() {
  const tool = ListPayrollTimesheetsTool();
  return tool.handler({}, {} as never);
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

describe("list-payroll-timesheets tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: null,
      isError: true,
      error: "Region not supported",
    }));

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Error listing timesheets");
    expect(body).toContain("Region not supported");
  });

  it("renders all timesheet fields", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [
        {
          timesheetID: "ts-1",
          employeeID: "emp-1",
          startDate: "2024-01-01",
          endDate: "2024-01-07",
          status: "Approved",
          totalHours: 40,
          updatedDateUTC: "2024-01-08",
        },
      ],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Timesheet ID: ts-1");
    expect(body).toContain("Status: Approved");
    expect(body).toContain("Total Hours: 40");
  });

  it("renders Total Hours: 0 (not 'N/A') when explicitly zero", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [
        {
          timesheetID: "ts-1",
          employeeID: "emp-1",
          startDate: "2024-01-01",
          endDate: "2024-01-07",
          status: "Draft",
          totalHours: 0,
          updatedDateUTC: "2024-01-08",
        },
      ],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Total Hours: 0");
    expect(body).not.toContain("Total Hours: N/A");
  });

  it("renders 'N/A' when totalHours is undefined", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [
        {
          timesheetID: "ts-1",
          employeeID: "emp-1",
          startDate: "2024-01-01",
          endDate: "2024-01-07",
          status: "Draft",
          updatedDateUTC: "2024-01-08",
        },
      ],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Total Hours: N/A");
  });

  it("renders 'Found 0 timesheets:' when result is empty", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Found 0 timesheets:");
  });
});
