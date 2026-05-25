import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock(
  "../../../handlers/list-xero-payroll-employee-leave-balances.handler.js",
  () => ({
    listXeroPayrollEmployeeLeaveBalances: vi.fn(),
  }),
);

import ListPayrollEmployeeLeaveBalancesTool from "../list-payroll-employee-leave-balances.tool.js";
import { listXeroPayrollEmployeeLeaveBalances } from "../../../handlers/list-xero-payroll-employee-leave-balances.handler.js";

const handlerMock = vi.mocked(listXeroPayrollEmployeeLeaveBalances);

async function invokeTool(employeeId = "emp-1") {
  const tool = ListPayrollEmployeeLeaveBalancesTool();
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

describe("list-payroll-employee-leave-balances tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue({
      result: null,
      isError: true,
      error: "Not supported for AU orgs",
    });

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Error listing employee leave balances");
  });

  it("renders all populated balance fields", async () => {
    handlerMock.mockResolvedValue({
      result: [
        {
          leaveTypeID: "lt-1",
          name: "Annual Leave",
          typeOfUnits: "Hours",
          balance: 152,
        },
      ],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Leave Type ID: lt-1");
    expect(body).toContain("Name: Annual Leave");
    expect(body).toContain("Type Of Units: Hours");
    expect(body).toContain("Current Balance: 152");
  });

  it("renders balance of 0 (not omitted by null-filter)", async () => {
    handlerMock.mockResolvedValue({
      result: [{ leaveTypeID: "lt-1", name: "Annual", balance: 0 }],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Current Balance: 0");
  });

  it("renders 'Unknown' / 'Unnamed' fallbacks for missing core fields", async () => {
    handlerMock.mockResolvedValue({
      result: [{}],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Leave Type ID: Unknown");
    expect(body).toContain("Name: Unnamed");
  });

  it("omits typeOfUnits and balance when undefined", async () => {
    handlerMock.mockResolvedValue({
      result: [{ leaveTypeID: "lt-1", name: "Annual" }],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).not.toContain("Type Of Units:");
    expect(body).not.toContain("Current Balance:");
  });
});
