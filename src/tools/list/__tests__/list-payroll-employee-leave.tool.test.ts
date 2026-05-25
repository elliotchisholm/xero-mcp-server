import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock(
  "../../../handlers/list-xero-payroll-employee-leave.handler.js",
  () => ({
    listXeroPayrollEmployeeLeave: vi.fn(),
  }),
);

import ListPayrollEmployeeLeaveTool from "../list-payroll-employee-leave.tool.js";
import { listXeroPayrollEmployeeLeave } from "../../../handlers/list-xero-payroll-employee-leave.handler.js";

const handlerMock = vi.mocked(listXeroPayrollEmployeeLeave);

type HandlerResult = Awaited<ReturnType<typeof listXeroPayrollEmployeeLeave>>;
const asResult = (r: unknown) => r as HandlerResult;

async function invokeTool(employeeId = "emp-1") {
  const tool = ListPayrollEmployeeLeaveTool();
  return tool.handler({ employeeId }, {} as never);
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

describe("list-payroll-employee-leave tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: null,
      isError: true,
      error: "Not supported for AU orgs",
    }));

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Error listing employee leave");
    expect(body).toContain("Not supported for AU orgs");
  });

  it("renders all populated leave fields", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [
        {
          leaveID: "lv-1",
          leaveTypeID: "lt-1",
          description: "Annual leave",
          startDate: "2024-12-23",
          endDate: "2024-12-27",
          periods: [{}, {}],
          updatedDateUTC: "2024-12-01",
        },
      ],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Leave ID: lv-1");
    expect(body).toContain("Leave Type: lt-1");
    expect(body).toContain("Description: Annual leave");
    expect(body).toContain("Periods: 2");
    expect(body).toContain("Start Date: 2024-12-23");
  });

  it("renders 'Unknown' / 'No description' fallbacks for missing core fields", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [{}],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Leave ID: Unknown");
    expect(body).toContain("Leave Type: Unknown");
    expect(body).toContain("Description: No description");
  });

  it("omits optional fields when undefined", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [{ leaveID: "lv-1", leaveTypeID: "lt-1", description: "X" }],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).not.toContain("Start Date:");
    expect(body).not.toContain("End Date:");
    expect(body).not.toContain("Periods:");
    expect(body).not.toContain("Last Updated:");
  });
});
